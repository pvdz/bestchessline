// Vanilla Node.js dev server (no build step required)
// - Serves static files from project root
// - Entry points: '/' -> 'src/line/line.html', '/practice' -> 'src/practice/practice.html'
// - AI endpoints delegate to built module at 'dist/server/ai-explain.js' if available

const http = require("node:http");
const { parse, pathToFileURL } = require("node:url");
const fs = require("node:fs");
const path = require("node:path");

const argv = process.argv.slice(2);
const DISABLE_SAB = argv.includes("--no-shared-array-buffer");
const DEFAULT_PORT = 9876;
const PORT = Number(
  argv.find((a) => /^\d+$/.test(a)) || process.env.PORT || DEFAULT_PORT,
);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
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
  setSABHeaders(res);
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

async function handleExplain(req, res) {
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw);

    let ai;
    try {
      // Use dynamic import so we can load ESM output from TypeScript
      const abs = path.join(process.cwd(), "dist/server/ai-explain.js");
      const mod = await import(pathToFileURL(abs).href);
      ai = mod;
    } catch (e) {
      sendJson(res, 503, { error: "AI module not built. Run: npm run build" });
      return;
    }

    const result = await ai.processExplain(body, req.headers);
    sendJson(res, 200, result);
  } catch (e) {
    sendJson(res, 500, { error: e && e.message ? e.message : String(e) });
  }
}

async function handleHealth(_req, res) {
  try {
    let ai;
    try {
      const abs = path.join(process.cwd(), "dist/server/ai-explain.js");
      const mod = await import(pathToFileURL(abs).href);
      ai = mod;
    } catch {
      sendJson(res, 200, { ok: true, built: false });
      return;
    }
    const h = ai.health();
    sendJson(res, 200, { ...h, built: true });
  } catch (e) {
    sendJson(res, 500, { error: e && e.message ? e.message : String(e) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = parse(req.url || "", true);

  if (req.method === "POST" && url.pathname === "/api/ai/explain") {
    await handleExplain(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/ai/health") {
    await handleHealth(req, res);
    return;
  }

  handleStatic(req, res, url.pathname || "/");
});

server.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  if (!DISABLE_SAB)
    console.log("[server] COOP/COEP enabled for SharedArrayBuffer");
});
