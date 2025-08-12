import type { DBExecutor } from "./db.js";

// Domain-specific schema and helpers for coach messages. No executors here.

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

export async function putCoach(
  exec: DBExecutor,
  body: CoachMessage,
): Promise<{ ok: true }> {
  await upsertCoachMessage(exec, body);
  return { ok: true };
}

export async function getCoach(
  exec: DBExecutor,
  key: CoachMessageKey,
): Promise<{ ok: true; message: CoachMessage | null }> {
  const msg = await getCoachMessage(exec, key);
  return { ok: true, message: msg };
}

// Coach schema and helpers
export async function initSchemaCoach(exec: DBExecutor): Promise<void> {
  await exec.run(
    `CREATE TABLE IF NOT EXISTS coach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fen TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('position','best','compare')),
      move TEXT,
      compare TEXT,
      prompt TEXT NOT NULL,
      response TEXT,
      model TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(fen, type, move, compare)
    )`,
  );
  await exec.run(
    `CREATE INDEX IF NOT EXISTS idx_coach_fen ON coach_messages(fen)`,
  );
}

export async function upsertCoachMessage(
  exec: DBExecutor,
  msg: CoachMessage,
): Promise<void> {
  const now = Date.now();
  const createdAt = msg.createdAt || now;
  const updatedAt = now;
  await exec.run(
    `INSERT INTO coach_messages (fen, type, move, compare, prompt, response, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(fen, type, move, compare) DO UPDATE SET
       prompt=excluded.prompt,
       response=COALESCE(excluded.response, coach_messages.response),
       model=COALESCE(excluded.model, coach_messages.model),
       updated_at=excluded.updated_at`,
    [
      msg.fen,
      msg.type,
      msg.move || null,
      msg.compare || null,
      msg.prompt,
      msg.response ?? null,
      msg.model ?? null,
      createdAt,
      updatedAt,
    ],
  );
}

export async function getCoachMessage(
  exec: DBExecutor,
  key: CoachMessageKey,
): Promise<CoachMessage | null> {
  const row = await exec.get<{
    fen: string;
    type: string;
    move: string | null;
    compare: string | null;
    prompt: string;
    response: string | null;
    model: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT fen, type, move, compare, prompt, response, model, created_at, updated_at
     FROM coach_messages WHERE fen=? AND type=? AND (move IS ? OR move = ?) AND (compare IS ? OR compare = ?)`,
    [
      key.fen,
      key.type,
      key.move ?? null,
      key.move ?? null,
      key.compare ?? null,
      key.compare ?? null,
    ],
  );
  if (!row) return null;
  return {
    fen: row.fen,
    type: row.type as CoachMessageKey["type"],
    move: row.move || undefined,
    compare: row.compare || undefined,
    prompt: row.prompt,
    response: row.response || undefined,
    model: row.model || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
