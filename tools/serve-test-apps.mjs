import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
};

function createStaticServer({ name, root, port }) {
  const rootDir = path.resolve(process.cwd(), root);
  if (!fs.existsSync(rootDir)) throw new Error(`Build output missing: ${rootDir}`);

  const server = http.createServer((req, res) => {
    let filePath = path.join(rootDir, req.url === '/' ? '/index.html' : req.url);
    if (!fs.existsSync(filePath) || !filePath.startsWith(rootDir)) filePath = null;
    if (filePath && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
    if (!filePath || !fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  server.listen(port, '127.0.0.1', () => console.log(`Serving ${name} at http://127.0.0.1:${port}`));
  return server;
}

const servers = [];
try {
  servers.push(createStaticServer({ name: 'LibreUni', root: 'dist', port: Number(process.env.MAIN_PORT ?? 4321) }));
} catch (e) { console.error(e.message); process.exit(1); }

process.on('SIGINT', () => { servers.forEach(s => s.close()); process.exit(0); });
process.on('SIGTERM', () => { servers.forEach(s => s.close()); process.exit(0); });
