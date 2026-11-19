import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAYGROUNDS_DIR = path.join(ROOT, 'src/components/playgrounds');

async function loadPlaygroundComponent(filePath) {
  const result = await esbuild.build({
    entryPoints: [filePath],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
  });
  const code = result.outputFiles[0].text;
  const mod = { exports: {} };
  const localRequire = createRequire(filePath);
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
  fn(mod.exports, localRequire, mod, filePath, path.dirname(filePath));
  return mod.exports.default;
}

const playgroundFiles = fs
  .readdirSync(PLAYGROUNDS_DIR)
  .filter((f) => f.endsWith('.tsx') && f !== 'plot.tsx')
  .sort()
  .map((f) => path.join(PLAYGROUNDS_DIR, f));

test('playground TSX components bundle and SSR-render cleanly without markup or SVG bugs', async () => {
  assert.ok(playgroundFiles.length >= 26, `Expected >=26 playground TSX components, found ${playgroundFiles.length}`);

  for (const filePath of playgroundFiles) {
    const rel = path.relative(ROOT, filePath);
    const Component = await loadPlaygroundComponent(filePath);
    assert.equal(typeof Component, 'function', `${rel} should default-export a React component`);

    const html = renderToStaticMarkup(React.createElement(Component));
    assert.ok(
      html.includes('interactive-playground'),
      `${rel} must render <InteractivePlayground> wrapper`
    );

    // Strip <code>...</code> tags and check no raw markdown backticks leaked into prose
    const withoutCode = html.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
    assert.ok(
      !/`[^`<]+`/.test(withoutCode),
      `${rel} rendered literal Markdown backticks outside <code>: ${withoutCode.match(/`[^`<]+`/)?.[0]}`
    );

    // Verify every rendered SVG <text> defines fill= (never falls back to black in dark mode)
    for (const m of html.matchAll(/<text\b([^>]*)>/g)) {
      assert.ok(/\bfill=/.test(m[1]), `${rel} rendered SVG <text> without fill attribute: ${m[0]}`);
    }
  }
});

test('DynamicArrayPlayground SSR static preview reports accurate copy count rather than capacity - 1', async () => {
  const DynamicArrayPlayground = await loadPlaygroundComponent(
    path.join(PLAYGROUNDS_DIR, 'DynamicArrayPlayground.tsx')
  );
  const html = renderToStaticMarkup(React.createElement(DynamicArrayPlayground));
  // Initial staticContent in DynamicArrayPlayground shows 4 values in capacity 8 -> copies from 4->8 = 4, not 7
  assert.ok(
    !html.includes('copies so far = 7'),
    `DynamicArrayPlayground static preview computes buggy "copies so far = 7" (capacity - 1 formula): ${html}`
  );
});

test('BTreePlayground separator count invariant holds across every step', () => {
  const src = fs.readFileSync(path.join(PLAYGROUNDS_DIR, 'BTreePlayground.tsx'), 'utf8');
  const statesMatch = src.match(/const\s+states\s*=\s*(\[[\s\S]*?\]);/);
  assert.ok(statesMatch, 'Expected states array in BTreePlayground.tsx');
  const states = Function(`return ${statesMatch[1]}`)();

  const parseKeys = (node) =>
    node
      .replace(/^\[|\]$/g, '')
      .split(/[|,]/)
      .map((s) => Number(s.trim()));

  for (const [idx, stepNodes] of states.entries()) {
    const [root, ...leaves] = stepNodes;
    const rootKeys = parseKeys(root);
    assert.equal(
      leaves.length,
      rootKeys.length + 1,
      `BTreePlayground step ${idx} has ${rootKeys.length} root key(s) (${root}) which requires ${rootKeys.length + 1} child leaf slots, not ${leaves.length}`
    );
    const leafKeySet = new Set(leaves.flatMap(parseKeys));
    for (const rk of rootKeys) {
      assert.ok(
        !leafKeySet.has(rk),
        `BTreePlayground step ${idx} duplicates promoted B-tree separator ${rk} inside a leaf node`
      );
    }
  }
});
