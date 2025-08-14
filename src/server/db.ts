// Intentionally left generic; no domain-specific code here.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  initSchemaFish,
  upsertServerLine,
  getServerLineByPosition,
  getRandomServerLines,
} from "./db-lines.js";
import type { CoachMessage, CoachMessageKey } from "./db-coach.js";
import {
  initSchemaCoach,
  upsertCoachMessage,
  getCoachMessage,
} from "./db-coach.js";
import { ServerLine } from "./types.js";

// Lightweight DB executor abstraction to keep this module dependency-free.
// This file intentionally contains only generic DB types, not domain logic.
export type SqlValue = string | number | null;
export function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}
export function intToBool(value: number): boolean {
  return value ? true : false;
}
export interface DBExecutor {
  run: (
    sql: string,
    params?: ReadonlyArray<SqlValue>,
  ) => Promise<{ lastID?: number; changes?: number }>;
  get: <T>(
    sql: string,
    params?: ReadonlyArray<SqlValue>,
  ) => Promise<T | undefined>;
  all: <T>(sql: string, params?: ReadonlyArray<SqlValue>) => Promise<T[]>;
}

// Factory to create a very small sqlite3-backed DBExecutor using the system sqlite3 CLI.
// This is a pragmatic choice to keep runtime deps at zero.
// NOTE: For production you would replace this with a proper sqlite3 driver.
export function createSQLiteCliExecutor(dbPath: string): DBExecutor {
  function runCommand(args: string[], input?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        "sqlite3",
        ["-batch", dbPath, ...args],
        { encoding: "utf8" },
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || err.message));
            return;
          }
          resolve(stdout || "");
        },
      );
      if (input) {
        child.stdin?.write(input);
        child.stdin?.end();
      }
    });
  }

  async function run(sql: string, params: ReadonlyArray<SqlValue> = []) {
    const stmt = bindParams(sql, params);
    await runCommand([], stmt);
    return { changes: undefined, lastID: undefined };
  }

  async function all<T>(sql: string, params: ReadonlyArray<SqlValue> = []) {
    const stmt = `.mode json\n` + bindParams(sql, params) + `\n`;
    const out = await runCommand([], stmt);
    try {
      // When using `.mode json` select returns a JSON object per invocation, not ideal; keep simple:
      // Expect a single JSON array in output when selecting rows.
      const jsonStart = out.indexOf("[");
      const jsonEnd = out.lastIndexOf("]");
      if (jsonStart >= 0 && jsonEnd >= jsonStart) {
        const payload = out.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(payload) as T[];
      }
      return [] as T[];
    } catch (e) {
      console.warn("[db] Failed to parse sqlite3 json output:", e);
      return [] as T[];
    }
  }

  async function get<T>(sql: string, params: ReadonlyArray<SqlValue> = []) {
    const rows = await all<T>(sql, params);
    return rows[0];
  }

  const exec: DBExecutor = { run, all, get };
  return exec;
}

function bindParams(sql: string, params: ReadonlyArray<SqlValue>): string {
  // Naive param binding for tests only; it quotes strings and leaves numbers/nulls.
  let i = 0;
  return sql.replace(/\?/g, () => {
    const val = params[i++];
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "number") return String(val);
    // Escape single quotes for sqlite
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

// Default executor singleton and init
const DATA_DIR = path.join(process.cwd(), "data");
const DEFAULT_DB_FILE =
  process.env.APP_DB_FILE || path.join(DATA_DIR, "app.sqlite3");
let defaultExec: DBExecutor | null = null;
let schemaInitialized = false;

async function ensureInit(): Promise<DBExecutor> {
  if (!defaultExec) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    defaultExec = createSQLiteCliExecutor(DEFAULT_DB_FILE);
  }
  if (!schemaInitialized) {
    await initSchemaFish(defaultExec);
    await initSchemaCoach(defaultExec);
    schemaInitialized = true;
  }
  return defaultExec;
}

// High-level API: Lines (ServerLine persistence)
export async function writeLine(body: {
  sessionId: string;
  line: ServerLine;
}): Promise<{ ok: true; id: number }> {
  const exec = await ensureInit();
  const id = await upsertServerLine(exec, body.sessionId, body.line);
  return { ok: true, id };
}

export async function readLinesByPosition(
  position: string,
  searchLineCount: number,
  maxDepth: number,
): Promise<ServerLine[]> {
  const exec = await ensureInit();
  const one = await getServerLineByPosition(
    exec,
    position,
    searchLineCount,
    maxDepth,
  );
  return one ? [one] : [];
}

export async function readLineByPosition(
  position: string,
  searchLineCount: number,
  maxDepth: number,
): Promise<ServerLine | null> {
  const exec = await ensureInit();
  return getServerLineByPosition(exec, position, searchLineCount, maxDepth);
}

// High-level API: Coach
export async function writeCoachMessage(
  msg: CoachMessage,
): Promise<{ ok: true }> {
  const exec = await ensureInit();
  await upsertCoachMessage(exec, msg);
  return { ok: true };
}

export async function readCoachMessage(
  key: CoachMessageKey,
): Promise<CoachMessage | null> {
  const exec = await ensureInit();
  return getCoachMessage(exec, key);
}

export async function readRandomLines(limit: number): Promise<ServerLine[]> {
  const exec = await ensureInit();
  const n = Number(limit) > 0 ? Math.floor(Number(limit)) : 10;
  return getRandomServerLines(exec, n);
}

// Danger admin: truncate sqlite database by deleting and reinitializing the file
export async function truncateDatabase(): Promise<{ ok: true }> {
  console.log("TRUNCATING DB");
  const dataDir = path.join(process.cwd(), "data");
  const dbFile = process.env.APP_DB_FILE || path.join(dataDir, "app.sqlite3");
  try {
    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
      console.log("OK DONE HAVE A NICE DAY");
    } else {
      console.log("db file not found anyways");
    }
  } catch (e) {
    console.warn("[db] Failed to remove DB file:", e);
  }
  // Reset singletons so next call re-creates schema
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  defaultExec = null;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  schemaInitialized = false;
  await ensureInit();
  return { ok: true };
}

// No JSON fallback. We only support sqlite3 via CLI in this environment.
