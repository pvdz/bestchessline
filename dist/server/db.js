// Intentionally left generic; no domain-specific code here.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { initSchemaFish, upsertFishSession, insertOrReplaceFishLine, getFishLinesBySession, getFishLinesByPosition, } from "./db-lines.js";
import { getRandomFishLines } from "./db-lines.js";
import { initSchemaCoach, upsertCoachMessage, getCoachMessage, } from "./db-coach.js";
export function boolToInt(value) {
    return value ? 1 : 0;
}
export function intToBool(value) {
    return value ? true : false;
}
// Factory to create a very small sqlite3-backed DBExecutor using the system sqlite3 CLI.
// This is a pragmatic choice to keep runtime deps at zero.
// NOTE: For production you would replace this with a proper sqlite3 driver.
export function createSQLiteCliExecutor(dbPath) {
    function runCommand(args, input) {
        return new Promise((resolve, reject) => {
            const child = execFile("sqlite3", ["-batch", dbPath, ...args], { encoding: "utf8" }, (err, stdout, stderr) => {
                if (err) {
                    reject(new Error(stderr || err.message));
                    return;
                }
                resolve(stdout || "");
            });
            if (input) {
                child.stdin?.write(input);
                child.stdin?.end();
            }
        });
    }
    async function run(sql, params = []) {
        const stmt = bindParams(sql, params);
        await runCommand([], stmt);
        return { changes: undefined, lastID: undefined };
    }
    async function all(sql, params = []) {
        const stmt = `.mode json\n` + bindParams(sql, params) + `\n`;
        const out = await runCommand([], stmt);
        try {
            // When using `.mode json` select returns a JSON object per invocation, not ideal; keep simple:
            // Expect a single JSON array in output when selecting rows.
            const jsonStart = out.indexOf("[");
            const jsonEnd = out.lastIndexOf("]");
            if (jsonStart >= 0 && jsonEnd >= jsonStart) {
                const payload = out.slice(jsonStart, jsonEnd + 1);
                return JSON.parse(payload);
            }
            return [];
        }
        catch (e) {
            console.warn("[db] Failed to parse sqlite3 json output:", e);
            return [];
        }
    }
    async function get(sql, params = []) {
        const rows = await all(sql, params);
        return rows[0];
    }
    const exec = { run, all, get };
    return exec;
}
function bindParams(sql, params) {
    // Naive param binding for tests only; it quotes strings and leaves numbers/nulls.
    let i = 0;
    return sql.replace(/\?/g, () => {
        const val = params[i++];
        if (val === null || val === undefined)
            return "NULL";
        if (typeof val === "number")
            return String(val);
        // Escape single quotes for sqlite
        return `'${String(val).replace(/'/g, "''")}'`;
    });
}
// Default executor singleton and init
const DATA_DIR = path.join(process.cwd(), "data");
const DEFAULT_DB_FILE = process.env.APP_DB_FILE || path.join(DATA_DIR, "app.sqlite3");
let defaultExec = null;
let schemaInitialized = false;
async function ensureInit() {
    if (!defaultExec) {
        if (!fs.existsSync(DATA_DIR))
            fs.mkdirSync(DATA_DIR, { recursive: true });
        defaultExec = createSQLiteCliExecutor(DEFAULT_DB_FILE);
    }
    if (!schemaInitialized) {
        await initSchemaFish(defaultExec);
        await initSchemaCoach(defaultExec);
        schemaInitialized = true;
    }
    return defaultExec;
}
// High-level API: Lines
export async function writeLine(body) {
    const exec = await ensureInit();
    const sessionId = body.sessionId;
    const rootFEN = body.rootFEN;
    const config = body.config || {};
    const line = body.line;
    await upsertFishSession(exec, sessionId, rootFEN, config, Date.now());
    const id = await insertOrReplaceFishLine(exec, sessionId, line.lineIndex, {
        lineIndex: line.lineIndex,
        pcns: Array.isArray(line.pcns) ? line.pcns : [],
        sanGame: typeof line.sanGame === "string" ? line.sanGame : undefined,
        score: typeof line.score === "number" ? line.score : 0,
        position: String(line.position || rootFEN),
        isDone: !!line.isDone,
        isFull: !!line.isFull,
        isMate: !!line.isMate,
        isStalemate: !!line.isStalemate,
        isTransposition: !!line.isTransposition,
        transpositionTarget: typeof line.transpositionTarget === "string"
            ? line.transpositionTarget
            : undefined,
        best5Replies: Array.isArray(line.best5Replies) ? line.best5Replies : [],
        best5Alts: Array.isArray(line.best5Alts) ? line.best5Alts : [],
    });
    return { ok: true, id };
}
export async function readLines(sessionId) {
    const exec = await ensureInit();
    return getFishLinesBySession(exec, sessionId);
}
export async function readLinesByPosition(position) {
    const exec = await ensureInit();
    return getFishLinesByPosition(exec, position);
}
// High-level API: Coach
export async function writeCoachMessage(msg) {
    const exec = await ensureInit();
    await upsertCoachMessage(exec, msg);
    return { ok: true };
}
export async function readCoachMessage(key) {
    const exec = await ensureInit();
    return getCoachMessage(exec, key);
}
export async function readRandomLines(limit) {
    const exec = await ensureInit();
    const n = Number(limit) > 0 ? Math.floor(Number(limit)) : 10;
    return getRandomFishLines(exec, n);
}
// No JSON fallback. We only support sqlite3 via CLI in this environment.
//# sourceMappingURL=db.js.map