// Test via db.ts DBExecutor API using system sqlite3 through createSQLiteCliExecutor

const fs = require("node:fs");
const path = require("node:path");

const db = require(path.join(process.cwd(), "dist/server/db.js"));

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const dbFile = path.join(dataDir, "test-coach.sqlite3");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

  // Point default DB to our test file and let db.ts initialize schemas
  process.env.APP_DB_FILE = dbFile;

  const key = {
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    type: "position",
  };
  const msg = {
    ...key,
    prompt: "Explain this position",
    response: "Some explanation",
    model: "test-model",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.writeCoachMessage(msg);
  const got = await db.readCoachMessage(key);

  if (!got || got.prompt !== msg.prompt) {
    console.error("coach message mismatch:", got);
    process.exit(1);
  }

  console.log("[coach.test] OK");
}

main().catch((e) => {
  console.error("[coach.test] ERROR", e);
  process.exit(1);
});
