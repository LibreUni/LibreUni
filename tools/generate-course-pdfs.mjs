import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const coursesRoot = path.join(root, 'courses');
const mimeTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticFiles() {
  return http.createServer(async (request, response) => {
    try {
      const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const filePath = path.resolve(root, `.${requestPath}`);
      if (!filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }

      const stats = await fs.stat(filePath);
      if (!stats.isFile()) throw new Error('Not a file');
      response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] ?? 'application/octet-stream' });
      response.end(await fs.readFile(filePath));
    } catch {
      response.writeHead(404).end('Not found');
    }
  });
}

const sourceFiles = (await fs.readdir(coursesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    courseId: entry.name,
    sourcePath: path.join(coursesRoot, entry.name, 'pdf-source.html'),
    outputPath: path.join(coursesRoot, `${entry.name}.pdf`),
  }));

if (!sourceFiles.length) throw new Error('No PDF source pages were generated.');

const server = serveStaticFiles();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch();

try {
  for (const { courseId, sourcePath, outputPath } of sourceFiles) {
    await fs.access(sourcePath);
    const page = await browser.newPage({ colorScheme: 'light' });
    await page.goto(`http://127.0.0.1:${port}/courses/${courseId}/pdf-source.html`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts?.ready);
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.close();
    await fs.rm(sourcePath);
    console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
