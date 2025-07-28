const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 9876;

// Parse CLI arguments
const args = process.argv.slice(2);
const disableSharedArrayBuffer =
  args.includes("--no-shared-array-buffer") || args.includes("-n");

if (disableSharedArrayBuffer) {
  console.log("⚠️  SharedArrayBuffer headers disabled - testing fallback mode");
} else {
  console.log("✅ SharedArrayBuffer headers enabled - full performance mode");
}

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".woff": "application/font-woff",
  ".ttf": "application/font-ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "application/font-otf",
  ".wasm": "application/wasm",
  ".worker.js": "application/javascript",
};

const server = http.createServer((req, res) => {
  // Set required headers for SharedArrayBuffer (only if not disabled)
  if (!disableSharedArrayBuffer) {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  }

  // Set cache-busting headers to prevent any caching
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Last-Modified", new Date().toUTCString());
  res.setHeader(
    "ETag",
    `"${Date.now()}-${Math.random().toString(36).substr(2, 9)}"`,
  );

  let filePath = "." + req.url;
  if (filePath === "./") {
    filePath = "./index.html";
  }

  // Handle worker file requests at root level
  if (filePath === "./stockfish.worker.js") {
    filePath = "./dist/stockfish.worker.js";
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  let mimeType = mimeTypes[extname] || "application/octet-stream";

  // Special handling for worker files
  if (filePath.includes(".worker.js")) {
    mimeType = "application/javascript";
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404);
        res.end("File not found");
      } else {
        res.writeHead(500);
        res.end("Server error: " + error.code);
      }
    } else {
      res.writeHead(200, { "Content-Type": mimeType });
      res.end(content, "utf-8");
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);

  if (disableSharedArrayBuffer) {
    console.log("🔧 Testing GitHub Pages compatibility mode");
    console.log("   - SharedArrayBuffer headers disabled");
    console.log("   - Application will use fallback mode");
    console.log("   - Analysis will be single-threaded");
  } else {
    console.log("🚀 Full performance mode");
    console.log("   - SharedArrayBuffer headers enabled");
    console.log("   - Multi-threaded analysis available");
  }

  console.log("");
  console.log("Usage:");
  console.log("  npm run serve                    # Full performance mode");
  console.log(
    "  npm run serve -- --no-shared-array-buffer  # Test fallback mode",
  );
  console.log(
    "  npm run serve -- -n              # Short form for fallback mode",
  );
});
