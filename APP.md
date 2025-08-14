# Best Chess Line – App Overview

This document is the high‑level mental model for the project. Read it to get productive fast without opening every file.

## What the app does

A browser-based chess toolkit with three complementary workflows:

- Next Best Moves (bestmove panel)
  - Runs Stockfish on the current board position and shows the best lines (mate-aware scores, depths, PVs).
  - Lets you apply a suggested move directly to the game.

- Line Fisher (deep line discovery)
  - Systematically explores a position by alternating between an Initiator move (player) and Responder moves (engine, top‑N).
  - Maintains WIP (queue) and Done lists of lines; each line is a sequence of PCN moves with metadata.
  - Exposes structured per-line metadata for Practice: alts (top‑5 human alternatives, scores) and replies (top‑5 engine replies, move+score).

- Practice (openings trainer)
  - Imports opening lines as SAN/PCN or the structured Fish export/copy format.
  - Trains the user by checking correctness, tracking stats, and showing:
    - Human’s “Scores for top‑5 options” (scores-only chips).
    - Engine “Replies to your last move” (SAN move + score chips) that stay visible across turns.

All workflows share core utilities for FEN, move parsing/formatting, and Stockfish integration.

## Directory map (high level)

- `src/line/`
  - `best/` – bestmove manager, PV formatting, UI config, utilities
  - `fish/` – fisher state/loop, UI, copy/export, structured metadata
  - `board/` – board rendering, navigation, arrows, position controls
  - `main.ts` – analysis page bootstrap and orchestration
- `src/practice/` – practice app (board, parser, UI, game flow)
- `src/utils/` – Stockfish client, FEN/move/notation helpers, DOM/status/buttons/formatting
- `dist/` – built artifacts and Stockfish workers

## Core modules (what to read first)

- Stockfish client: `src/utils/stockfish-client.ts`
  - Web Worker integration (multi-thread when SharedArrayBuffer is available; fallback worker otherwise).
  - UCI lifecycle: `uci` → `isready` → `ucinewgame/position/setoption` → `go/stop`.
  - Streams “info … pv …” updates (depth, score, mate, PV) to a typed callback.
  - Resolves with a typed `AnalysisResult` on `bestmove`.
  - `getCurrentAnalysisSnapshot()` exposes a stable snapshot for tickers.

- Bestmove (Next Best Moves)
  - `src/line/best/bestmove-manager.ts` – start/stop, render best lines, status, PV click‑to‑apply, mate‑aware sort.
  - `src/line/best/bestmove-pv-utils.ts` – PV formatting with effects and click metadata.
  - `src/line/best/bestmove-config.ts` – UI options (depth, threads, MultiPV) and button state.

- Line Fisher
  - State/types: `src/line/fish/types.ts`
  - Orchestration: `src/line/fish/fish.ts`
  - Search loop: `src/line/fish/fishing.ts`
    - Initiator step: choose one move (from predefined or engine); record `alts` (top‑5 human alternatives, scores) by reference.
    - Responder step: compute `best5` once (top‑5 engine replies, move+score) for the line; record `replies` by reference.
  - UI/preview/status: `src/line/fish/fish-ui.ts`
  - Copy/Export: per-line trailing JSON includes `alts` and `replies` for Practice to consume.

## Backend API & caching (current state)

- Endpoints (served by `server.js`)
  - `GET /api/line?fen=<FEN>&searchLineCount=<N>&maxDepth=<D>`
    - Returns a ServerLine object for the given position when cached; otherwise `null`.
    - The server may slice `bestMoves` to at most `searchLineCount` before returning.
  - `PUT /api/line` (body is a ServerLine payload)
    - Upserts a cached line for a position. Used after computing fresh results client‑side.
    - For targeted, single‑move forcing (see below), we currently do not PUT by design.

- Type: ServerLine (`src/server/types.ts`)
  - `{ root: string; moves: string[]; position: string; bestMoves: SimpleMove[]; searchLineCount: number; maxDepth: number }`

