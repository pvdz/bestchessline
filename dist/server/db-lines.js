import { boolToInt, intToBool } from "./db.js";
export async function initSchemaFish(exec) {
    await exec.run(`CREATE TABLE IF NOT EXISTS fish_sessions (
      session_id TEXT PRIMARY KEY,
      root_fen TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);
    await exec.run(`CREATE TABLE IF NOT EXISTS fish_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      line_index INTEGER NOT NULL,
      pcns_json TEXT NOT NULL,
      san_game TEXT,
      score INTEGER NOT NULL,
      position TEXT NOT NULL,
      is_done INTEGER NOT NULL,
      is_full INTEGER NOT NULL,
      is_mate INTEGER NOT NULL,
      is_stalemate INTEGER NOT NULL,
      is_transposition INTEGER NOT NULL,
      transposition_target TEXT,
      best5_replies_json TEXT NOT NULL,
      best5_alts_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(session_id, line_index),
      FOREIGN KEY(session_id) REFERENCES fish_sessions(session_id) ON DELETE CASCADE
    )`);
    await exec.run(`CREATE INDEX IF NOT EXISTS idx_fish_lines_session ON fish_lines(session_id)`);
    await exec.run(`CREATE INDEX IF NOT EXISTS idx_fish_lines_position ON fish_lines(position)`);
}
export async function upsertFishSession(exec, sessionId, rootFEN, config, createdAt) {
    await exec.run(`INSERT INTO fish_sessions (session_id, root_fen, config_json, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       root_fen=excluded.root_fen,
       config_json=excluded.config_json`, [sessionId, rootFEN, JSON.stringify(config || {}), createdAt]);
}
export async function insertOrReplaceFishLine(exec, sessionId, lineIndex, line) {
    const now = Date.now();
    const res = await exec.run(`INSERT INTO fish_lines (
       session_id, line_index, pcns_json, san_game, score, position,
       is_done, is_full, is_mate, is_stalemate, is_transposition, transposition_target,
       best5_replies_json, best5_alts_json, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id, line_index) DO UPDATE SET
       pcns_json=excluded.pcns_json,
       san_game=excluded.san_game,
       score=excluded.score,
       position=excluded.position,
       is_done=excluded.is_done,
       is_full=excluded.is_full,
       is_mate=excluded.is_mate,
       is_stalemate=excluded.is_stalemate,
       is_transposition=excluded.is_transposition,
       transposition_target=excluded.transposition_target,
       best5_replies_json=excluded.best5_replies_json,
       best5_alts_json=excluded.best5_alts_json,
       updated_at=excluded.updated_at`, [
        sessionId,
        lineIndex,
        JSON.stringify(line.pcns || []),
        line.sanGame ?? null,
        line.score,
        line.position,
        boolToInt(line.isDone),
        boolToInt(line.isFull),
        boolToInt(line.isMate),
        boolToInt(line.isStalemate),
        boolToInt(line.isTransposition),
        line.transpositionTarget ?? null,
        JSON.stringify(line.best5Replies || []),
        JSON.stringify(line.best5Alts || []),
        now,
        now,
    ]);
    return typeof res.lastID === "number" ? res.lastID : -1;
}
export async function getFishLinesBySession(exec, sessionId) {
    const rows = await exec.all(`SELECT * FROM fish_lines WHERE session_id=? ORDER BY line_index ASC`, [
        sessionId,
    ]);
    return rows.map(mapRowToStoredFishLine);
}
export async function getRandomFishLines(exec, limit) {
    const rows = await exec.all(`SELECT * FROM fish_lines ORDER BY RANDOM() LIMIT ?`, [limit]);
    return rows.map(mapRowToStoredFishLine);
}
export async function getFishLinesByPosition(exec, position) {
    const rows = await exec.all(`SELECT * FROM fish_lines WHERE position=? ORDER BY updated_at DESC`, [
        position,
    ]);
    return rows.map(mapRowToStoredFishLine);
}
// bool/int helpers now imported from db.ts
function mapRowToStoredFishLine(row) {
    let pcns = [];
    let best5Replies = [];
    let best5Alts = [];
    try {
        pcns = JSON.parse(row.pcns_json);
    }
    catch (e) {
        console.warn("[db-lines] Failed to parse pcns_json; defaulting to []:", e);
        pcns = [];
    }
    try {
        best5Replies = JSON.parse(row.best5_replies_json);
    }
    catch (e) {
        console.warn("[db-lines] Failed to parse best5_replies_json; defaulting to []:", e);
        best5Replies = [];
    }
    try {
        best5Alts = JSON.parse(row.best5_alts_json);
    }
    catch (e) {
        console.warn("[db-lines] Failed to parse best5_alts_json; defaulting to []:", e);
        best5Alts = [];
    }
    return {
        id: row.id,
        sessionId: row.session_id,
        lineIndex: row.line_index,
        pcns,
        sanGame: row.san_game || undefined,
        score: row.score,
        position: row.position,
        isDone: intToBool(row.is_done),
        isFull: intToBool(row.is_full),
        isMate: intToBool(row.is_mate),
        isStalemate: intToBool(row.is_stalemate),
        isTransposition: intToBool(row.is_transposition),
        transpositionTarget: row.transposition_target || undefined,
        best5Replies,
        best5Alts,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=db-lines.js.map