import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { expect, test } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function buildPlaygroundsHarnessBundle(names) {
  const imports = names
    .map((name, i) => `import Comp${i} from './src/components/playgrounds/${name}.tsx';`)
    .join('\n');
  const mounts = names
    .map(
      (name, i) => `
      {
        const host = document.getElementById('mount-${name}');
        if (host) createRoot(host).render(React.createElement(Comp${i}));
      }`
    )
    .join('\n');

  const entrySource = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    ${imports}
    window.__mountPlaygrounds = () => {
      ${mounts}
    };
    window.__mountPlaygrounds();
  `;

  const result = await esbuild.build({
    stdin: {
      contents: entrySource,
      resolveDir: ROOT,
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'iife',
    jsx: 'automatic',
  });
  return result.outputFiles[0].text;
}

const TARGET_PLAYGROUNDS = [
  'HeapPlayground',
  'LSMCompactionPlayground',
  'HashTablePlayground',
  'DynamicArrayPlayground',
  'UnionFindPlayground',
  'BTreePlayground',
];

test.describe('Interactive playgrounds DOM behavior & page regressions', () => {
  test('mounted playgrounds handle boundary actions, disabled states, and resets cleanly', async ({ page }) => {
    const bundle = await buildPlaygroundsHarnessBundle(TARGET_PLAYGROUNDS);
    await page.goto('/about.html', { waitUntil: 'domcontentloaded' });

    await page.evaluate((names) => {
      const main = document.querySelector('main') || document.body;
      main.innerHTML = names
        .map((n) => `<section data-test-playground="${n}" style="margin:2rem 0"><div id="mount-${n}"></div></section>`)
        .join('');
    }, TARGET_PLAYGROUNDS);

    await page.addScriptTag({ content: bundle });

    // 1. HeapPlayground: delete all 5 elements -> must reach "empty" and disable Delete button
    const heap = page.locator('[data-test-playground="HeapPlayground"]');
    const deleteMinBtn = heap.getByRole('button', { name: 'Delete minimum' });
    await expect(deleteMinBtn).toBeEnabled();
    for (let i = 0; i < 5; i += 1) {
      await deleteMinBtn.click();
    }
    await expect(heap).toContainText('minimum = empty');
    await expect(deleteMinBtn).toBeDisabled();
    await heap.getByRole('button', { name: 'Reset' }).first().click();
    await expect(heap).toContainText('minimum = 3');

    // 2. LSMCompactionPlayground: initial Compact/Flush state, disabled when invalid, Reset supported, no duplicates
    const lsm = page.locator('[data-test-playground="LSMCompactionPlayground"]');
    const flushBtn = lsm.getByRole('button', { name: 'Flush' });
    const compactBtn = lsm.getByRole('button', { name: 'Compact' });
    const writeBtn = lsm.getByRole('button', { name: 'Write' });
    await flushBtn.click();
    await expect(flushBtn).toBeDisabled();
    await writeBtn.click();
    await expect(flushBtn).toBeEnabled();
    await compactBtn.click();
    const lsmResetBtn = lsm.getByRole('button', { name: 'Reset' }).first();
    await expect(lsmResetBtn).toBeVisible();
    await lsmResetBtn.click();
    await expect(lsm).toContainText('2 memory entries');

    // 3. HashTablePlayground: fill 7/7 -> disabled when full; tombstones; Reset resets key sequence back to 10
    const hash = page.locator('[data-test-playground="HashTablePlayground"]');
    const insertBtn = hash.getByRole('button', { name: 'Insert colliding key' });
    for (let i = 0; i < 7; i += 1) {
      await insertBtn.click();
    }
    await expect(hash).toContainText('load = 7/7');
    await expect(insertBtn).toBeDisabled();
    await hash.getByRole('button', { name: 'Reset' }).first().click();
    await expect(hash).toContainText('load = 0/7');
    await expect(insertBtn).toBeEnabled();
    await insertBtn.click();
    await expect(hash.locator('[aria-label^="slot 3,"]')).toContainText('10');

    // 4. DynamicArrayPlayground: starts with 0 copies (not 3!), counts copies on resize, Reset restores
    const dyn = page.locator('[data-test-playground="DynamicArrayPlayground"]');
    await expect(dyn).toContainText('copies so far = 0');
    await dyn.getByRole('button', { name: 'Append value' }).click();
    await dyn.getByRole('button', { name: 'Append value' }).click();
    await expect(dyn).toContainText('copies so far = 4');
    await dyn.getByRole('button', { name: 'Reset' }).first().click();
    await expect(dyn).toContainText('copies so far = 0');

    // 5. UnionFindPlayground: compresses path and exposes Reset button
    const uf = page.locator('[data-test-playground="UnionFindPlayground"]');
    await uf.getByRole('button', { name: 'find(5)' }).click();
    await expect(uf).toContainText('to root 0');
    await uf.getByRole('button', { name: 'Reset' }).first().click();
    await expect(uf).toContainText('Choose a node to compress.');

    // 6. BTreePlayground: advances split step and resets cleanly without leaf duplication
    const btree = page.locator('[data-test-playground="BTreePlayground"]');
    await expect(btree).toContainText('operation 1 of 3');
    await btree.getByRole('button', { name: 'Next split step' }).click();
    await expect(btree).toContainText('operation 2 of 3');
    await btree.getByRole('button', { name: 'Next split step' }).click();
    await expect(btree).toContainText('[10 | 20 | 27]');
    await expect(btree).toContainText('[31]');
    await btree.getByRole('button', { name: 'Reset' }).first().click();
    await expect(btree).toContainText('operation 1 of 3');
  });

  test('/development.html buttons have explicit types and active filters toggle cleanly', async ({ page }) => {
    await page.goto('/development.html', { waitUntil: 'domcontentloaded' });
    const buttonsWithoutType = await page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => !b.getAttribute('type'))
        .map((b) => b.textContent?.trim() || b.id)
    );
    expect(buttonsWithoutType).toEqual([]);

    const highFilter = page.locator('button[data-filter="high"]');
    await highFilter.click();
    await expect(highFilter).toHaveClass(/bg-primary/);
    await expect(highFilter).not.toHaveClass(/hover:bg-light-text/);
  });

  test('Problem.astro toggle updates aria-pressed cleanly without conflicting muted text classes', async ({ page }) => {
    await page.goto('/lessons/calculus-intro/limits-derivatives-problems.html', { waitUntil: 'networkidle' });
    const solveBtn = page.locator('.lu-problem-solve-btn').first();
    await expect(solveBtn).toBeVisible();
    await solveBtn.click();
    await expect(solveBtn).toHaveAttribute('aria-pressed', 'true');
    const classes = await solveBtn.getAttribute('class');
    expect(classes).not.toContain('text-light-muted');
  });
});
