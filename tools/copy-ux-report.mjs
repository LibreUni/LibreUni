import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'reports', 'ux');
const destination = path.join(root, 'apps', 'main', 'dist', 'development', 'ux');

try {
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
