import type { IncomingHttpHeaders } from "node:http";
export interface ExplainRequestBody {
  fen: string;
  level: "beginner" | "intermediate" | "advanced" | "expert" | "gm";
  question?: string;
  model?: string;
  engineSummary?: string;
  includePrompt?: boolean;
  caseType?:
    | "position"
    | "move"
    | "move_scored"
    | "move_scored_delta"
    | "compare";
  move?: string;
  score?: number;
  delta?: number;
  compareMove?: string;
  compareScore?: number;
  compareDelta?: number;
}
export declare function processExplain(
  body: ExplainRequestBody,
  headers: IncomingHttpHeaders,
): Promise<{
  answer: string;
  prompt?: string;
  cached: boolean;
}>;
export declare function health(): {
  ok: boolean;
};
