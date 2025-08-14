import type { DBExecutor } from "./db.js";
import type { ServerLine } from "./types.js";

// Create a simple table to store server-returned lines keyed by position
export async function initSchemaFish(exec: DBExecutor): Promise<void> {
  await exec.run(
    `CREATE TABLE IF NOT EXISTS server_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      root_fen TEXT NOT NULL,
      moves_json TEXT,
      position TEXT NOT NULL,
      best_moves_json TEXT NOT NULL,
      search_line_count INTEGER NOT NULL,
      max_depth INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(position)
    )`,
  );
  await exec.run(
    `CREATE INDEX IF NOT EXISTS idx_server_lines_position ON server_lines(position)`,
  );
  await exec.run(
    `CREATE INDEX IF NOT EXISTS idx_search_line_count ON server_lines(search_line_count)`,
  );
  await exec.run(
    `CREATE INDEX IF NOT EXISTS idx_max_depth ON server_lines(max_depth)`,
  );
}

export async function upsertServerLine(
  exec: DBExecutor,
  sessionId: string,
  line: ServerLine,
): Promise<number> {
  const now = Date.now();
  const res = await exec.run(
    `INSERT INTO server_lines (
       session_id, root_fen, moves_json, position, best_moves_json,
       search_line_count, max_depth, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(position) DO UPDATE SET
       session_id=excluded.session_id,
       root_fen=excluded.root_fen,
       moves_json=excluded.moves_json,
       best_moves_json=excluded.best_moves_json,
       search_line_count=excluded.search_line_count,
       max_depth=excluded.max_depth,
       updated_at=excluded.updated_at`,
    [
      sessionId,
      line.root,
      JSON.stringify(line.moves || []),
      line.position,
      JSON.stringify(line.bestMoves || []),
      line.searchLineCount,
      line.maxDepth,
      now,
      now,
    ],
  );
  return typeof res.lastID === "number" ? res.lastID : -1;
}

export async function getServerLineByPosition(
  exec: DBExecutor,
  position: string,
  searchLineCount: number,
  maxDepth: number,
): Promise<ServerLine | null> {
  const row = await exec.get<{
    session_id: string;
    root_fen: string;
    moves_json: string | null;
    position: string;
    best_moves_json: string;
    search_line_count: number;
    max_depth: number;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT * FROM server_lines WHERE position=? AND search_line_count=? AND max_depth=?`,
    [position, searchLineCount, maxDepth],
  );
  if (!row) {
    return null;
  }
  return mapRowToServerLine(row);
}

export async function getRandomServerLines(
  exec: DBExecutor,
  limit: number,
): Promise<ServerLine[]> {
  const rows = await exec.all<{
    session_id: string;
    root_fen: string;
    moves_json: string | null;
    position: string;
    best_moves_json: string;
    search_line_count: number;
    max_depth: number;
    created_at: number;
    updated_at: number;
  }>(`SELECT * FROM server_lines ORDER BY RANDOM() LIMIT ?`, [limit]);
  return rows.map(mapRowToServerLine);
}

function mapRowToServerLine(row: {
  session_id: string;
  root_fen: string;
  moves_json: string | null;
  position: string;
  best_moves_json: string;
  search_line_count: number;
  max_depth: number;
  created_at: number;
  updated_at: number;
}): ServerLine {
  let moves: string[] = [];
  let bestMoves: unknown = [];
  try {
    moves = row.moves_json ? (JSON.parse(row.moves_json) as string[]) : [];
  } catch (e) {
    console.log("Error parsing moves_json", row);
    console.log("->", e);
    moves = [];
  }
  try {
    bestMoves = JSON.parse(row.best_moves_json);
  } catch (e) {
    console.log("Error parsing best_moves_json", row);
    console.log("->", e);
    bestMoves = [];
  }
  return {
    root: row.root_fen,
    moves,
    position: row.position,
    bestMoves: bestMoves as ServerLine["bestMoves"],
    searchLineCount: row.search_line_count,
    maxDepth: row.max_depth,
  };
}
