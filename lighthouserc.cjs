const chromeFlags = process.env.CI ? '--no-sandbox --disable-dev-shm-usage' : undefined;

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node tools/serve-test-apps.mjs',
      startServerReadyPattern: 'All LibreUni test apps are ready.',
      url: [
        'http://127.0.0.1:4321/',
        'http://127.0.0.1:4321/lessons/python/intro.html',
        'http://127.0.0.1:4322/',
        'http://127.0.0.1:4323/',
      ],
      numberOfRuns: 1,
      settings: {
        chromeFlags,
        preset: 'desktop',
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      assertions: {
        'button-name': 'error',
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:performance': ['warn', { minScore: 0.65 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'image-alt': 'warn',
        'link-name': 'error',
        'meta-description': 'warn',
      },
    },
    upload: {
      outputDir: 'reports/lighthouse',
      target: 'filesystem',
    },
  },
};
