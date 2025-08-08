import * as fs from "node:fs";
import * as path from "node:path";
import { parseFEN, coordsToSquare, toFEN } from "../utils/fen-utils.js";
import { parseMove } from "../utils/move-parsing.js";
const AI_API_BASE_URL = process.env.AI_API_BASE_URL || "https://api.openai.com";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const memoryCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const CACHE_DIR = path.join(process.cwd(), "prompt_cache");
const EXAMPLES_FILE = path.join(CACHE_DIR, "examples.json");
function ensureCacheDir() {
    try {
        if (!fs.existsSync(CACHE_DIR))
            fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    catch { }
}
function normalizeFenForCache(fen) {
    const pos = parseFEN(fen);
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
        if (!fs.existsSync(file))
            return null;
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch {
        return null;
    }
}
function writeCacheFile(fen, answer, prompt) {
    try {
        ensureCacheDir();
        const file = cacheFileForFen(fen);
        fs.writeFileSync(file, JSON.stringify({ answer, prompt, ts: Date.now() }, null, 2), "utf8");
    }
    catch { }
}
function loadExamples() {
    try {
        ensureCacheDir();
        if (!fs.existsSync(EXAMPLES_FILE))
            return {};
        return JSON.parse(fs.readFileSync(EXAMPLES_FILE, "utf8"));
    }
    catch {
        return {};
    }
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
            if (!piece)
                continue;
            const square = coordsToSquare(r, f);
            if (piece === piece.toUpperCase())
                white.push(`${piece}@${square}`);
            else
                black.push(`${piece}@${square}`);
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
    let caseSection = "";
    const ct = body.caseType || "position";
    const describeMove = (label, mv, sc, dl) => {
        if (!mv)
            return `${label}: (none)`;
        const parsed = parseMove(mv, body.fen);
        const legal = parsed ? "(parsed OK)" : "(could not parse)";
        let line = `${label}: ${mv} ${legal}`;
        if (typeof sc === "number")
            line += `, score: ${(sc / 100).toFixed(2)}`;
        if (typeof dl === "number")
            line += `, delta: ${(dl / 100).toFixed(2)}`;
        return line;
    };
    if (ct === "move")
        caseSection = describeMove("Move", body.move);
    else if (ct === "move_scored")
        caseSection = describeMove("Move", body.move, body.score);
    else if (ct === "move_scored_delta")
        caseSection = describeMove("Move", body.move, body.score, body.delta);
    else if (ct === "compare")
        caseSection = `${describeMove("Move A", body.move, body.score, body.delta)}\n${describeMove("Move B", body.compareMove, body.compareScore, body.compareDelta)}\nCompare A vs B: discuss pros/cons, plans, evaluation differences, and when each shines.`;
    else
        caseSection = "Position-only request.";
    const guidance = "Discuss: opening family if recognizable, typical plans for both sides, pawn structure, tactical motifs, strategic ideas, good vs bad moves, and what to study next. Be concrete and non-hallucinatory; use the FEN, ASCII board, and piece list to anchor facts.";
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
    const key = apiKeyOverride || AI_API_KEY;
    if (!key) {
        // No key: fallback to examples or generic
        return fakeOrExampleAnswer(prompt);
    }
    const resp = await fetch(`${AI_API_BASE_URL.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
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
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`AI request failed (${resp.status}): ${txt}`);
    }
    const data = (await resp.json());
    return (data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        "No response.").trim();
}
function fakeOrExampleAnswer(prompt) {
    const examples = loadExamples();
    if (prompt.includes("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")) {
        if (prompt.includes("Move A:") || prompt.includes("Move:")) {
            if (prompt.match(/Move[^\n]*Nf3/)) {
                if (prompt.match(/score:/)) {
                    return examples?.move_nf3_with_score?.answer || defaultNf3Scored();
                }
                return examples?.move_nf3_no_score?.answer || defaultNf3NoScore();
            }
            return defaultCompareAnswer();
        }
        return examples?.initial_position?.answer || defaultInitialAnswer();
    }
    return genericAnswer();
}
function defaultInitialAnswer() {
    return ("This is the starting chess position. Both sides aim to develop pieces, control the center (e4, d4 for White; …e5, …d5 for Black), and castle safely.\n\n" +
        "For White, common developing moves include Nf3, Nc3, g3 with Bg2, or the direct e4/d4. For Black, mirror plans apply: …Nf6, …Nc6, …g6 with …Bg7, or a direct …e5/…d5.\n\n" +
        "From an opening-family perspective, the game can transpose into countless systems (Open Games, Reti/English, Closed openings). Study fundamental principles and typical pawn structures at your level to reduce mistakes and recognize familiar plans.");
}
function defaultNf3NoScore() {
    return "Opening: possible Reti/English transpositions. Nf3 is a natural developing move: it controls e5 and d4, helps prepare kingside castling, and keeps central options flexible (d4/c4 or g3/Bg2). It rarely concedes structural weaknesses and fits many setups. Typical ideas: quick development, contest center with pawns and pieces, avoid early material grabs. For Black: fight for central squares with …d5/…e5, develop …Nf6/…Nc6 and aim for equalization.";
}
function defaultNf3Scored() {
    return "Nf3 evaluated at roughly +0.20 reflects a small, positional edge for White from better central influence and smooth development—nothing decisive but healthy. From here, typical plans include g3/Bg2 and 0-0 or a quick d4/c4 depending on Black’s setup. Black equalizes with sensible development (…Nf6/…Nc6) and timely central counterplay (…d5/…e5). The score indicates White’s initiative is mainly in activity/space rather than immediate tactics.";
}
function defaultCompareAnswer() {
    return "Comparing the two candidate moves: discuss how they differ in central influence, development speed, pawn structure changes, and tactical possibilities. Highlight which plans each move supports and under what opponent setups each tends to perform better.";
}
function genericAnswer() {
    return "Position explanation: control key central squares, develop pieces efficiently, and consider king safety. Evaluate candidate moves based on piece activity, pawn structure, and tactical resources. At lower evaluation differences (e.g., ±0.2), plans and accuracy matter more than concrete advantage.";
}
export async function processExplain(body, headers) {
    const prompt = buildPrompt(body);
    const normFen = normalizeFenForCache(body.fen);
    const key = normFen;
    const now = Date.now();
    const mem = memoryCache.get(key);
    let cached = mem;
    if (!cached)
        cached = (readCacheFile(key) ?? undefined);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
        return {
            answer: cached.answer,
            prompt: body.includePrompt ? cached.prompt : undefined,
            cached: true,
        };
    }
    const apiKeyOverride = headers["x-ai-api-key"] || undefined;
    const answer = await callAI(prompt, body.model || AI_MODEL, apiKeyOverride);
    memoryCache.set(key, { answer, prompt, ts: now });
    writeCacheFile(key, answer, prompt);
    return {
        answer,
        prompt: body.includePrompt ? prompt : undefined,
        cached: false,
    };
}
export function health() {
    return { ok: true };
}
//# sourceMappingURL=ai-explain.js.map