import { GameState } from "./practice-types.js";
import {
  analyzePosition,
  initializeStockfish,
} from "../utils/stockfish-client.js";
import type { AnalysisResult } from "../utils/types.js";

export type AiCoachLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "gm";

export interface AiCoachConfig {
  apiBaseUrl: string; // e.g., https://api.openai.com
  apiKey: string; // Bearer token
  model: string; // e.g., gpt-4o-mini
  level: AiCoachLevel;
  maxLines?: number; // MultiPV for Stockfish context
  depth?: number; // Stockfish depth
  temperature?: number;
}

export interface AiCoachRequestOptions {
  question?: string;
}

function levelInstructions(level: AiCoachLevel): string {
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

function buildPrompt(
  fen: string,
  analysis: AnalysisResult | null,
  level: AiCoachLevel,
  userQuestion?: string,
): string {
  const levelText = levelInstructions(level);
  const header = `You are a chess coach. ${levelText}`;
  const position = `Current position (FEN): ${fen}`;

  let sfSummary = "No engine context.";
  if (analysis && analysis.moves.length > 0) {
    const lines = analysis.moves.map((m, i) => {
      const score =
        Math.abs(m.score) >= 10000
          ? m.score > 0
            ? "+Mate"
            : "-Mate"
          : (m.score / 100).toFixed(2);
      const first = `${m.move.piece}${m.move.from}${m.move.to}`;
      const pv = m.pv
        .slice(0, 8)
        .map((mv) => `${mv.piece}${mv.from}${mv.to}`)
        .join(" ");
      return `${i + 1}. ${first} (score ${score}) pv: ${pv}`;
    });
    sfSummary = `Top engine lines (truncated):\n${lines.join("\n")}`;
  }

  const guidance =
    "Discuss: opening family if recognizable, typical plans for both sides, pawn structure, tactical motifs, strategic ideas, good vs bad moves, and what to study next.";

  const question = userQuestion?.trim()
    ? `User question: ${userQuestion.trim()}`
    : "Explain why the top candidate moves are good/bad and what ideas they aim for.";

  return [header, position, sfSummary, guidance, question].join("\n\n");
}

export async function explainCurrentPositionWithAI(
  gameState: GameState,
  cfg: AiCoachConfig,
  opts: AiCoachRequestOptions = {},
): Promise<string> {
  // Prepare engine context
  try {
    initializeStockfish();
  } catch {
    // ignore, stockfish-client is idempotent
  }

  let analysis: AnalysisResult | null = null;
  try {
    analysis = await analyzePosition(gameState.currentFEN, {
      depth: cfg.depth ?? 16,
      multiPV: cfg.maxLines ?? 5,
      threads: 1,
    });
  } catch (e) {
    // Continue without engine context
    analysis = null;
  }

  const prompt = buildPrompt(
    gameState.currentFEN,
    analysis,
    cfg.level,
    opts.question,
  );

  const body = {
    model: cfg.model,
    messages: [
      { role: "system", content: "You are a helpful chess coach and analyst." },
      { role: "user", content: prompt },
    ],
    temperature: cfg.temperature ?? 0.7,
  } as const;

  const resp = await fetch(
    `${cfg.apiBaseUrl.replace(/\/$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`AI request failed (${resp.status}): ${txt}`);
  }

  const data = (await resp.json()) as any;
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "No response.";
  return content.trim();
}
