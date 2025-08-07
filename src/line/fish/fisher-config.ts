import type { LineFisherConfig } from "./types.js";

export function defaultConfig(): LineFisherConfig {
  return {
    initiatorMoves: [],
    responderMoveCounts: [],
    maxDepth: 1,
    threads: 1,
    defaultResponderCount: 1,
    targetDepth: 1,
    rootFEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    baselineScore: 0,
    baselineMoves: [],
    initiatorIsWhite: true,
  };
}
