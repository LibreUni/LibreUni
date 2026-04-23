import fs from 'node:fs';
import path from 'node:path';

const appDir = path.resolve(process.cwd(), process.argv[2] ?? '.');
const srcDir = path.join(appDir, 'src');
const distDir = path.join(appDir, 'dist');

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}

if (!fs.existsSync(srcDir)) {
  console.error(`Static app source directory not found: ${srcDir}`);
  process.exit(1);
}

removeDir(distDir);
copyDir(srcDir, distDir);

console.log(`Built static app from ${srcDir} to ${distDir}`);
