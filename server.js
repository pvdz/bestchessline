// Vanilla Node.js dev server (no build step required)
// - Serves static files from project root
// - Entry points: '/' -> 'src/line/line.html', '/practice' -> 'src/practice/practice.html'
// - AI endpoints delegate to built module at 'dist/server/ai-explain.js' if available

const http = require("node:http");
const { parse } = require("node:url");
const fs = require("node:fs");
const path = require("node:path");

const { parseFEN } = require("./dist/utils/fen-utils.js");
const { convertFenToCacheFileName } = require("./dist/server/ai-explain.js");
const { health } = require("./dist/server/health.js");
const {
  readLineByPosition,
  writeLine,
  truncateDatabase,
} = require("./dist/server/db.js");

const argv = process.argv.slice(2);
const DISABLE_SAB = argv.includes("--no-shared-array-buffer");
const DEFAULT_PORT = 9876;
const PORT = Number(
  argv.find((a) => /^\d+$/.test(a)) || process.env.PORT || DEFAULT_PORT,
);
const CACHE_DIR = path.join(process.cwd(), "prompt_cache");

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  // [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  // [".svg", "image/svg+xml"],
  [".wasm", "application/wasm"],
]);

function setSABHeaders(res) {
  if (DISABLE_SAB) return;
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
}

function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

function safeJoin(root, p) {
  const full = path.join(root, p);
  const norm = path.normalize(full);
  if (!norm.startsWith(root)) return null;
  return norm;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME.get(ext) || "application/octet-stream";
  res.setHeader("Content-Type", type);
  // Allow WASM to be cross-origin loaded (for COEP); we serve assets from same origin so it's fine
  if (ext === ".wasm") {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
  setSABHeaders(res);
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    res.statusCode = 404;
    res.end("Not Found");
  });
  stream.pipe(res);
}

