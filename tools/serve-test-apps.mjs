import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const APPS = [
  { name: 'main', root: 'apps/main/dist', port: Number(process.env.MAIN_PORT ?? 4321) },
];

const CONTENT_TYPES = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolveFile(rootDir, url = '/') {
  const urlPath = decodeURIComponent(url.split('?')[0] ?? '/');
  const candidates = [];

  const requested = path.resolve(rootDir, `.${urlPath === '/' ? '/index.html' : urlPath}`);
  candidates.push(requested);

  if (!path.extname(requested)) {
    candidates.push(`${requested}.html`);
    candidates.push(path.join(requested, 'index.html'));
  }

  for (const candidate of candidates) {
    const isInsideRoot = candidate === rootDir || candidate.startsWith(`${rootDir}${path.sep}`);
    if (!isInsideRoot) {
      return null;
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function createStaticServer({ name, root, port }) {
  const rootDir = path.resolve(process.cwd(), root);

  if (!fs.existsSync(rootDir)) {
    throw new Error(`Build output missing for ${name}: ${rootDir}`);
  }

  const server = http.createServer((request, response) => {
    const filePath = resolveFile(rootDir, request.url);

    if (!filePath) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
    });
    fs.createReadStream(filePath).pipe(response);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving ${name} from ${rootDir} at http://127.0.0.1:${port}`);
  });

  return server;
}

const servers = [];

try {
  for (const app of APPS) {
    servers.push(createStaticServer(app));
  }
  console.log('All LibreUni test apps are ready.');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function closeServers() {
  for (const server of servers) {
    server.close();
  }
}

process.on('SIGINT', () => {
  closeServers();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeServers();
  process.exit(0);
});
