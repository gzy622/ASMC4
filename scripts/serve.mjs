import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/octet-stream',
};

function getLANIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    if (/loopback|vmware|virtual|hyper-v|bluetooth|tunnel|docker/i.test(name)) continue;
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

const server = http.createServer((req, res) => {
  let filePath = path.join(root, req.url === '/' ? 'index.html' : decodeURIComponent(req.url));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback: serve index.html for unknown routes
        fs.readFile(path.join(root, 'index.html'), (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

const port = parseInt(process.argv[2], 10) || 8000;
const lanIP = getLANIP();

server.listen(port, '0.0.0.0', () => {
  console.log('');
  console.log('  >>>  ASMC4 — Dev Server (Node.js)');
  console.log('');
  console.log(`  Local     http://localhost:${port}/`);
  if (lanIP) {
    console.log(`  LAN       http://${lanIP}:${port}/`);
  }
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
