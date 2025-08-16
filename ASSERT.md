# ASSERT / Backtracking Debugging Notes (Temporary)

This document is a compressed, high‑signal brain dump of the current debugging/backtracking strategy around assertions, server cache, Stockfish PV handling, and UI formatting. Use this to understand what the system is doing, what to look for in logs, and how to interpret and react quickly.

## Goal

- Never crash or stall due to stale server cache results.
- On first sign of invalid/corrupt data (parse/validation failures), backtrack and force a fresh Stockfish analysis before bailing.
- Only assert (and stop fishing) on invalid fresh engine results.
- Keep UI/formatting logic from triggering assertions.

## Key Concepts

### Origins: cache vs fresh

- Each `getTopLines(nowFEN, ...)` result is tagged with an origin:
  - `"cache"`: returned by `/api/line` server GET
  - `"fresh"`: returned by local Stockfish via `analyzePosition`
- Mapping is held per FEN in memory (`lastTopLinesOrigin[fen]`).

### Cache validation (quiet)

- When `getTopLines` returns cache:
  - We parse and validate each returned move against `nowFEN` using `analyzeMove` (NO asserts).
  - If any move is invalid/unparseable, we log a concise warning (includes FEN and move), then RECOMPUTE FRESH immediately (or set a short cache-bypass window).
  - Only cache results that pass validation are allowed downstream.

### Cache bypass window

- `disableServerCacheFor(ms)` creates a short window where `getTopLines` skips server GET and goes straight to Stockfish. This is activated when:
  - An assertion was deferred because origin was `cache`.
  - A parse failure (`move-parse-failed`) fired.
- The intention is: first problem -> skip cache -> get fresh -> only then assert if still invalid.

### Fisher step backtracking

- After we obtain initiator/responder move lists:
  - If origin is `cache` and any returned move fails validation for the current FEN, we log:
    - `Backtracking: cached [initiator|responder] moves invalid; recomputing fresh { position }`
  - We then call `getTopLines(..., { forceFresh: true })` immediately and use the fresh result.

### Engine PV (info line) guardrails

- For each Stockfish `info` PV message:
  - First PV move side-to-move must match FEN; if not, drop the info line.
  - Normalize castling for validation (e.g., `e1g1` => special castling with `rookFrom/rookTo`).
  - Validate each PV move non‑throwingly with `analyzeMove` and advance a local FEN.
  - If any PV move is invalid, we log once:
    - `stockfish-info: dropping PV due to invalid move {fen, moveStr, index, error}`
  - We DO NOT assert or add partial PV results.

### UI / formatting safety

- All UI and formatting move applications call `applyMoveToFEN(..., { assert: false })`.
- Validation in formatting paths is silent (for logs only); no assertions.
- `computeSanGameFromPCN` is wrapped in try/catch; logs and continues on failure.

## Event hooks

- `assertion-failed` (global):
  - Logged as: `Hard-stop: stopping fishing due to assertion-failed {detail}`
  - Fishing is stopped immediately (`isFishing=false`).
- `move-parse-failed` (global):
  - Logged as: `Backtrack: move parse failed; disabling server cache for fresh recompute { move, fen }`
  - Cache bypass window is enabled. Fishing is NOT stopped here so next step can ask Stockfish.

## Temporary log (JSONL)

- We keep a compact JSONL log in localStorage (`bcl_tmp_log`) to persist critical breadcrumbs across reloads:
  - Use `appendTmpLog(event, context)`.
  - Use `getTmpLog()` to dump the log; `clearTmpLog()` to reset.
  - Example entries:
    - `{ t: iso, e: "hard-stop-assert", c: { ...assert detail... } }`
    - `{ t: iso, e: "parse-failed", c: { move, fen } }`

## What to look for in console logs

- Cache pulled:
  - `getTopLines(): Retrieved cached results for <FEN> ...` followed by either:
    - OK path: returns to caller.
    - Backtrack path: `Cached move invalid for FEN; invalidating cache`, then `getTopLines(): Server had no lines, manually computing them`.
- PV drops:
  - `stockfish-info: dropping PV due to invalid move { fen, moveStr, index, error }` (not fatal; we skip that info line).
- Parse failures:
  - `[parseMove] Failed to parse move: <move> from FEN: <fen>` and the backtrack log `Backtrack: move parse failed; ...`.
- Hard stop:
  - `Hard-stop: stopping fishing due to assertion-failed {detail}` OR
  - `Hard-stop: [initiator|responder] step failed; stopping fishing`.

## Why you might still see warnings

- Stockfish sometimes emits PV lines containing moves that are not legal in the _current_ position (e.g., castling assumptions). These are now dropped (not asserted). Warnings are kept for diagnostic value but can be throttled later.

## Controls and toggles

- Assertions:
  - `window.__ASSERTS_ENABLED = false` or `setAssertionsEnabled(false)` (global toggle)
- Cache bypass:
  - `disableServerCacheFor(ms)` (programmatic)
- Temp log:
  - `appendTmpLog(event, context)`, `getTmpLog()`, `clearTmpLog()`

## Runbook

- If you see a parse failure (`move-parse-failed`) after cache retrieval:
  - Expect a backtrack log and a fresh getTopLines on the next step.
- If you see a hard-stop assertion:
  - It indicates invalid fresh results or a critical mismatch. Re‑run Fish2; cache will be bypassed for a short window.
- If warnings are noisy but harmless (PV drops), we can throttle or dedupe logs without changing behavior.

## Known edge cases

- Castling normalization: PV `e1g1` is normalized for validation. It still drops if castling is truly illegal in the position (e.g., rights or blockers).
- En passant and promotion corner-cases: PV validation rejects impossible special moves; these are dropped without assertion.

## Next improvements

- Throttle repeated PV-drop warnings (e.g., 1 per second).
- Extend cache-bypass window or force immediate fresh recompute in the same tick if we detect parse failures mid‑step.
- Emit a compact summary to the temp log on step transitions (origin, fen, responderCount), to make post‑mortem analysis even easier.
