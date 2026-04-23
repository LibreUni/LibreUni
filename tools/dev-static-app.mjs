import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const rootArg = process.argv[2] ?? '.';
const port = Number(process.argv[3] ?? '4322');
const rootDir = path.resolve(process.cwd(), rootArg === '.' ? 'src' : rootArg);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function resolvePath(urlPath) {
  const cleanPath = urlPath.split('?')[0];
  const requestedPath = cleanPath === '/' ? '/index.html' : cleanPath;
  let filePath = path.join(rootDir, requestedPath);

  if (!path.extname(filePath)) {
    filePath = `${filePath}.html`;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url ?? '/');

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  response.writeHead(200, {
    'Content-Type': contentTypes[ext] ?? 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Serving ${rootDir} at http://localhost:${port}`);
});