- Storage
  - Implemented in `src/server/db-lines.ts` using a single `server_lines` table keyed by `position`.
  - Read/write helpers: `upsertServerLine()`, `getServerLineByPosition()`, `getRandomServerLines()`.

## Fisher behavior updates (current state)

- Depth and termination
  - Lines stop exactly after the requested number of initiator moves. We do not expand a responder branch once the target initiator depth is reached.
  - Safety guard also prevents expansion beyond `maxDepth * 2 + 1` half‑moves.

- Live ticker
  - The fisher’s PV ticker is driven by the Stockfish `onUpdate` stream during analysis in `getTopLines()`.

- Targeted move forcing (predefined move not in top‑N)
  - When a predefined initiator move is not in the top responses, we force Stockfish to analyze the line that starts with that exact long move.
  - Implementation: `getTopLines(..., { targetMove: "e2e4" })` plumbs through to the engine as `MultiPV=1` plus `go searchmoves e2e4`.
  - For now we do not PUT this targeted result to the server (follow‑up task).

- Server usage in fisher
  - On each request for responder moves, fisher first tries `GET /api/line` for cached `bestMoves`.
  - If absent, computes locally and may `PUT` the result (except for targeted move forcing).

- Practice
  - Bootstrap & import: `src/practice/practice.ts`
    - Parses SAN/PCN or Fish JSON; or per‑line copy with `// { … }` metadata.
    - Replays moves from the starting FEN to map metadata to positions:
      - `alts` → previous human FEN (scores chips)
      - `replies` → current engine FEN (move + score chips)
  - Game flow: `src/practice/practice-game.ts`
    - Human turn: shows “Scores for top‑5 options” (scores‑only chips).
    - Computer turn: shows engine “Replies to your last move” (SAN move + score) and keeps it visible when human starts next move.
  - Board/UI: `src/practice/practice-board.ts`, `src/practice/practice.css`, `src/practice/practice-ui.ts`

## Key terms & data shapes

- FEN – Forsyth–Edwards Notation; we index metadata by FEN and step positions via `applyMoveToFEN()`.
- Move notations
  - SAN – e.g., `Nf3`, `O-O` (user facing)
  - PCN – e.g., `Ng1f3` (internal clarity)
  - Long – e.g., `g1f3` (Stockfish and practice mapping)
- `AnalysisMove` – `{ move: ChessMove, score: number, depth: number, pv: ChessMove[], nodes: number, time: number, mateIn: number, multipv?: number }`
- Fisher metadata on a line
  - `best5` – engine replies for responder node (move + score), set once per line
  - `alts` – top‑5 human alternatives (scores) for the last initiator move
  - `replies` – the engine’s top‑5 replies (move + score) to that last human move

## Sorting & scores (shared behavior)

- Scores are normalized to White’s perspective. When Black to move, invert for comparison.
- Comparator `compareAnalysisMoves()` is mate‑aware and supports prioritizing depth or score (bestmove favors mate/depth, fisher top‑5 often favors score per side‑to‑move).

## UI conventions

- Plain TS + HTML + CSS; no frameworks.
- Strong IDs + `getElementByIdOrThrow()` for reliability and greppability.
- Keep UI updates simple and explicit; avoid broad try/catch in UI.

## Constraints & style

- Strict TypeScript; no `any` (use `unknown` sparingly, cast intentionally).
- No classes, no generators, no dynamic imports; small, focused modules.
- Minimal temporary logging; remove after use.

## Quick start reading

- Bestmove: `src/line/best/bestmove-manager.ts`, `src/utils/stockfish-client.ts`
- Fisher: `src/line/fish/fishing.ts`, `src/line/fish/fish.ts`, `src/line/fish/types.ts`
- Practice: `src/practice/practice.ts`, `src/practice/practice-game.ts`
- Utilities: `src/utils/` (Stockfish client, FEN/move parsing, DOM helpers)

IMPORTANT

Always follow RULES.md
