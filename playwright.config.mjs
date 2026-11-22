import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';

// Keep local and CI browser runs quiet when the host injects conflicting color
// settings. Node warns whenever NO_COLOR is present alongside FORCE_COLOR.
delete process.env.NO_COLOR;
process.env.FORCE_COLOR = '0';
process.env.no_proxy = 'localhost,127.0.0.1,::1' + (process.env.no_proxy ? `,${process.env.no_proxy}` : '');
process.env.NO_PROXY = process.env.no_proxy;

const isCI = Boolean(process.env.CI);
// Reserve most host cores during local runs so Chromium workers do not freeze the desktop.
const defaultLocalWorkers = Math.max(1, Math.min(2, Math.floor(os.cpus().length / 4)));
const envWorkers = Number(process.env.PLAYWRIGHT_WORKERS);
const workers = isCI
  ? 2
  : Number.isInteger(envWorkers) && envWorkers > 0
    ? Math.min(envWorkers, defaultLocalWorkers)
    : defaultLocalWorkers;

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['json', { outputFile: 'reports/playwright-results.json' }],
  ],
  use: {
    actionTimeout: 10_000,
    baseURL: 'http://127.0.0.1:4321',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node tools/run-test-server.mjs',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    url: 'http://127.0.0.1:4321/',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /e2e\/.*\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile-chrome',
      testMatch: /e2e\/.*\.spec\.mjs/,
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'ux',
      testMatch: /ux\/.*\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.mjs/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
