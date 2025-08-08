import http from "node:http";
import { parse } from "node:url";
import { parseFEN, coordsToSquare, toFEN } from "../utils/fen-utils.js";
import fs from "node:fs";
import path from "node:path";
import { parseMove } from "../utils/move-parsing.js";
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "https://api.openai.com";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const memoryCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const CACHE_DIR = path.join(process.cwd(), "prompt_cache");
function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}
function normalizeFenForCache(fen) {
  const pos = parseFEN(fen);
  // Force halfmove clock 0 and fullmove number 1
  const normalized = { ...pos, halfMoveClock: 0, fullMoveNumber: 1 };
  return toFEN(normalized);
}
function cacheFileForFen(fen) {
  const key = Buffer.from(fen).toString("base64url");
  return path.join(CACHE_DIR, `${key}.json`);
}
function readCacheFile(fen) {
  try {
    ensureCacheDir();
    const file = cacheFileForFen(fen);
    if (!fs.existsSync(file)) return null;
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data;
  } catch {
    return null;
  }
}
function writeCacheFile(fen, answer, prompt) {
  try {
    ensureCacheDir();
    const file = cacheFileForFen(fen);
    const data = { answer, prompt, ts: Date.now() };
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}
function levelInstructions(level) {
  switch (level) {
    case "beginner":
      return "Explain like to a beginner (~800 ELO): avoid jargon, focus on basic ideas, simple plans, and common tactics. Give concrete advice.";
    case "intermediate":
      return "Explain to an intermediate (~1200-1600): include core concepts, simple evaluation, and common plans. Mention basic structural ideas.";
    case "advanced":
      return "Explain to an advanced (~1600-2000): discuss pawn structures, typical tactical motifs, strategic plans, key squares, and typical piece maneuvers.";
    case "expert":
      return "Explain to an expert (~2000-2400): use precise chess terms, give concrete variations (short), discuss long-term imbalances and dynamic/positional trade-offs.";
    case "gm":
      return "Explain to a GM-level audience: deep evaluation, critical lines succinctly, highlight evaluation shifts, known theory branches, and subtle nuances.";
  }
}
function renderAsciiBoard(position) {
  const rows = [];
  rows.push("  +------------------------+");
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    const cells = [];
    for (let f = 0; f < 8; f++) {
      const piece = position.board[r][f] || ".";
      cells.push(piece);
    }
    rows.push(`${rank} | ${cells.join(" ")} |`);
  }
  rows.push("  +------------------------+");
  rows.push("    a b c d e f g h");
  return rows.join("\n");
}
function listPieces(position) {
  const white = [];
  const black = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = position.board[r][f];
      if (!piece) continue;
      const square = coordsToSquare(r, f);
      if (piece === piece.toUpperCase()) {
        white.push(`${piece}@${square}`);
      } else {
        black.push(`${piece}@${square}`);
      }
    }
  }
  return `White: ${white.join(", ") || "(none)"}\nBlack: ${black.join(", ") || "(none)"}`;
}
function buildPrompt(body) {
  const pos = parseFEN(body.fen);
  const ascii = renderAsciiBoard(pos);
  const pieces = listPieces(pos);
  const levelText = levelInstructions(body.level);
  const header = `You are a chess coach. ${levelText}`;
  const position = `Current position (FEN): ${body.fen}`;
  const boardText = `ASCII Board:\n${ascii}`;
  const piecesText = `Pieces by side:\n${pieces}`;
  const engineText = body.engineSummary
    ? `Engine context (user-provided, may be truncated):\n${body.engineSummary}`
    : "No engine context provided.";
  // Case-specific section
  let caseSection = "";
  const ct = body.caseType || "position";
  const describeMove = (label, mv, sc, dl) => {
    if (!mv) return `${label}: (none)`;
    const parsed = parseMove(mv, body.fen);
    const legal = parsed ? "(parsed OK)" : "(could not parse)";
    let line = `${label}: ${mv} ${legal}`;
    if (typeof sc === "number") line += `, score: ${(sc / 100).toFixed(2)}`;
    if (typeof dl === "number") line += `, delta: ${(dl / 100).toFixed(2)}`;
    return line;
  };
  if (ct === "move") {
    caseSection = describeMove("Move", body.move);
  } else if (ct === "move_scored") {
    caseSection = describeMove("Move", body.move, body.score);
  } else if (ct === "move_scored_delta") {
    caseSection = describeMove("Move", body.move, body.score, body.delta);
  } else if (ct === "compare") {
    const a = describeMove("Move A", body.move, body.score, body.delta);
    const b = describeMove(
      "Move B",
      body.compareMove,
      body.compareScore,
      body.compareDelta,
    );
    caseSection = `${a}\n${b}\nCompare A vs B: discuss pros/cons, plans, evaluation differences, and when each shines.`;
  } else {
    caseSection = "Position-only request.";
  }
  const guidance =
    "Discuss: opening family if recognizable, typical plans for both sides, pawn structure, tactical motifs, strategic ideas, good vs bad moves, and what to study next. Be concrete and non-hallucinatory; use the FEN, ASCII board, and piece list to anchor facts.";
  const question = body.question?.trim()
    ? `User question: ${body.question.trim()}`
    : "Explain why the top candidate moves are good/bad and what ideas they aim for.";
  return [
    header,
    position,
    boardText,
    piecesText,
    engineText,
    caseSection,
    guidance,
    question,
  ].join("\n\n");
}
async function callAI(prompt, model, apiKeyOverride) {
  const useKey = apiKeyOverride || AI_API_KEY;
  if (!useKey) {
    // Fallback to fake response when no key is available
    return fakeAiResponse(prompt);
  }
  const resp = await fetch(
    `${AI_API_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${useKey}`,
      },
      body: JSON.stringify({
        model: model || AI_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a helpful chess coach and analyst.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    },
  );
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`AI request failed (${resp.status}): ${txt}`);
  }
  const data = await resp.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "No response.";
  return content.trim();
}
function fakeAiResponse(prompt) {
  // Very simple heuristic: detect initial position and a few moves
  if (prompt.includes("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")) {
    if (prompt.includes("Move A:") || prompt.includes("Compare")) {
      // For compare/move cases, return a general comparison
      return `Opening: King’s Pawn / English possibilities. Plans: develop knights to f3/c3, control the center with pawns and pieces, castle early.

On Nf3: Natural development, fights e5/d4, prepares g3/Bg2 or d4. Solid and flexible. Good for many setups (Reti/English transpositions).

If score is around +0.20: Slight edge for White due to easier development and central control; advantage is small and chiefly positional.

Ideas for White: quick development (Nf3, g3, Bg2, 0-0), strike with d4 or c4 depending on Black’s setup. Ideas for Black: contest center with …d5/…e5, develop kingside, and aim for equalization.

What to study: basic Reti/English structures, typical pawn breaks (d4/c4), piece placement, and early tactical motifs like discovered attacks along the long diagonal.`;
    }
    // Position-only initial explanation
    return `This is the starting chess position. Both sides aim to develop pieces, control the center (e4, d4 for White; …e5, …d5 for Black), and castle safely. 

For White, common developing moves include Nf3, Nc3, g3 with Bg2, or the direct e4/d4. For Black, mirror plans apply: …Nf6, …Nc6, …g6 with …Bg7, or a direct …e5/…d5. 

From an opening-family perspective, the game can transpose into countless systems (Open Games, Reti/English, Closed openings). Study fundamental principles and typical pawn structures at your level to reduce mistakes and recognize familiar plans.`;
  }
  // Generic fallback
  return `Position explanation: control key central squares, develop pieces efficiently, and consider king safety. Evaluate candidate moves based on piece activity, pawn structure, and tactical resources. At lower evaluation differences (e.g., ±0.2), plans and accuracy matter more than concrete advantage.`;
}
function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}
export function createPracticeAiServer(port = 8787) {
  const server = http.createServer(async (req, res) => {
    const url = parse(req.url || "", true);
    if (req.method === "POST" && url.pathname === "/api/ai/explain") {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString("utf8");
        const body = JSON.parse(raw);
        const prompt = buildPrompt(body);
        const normFen = normalizeFenForCache(body.fen);
        const key = normFen; // cache key purely by normalized fen
        const now = Date.now();
        const mem = memoryCache.get(key);
        let cached = mem;
        if (!cached) cached = readCacheFile(key) ?? undefined;
        if (cached && now - cached.ts < CACHE_TTL_MS) {
          json(res, 200, {
            answer: cached.answer,
            prompt: body.includePrompt ? cached.prompt : undefined,
            cached: true,
          });
          return;
        }
        const apiKeyOverride = req.headers["x-ai-api-key"];
        const answer = await callAI(
          prompt,
          body.model || AI_MODEL,
          apiKeyOverride,
        );
        memoryCache.set(key, { answer, prompt, ts: now });
        writeCacheFile(key, answer, prompt);
        json(res, 200, {
          answer,
          prompt: body.includePrompt ? prompt : undefined,
          cached: false,
        });
      } catch (e) {
        json(res, 500, { error: e?.message || String(e) });
      }
      return;
    }
    // Health
    if (req.method === "GET" && url.pathname === "/api/ai/health") {
      json(res, 200, { ok: true });
      return;
    }
    res.statusCode = 404;
    res.end("Not Found");
  });
  // Do not start server automatically to honor RULES.md
  return server;
}
//# sourceMappingURL=practice-ai-server.js.map
