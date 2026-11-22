import process from 'node:process';

delete process.env.NO_COLOR;
process.env.FORCE_COLOR = '0';

await import('./serve-test-apps.mjs');
