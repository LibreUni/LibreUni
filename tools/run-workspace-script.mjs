import { spawnSync } from 'node:child_process';

const script = process.argv[2];

if (!script) {
  console.error('Usage: node tools/run-workspace-script.mjs <script>');
  process.exit(1);
}

const app = process.env.APP ?? 'main';
const workspace = `@libreuni/${app}`;

const result = spawnSync(
  'npm',
  ['run', script, '--workspace', workspace],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
