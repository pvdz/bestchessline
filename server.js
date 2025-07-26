const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 9876;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
  '.worker.js': 'application/javascript'
};

const server = http.createServer((req, res) => {
  // Set required headers for SharedArrayBuffer
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  
            let filePath = '.' + req.url;
          if (filePath === './') {
            filePath = './index.html';
          }
          
          // Handle worker file requests at root level
          if (filePath === './stockfish.worker.js') {
            filePath = './dist/stockfish.worker.js';
          }

            const extname = String(path.extname(filePath)).toLowerCase();
          let mimeType = mimeTypes[extname] || 'application/octet-stream';
          
          // Special handling for worker files
          if (filePath.includes('.worker.js')) {
            mimeType = 'application/javascript';
          }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  console.log('Headers set for SharedArrayBuffer support');
}); 