import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const env = {
  ...process.env,
  CHROME_PATH: process.env.CHROME_PATH || chromium.executablePath(),
};

const result = spawnSync('lhci', ['autorun'], {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