function handleStatic(req, res, pathname) {
  const cwd = process.cwd();
  let filePath;

  if (pathname === "/" || pathname === "/index.html") {
    // Redirect root to /line
    res.statusCode = 302;
    res.setHeader("Location", "/line");
    res.end("Redirecting to /line");
    return;
  }

  if (pathname === "/line") {
    // Ensure trailing slash so relative assets resolve under /line/
    res.statusCode = 302;
    res.setHeader("Location", "/line/");
    res.end("Redirecting to /line/");
    return;
  }
  if (pathname === "/line/") {
    filePath = safeJoin(cwd, "src/line/line.html");
    if (!filePath || !fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
    sendFile(res, filePath);
    return;
  }
  if (pathname.startsWith("/line/")) {
    const tail = pathname.slice("/line/".length);
    filePath = safeJoin(cwd, path.join("src/line", tail));
    if (
      filePath &&
      fs.existsSync(filePath) &&
      !fs.statSync(filePath).isDirectory()
    ) {
      sendFile(res, filePath);
      return;
    }
  }

  if (pathname === "/practice") {
    res.statusCode = 302;
    res.setHeader("Location", "/practice/");
    res.end("Redirecting to /practice/");
    return;
  }
  if (pathname === "/practice/") {
    filePath = safeJoin(cwd, "src/practice/practice.html");
    if (!filePath || !fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
    sendFile(res, filePath);
    return;
  }
  if (pathname.startsWith("/practice/")) {
    const tail = pathname.slice("/practice/".length);
    filePath = safeJoin(cwd, path.join("src/practice", tail));
    if (
      filePath &&
      fs.existsSync(filePath) &&
      !fs.statSync(filePath).isDirectory()
    ) {
      sendFile(res, filePath);
      return;
    }
  }

  // If /dist is requested as an entrypoint, serve its index-like files
  if (pathname === "/dist" || pathname === "/dist/") {
    const distIndex = safeJoin(cwd, "dist/line/main.js");
    if (distIndex && fs.existsSync(distIndex)) {
      sendFile(res, distIndex);
      return;
    }
  }

  // Allow absolute /src/* and /dist/* paths to map to project files
  const rel = pathname.replace(/^\//, "");
  filePath = safeJoin(cwd, rel);
  if (
    !filePath ||
    !fs.existsSync(filePath) ||
    fs.statSync(filePath).isDirectory()
  ) {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }
  sendFile(res, filePath);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function handleHealth(_req, res) {
  try {
    sendJson(res, 200, health());
  } catch (e) {
    sendJson(res, 500, {
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
}

async function handleExplainPut(req, res) {
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || "{}");
    const { fen, move, compare, payload } = body || {};

    if (!payload) {
      console.log("400: handleExplainPut missing payload");
      sendJson(res, 400, { ok: false, error: "Missing payload" });
      return;
    }

    const key = generateCacheKeyOrSendError(res, fen, move, compare, payload);
    if (!key) return;

    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    const cacheFile = path.join(CACHE_DIR, `${key}.txt`);
    fs.writeFileSync(cacheFile, body.payload, "utf8");
    sendJson(res, 200, { ok: true, key });
  } catch (e) {
    console.log("500: handleExplainPut failed:", e);
    sendJson(res, 500, {
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
}

async function handleExplainGet(req, res) {
  try {
    const { fen, move, compare, payload } = req.query;

    const key = generateCacheKeyOrSendError(res, fen, move, compare, payload);
    if (!key) return;

    const cacheFile = path.join(CACHE_DIR, `${key}.txt`);
    if (fs.existsSync(cacheFile)) {
      sendJson(res, 200, {
        ok: true,
        file: fs.readFileSync(cacheFile, "utf8"),
      });
      return;
    }

    if (req.headers["x-ai-api-key"]) {
      // Fetch from OpenAI
      console.log("404: no cache, remote not implemented");
      sendJson(res, 404, {
        ok: false,
        body: "Not cached. Remote LLM fetch not yet implemented",
      });
      return;
    }

    console.log("404: no cache, no api key");
    sendJson(res, 404, { ok: false, error: "Not cached. No API key." });
  } catch (e) {
    console.log("500: handleExplainGet failed:", e);
    sendJson(res, 500, {
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
}

async function handleLineGet(req, res) {
  try {
    const url = parse(req.url || "", true);
    const { fen, searchLineCount, maxDepth } = url.query || {};

    if (!fen) {
      sendJson(res, 400, { error: "Missing fen" });
      return;
    }

    try {
      parseFEN(String(fen));
    } catch (_e) {
      sendJson(res, 400, { error: "Invalid FEN" });
      return;
    }

    const row = await readLineByPosition(fen, searchLineCount, maxDepth);
    if (!row) {
      sendJson(res, 200, { ok: false, data: null });
      return;
    }

    const n = Number.isFinite(Number(searchLineCount))
      ? Math.max(1, Math.floor(Number(searchLineCount)))
      : 5;
    const best = Array.isArray(row.bestMoves) ? row.bestMoves : [];
    if (!best.length) {
      sendJson(res, 200, { ok: false, data: null });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      data: { ...row, bestMoves: best.slice(0, n) },
    });
  } catch (e) {
    console.log("500: handleLineGet failed:", e);
    sendJson(res, 500, {
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
}

async function handleLinePut(req, res) {
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw || "{}");
    const rootFEN = body && body.root;
    const moves = (body && body.moves) || null;
    const position = body && body.position;
    const best = body && (body.bestMoves || body.best);
    const searchLineCount = body && body.searchLineCount;
    const maxDepth = body && body.maxDepth;

    if (!position || !best || !searchLineCount || !maxDepth) {
      sendJson(res, 400, {
        ok: false,
        error: "Missing position, best/bestMoves, searchLineCount, or maxDepth",
      });
      return;
    }

    try {
      parseFEN(String(position));
    } catch (_e) {
      sendJson(res, 400, { ok: false, error: "Invalid FEN" });
      return;
    }

    // Store under a stable session/key; we query by position later
    await writeLine({
      sessionId: `server-cache:${String(position)}:${searchLineCount}:${maxDepth}`,
      line: {
        root: String(rootFEN || position),
        moves: Array.isArray(moves) ? moves.map(String) : [],
        position: String(position),
        bestMoves: best,
        searchLineCount: Number(searchLineCount),
        maxDepth: Number(maxDepth),
      },
    });

    sendJson(res, 200, { ok: true, data: "update written" });
  } catch (e) {
    console.log("500: handleLinePut failed:", e);
    sendJson(res, 500, {
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
}

async function handleTrunc(_req, res) {
  try {
    await truncateDatabase();
    sendJson(res, 200, { ok: true, data: "truncated" });
  } catch (e) {
    console.log("500: handleTrunc failed:", e);
    sendJson(res, 500, {
      ok: false,
      error: e && e.message ? e.message : String(e),
    });
  }
}

function generateCacheKeyOrSendError(res, fen, move, compare) {
  if (!fen) {
    console.log("400: generateCacheKeyOrSendError missing fen", [
      fen,
      move,
      compare,
    ]);
    sendJson(res, 400, { ok: false, error: "Missing fen" });
    return;
  }
  try {
    // parseFEN will throw on invalid formats
    parseFEN(fen);
  } catch (e) {
    console.log("400: generateCacheKeyOrSendError invalid fen", [
      fen,
      move,
      compare,
    ]);
    sendJson(res, 400, { ok: false, error: "Invalid FEN" });
    return;
  }

  if (move && !/^[a-h][1-8][a-h][1-8]$/.test(move)) {
    console.log("400: generateCacheKeyOrSendError invalid move", [
      fen,
      move,
      compare,
    ]);
    sendJson(res, 400, {
      ok: false,
      error: "Invalid long best move, expecting two square ids",
    });
    return;
  }

  if (compare && !/^[a-h][1-8][a-h][1-8]$/.test(compare)) {
    console.log("400: generateCacheKeyOrSendError invalid compare", [
      fen,
      move,
      compare,
    ]);
    sendJson(res, 400, {
      ok: false,
      error: "Invalid long compare move, expecting two square ids",
    });
    return;
  }

  const fenKey = convertFenToCacheFileName(fen);
  let key;
  if (!move && !compare) {
    key = `${fenKey}__position`;
  } else if (!compare) {
    key = `${fenKey}__best_${move}`;
  } else if (move && !compare) {
    key = `${fenKey}__best_${move}_vs_${compare}`;
  } else {
    console.log("400: generateCacheKeyOrSendError invalid compare", [
      fen,
      move,
      compare,
    ]);
    sendJson(res, 400, {
      ok: false,
      error: "If a compare move is given then a best move must be given",
    });
    return;
  }

  // If it matches this regex then it must be safe...?
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    console.log("500: generateCacheKeyOrSendError invalid key unexpected", [
      fen,
      move,
      compare,
    ]);
    sendJson(res, 500, {
      ok: false,
      error: "Validation should have led to valid cache key but it didn't",
    });
    return;
  }

  return key;
}

const server = http.createServer(async (req, res) => {
  const url = parse(req.url || "", true);

  if (req.method === "GET" && url.pathname === "/api/health") {
    await handleHealth(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/explain") {
    await handleExplainGet(req, res);
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/explain") {
    await handleExplainPut(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/line") {
    console.log("handleLineGet()");
    await handleLineGet(req, res);
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/line") {
    console.log("handleLinePut()");
    await handleLinePut(req, res);
    return;
  }

  // Mark cached lines as bad so server can drop/review them
  if (req.method === "POST" && url.pathname === "/api/line/mark-bad") {
    console.log("handleLineMarkBad()");
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}");
      const position = body && body.position;
      const searchLineCount = body && body.searchLineCount;
      const maxDepth = body && body.maxDepth;
      if (!position || !searchLineCount || !maxDepth) {
        sendJson(res, 400, { ok: false, error: "Missing position, searchLineCount, or maxDepth" });
        return;
      }
      console.log("[server] mark-bad:", position, searchLineCount, maxDepth);
      // Best-effort: drop cached line by upserting an empty bestMoves array
      try {
        await writeLine({
          sessionId: `server-cache:${String(position)}:${searchLineCount}:${maxDepth}:mark-bad`,
          line: {
            root: String(position),
            moves: [],
            position: String(position),
            bestMoves: [],
            searchLineCount: Number(searchLineCount),
            maxDepth: Number(maxDepth),
          },
        });
      } catch (e) {
        console.log("[server] mark-bad write failed:", e);
      }
      sendJson(res, 200, { ok: true });
    } catch (e) {
      console.log("crash:", e);
      sendJson(res, 500, {
        ok: false,
        error: e && e.message ? e.message : String(e),
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/trunc") {
    await handleTrunc(req, res);
    return;
  }

  handleStatic(req, res, url.pathname || "/");
});

server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  if (!DISABLE_SAB)
    console.log("[server] COOP/COEP enabled for SharedArrayBuffer");
});
