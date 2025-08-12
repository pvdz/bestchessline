import { GameState } from "./practice-types.js";
export type AiCoachLevel = "beginner" | "intermediate" | "advanced" | "expert" | "gm";
export interface AiCoachConfig {
    apiBaseUrl: string;
    apiKey: string;
    model: string;
    level: AiCoachLevel;
    maxLines?: number;
    depth?: number;
    temperature?: number;
}
export interface AiCoachRequestOptions {
    question?: string;
}
export declare function explainCurrentPositionWithAI(gameState: GameState, cfg: AiCoachConfig, opts?: AiCoachRequestOptions): Promise<string>;
