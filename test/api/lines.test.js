// Test via db.ts DBExecutor API using system sqlite3 through createSQLiteCliExecutor

const fs = require("node:fs");
const path = require("node:path");

const db = require(path.join(process.cwd(), "dist/server/db.js"));

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const dbFile = path.join(dataDir, "test-lines.sqlite3");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

  // Point default DB to our test file and let db.ts initialize schemas
  process.env.APP_DB_FILE = dbFile;

  const sessionId = "s1";
  const rootFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  await db.writeLine({
    sessionId,
    rootFEN,
    config: {},
    line: {
      lineIndex: 0,
      pcns: ["Ng1f3"],
      sanGame: "",
      score: 0,
      position: rootFEN,
      isDone: false,
      isFull: false,
      isMate: false,
      isStalemate: false,
      isTransposition: false,
      transpositionTarget: "",
      best5Replies: [],
      best5Alts: [],
    },
  });

  const rows = await db.readLines(sessionId);
  if (
    !Array.isArray(rows) ||
    rows.length !== 1 ||
    rows[0].pcns[0] !== "Ng1f3"
  ) {
    console.error("rows mismatch:", rows);
    process.exit(1);
  }

  console.log("[lines.test] OK");
}

main().catch((e) => {
  console.error("[lines.test] ERROR", e);
  process.exit(1);
});
