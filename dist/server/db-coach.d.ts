import type { DBExecutor } from "./db.js";
export interface CoachMessageKey {
    fen: string;
    type: "position" | "best" | "compare";
    move?: string;
    compare?: string;
}
export interface CoachMessage extends CoachMessageKey {
    prompt: string;
    response?: string;
    model?: string;
    createdAt: number;
    updatedAt: number;
}
export declare function putCoach(exec: DBExecutor, body: CoachMessage): Promise<{
    ok: true;
}>;
export declare function getCoach(exec: DBExecutor, key: CoachMessageKey): Promise<{
    ok: true;
    message: CoachMessage | null;
}>;
export declare function initSchemaCoach(exec: DBExecutor): Promise<void>;
export declare function upsertCoachMessage(exec: DBExecutor, msg: CoachMessage): Promise<void>;
export declare function getCoachMessage(exec: DBExecutor, key: CoachMessageKey): Promise<CoachMessage | null>;
