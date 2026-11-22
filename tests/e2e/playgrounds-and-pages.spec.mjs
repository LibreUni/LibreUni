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

    // BTreePlayground: advances split step and resets cleanly without leaf duplication
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

  test('Quiz allows verifying immediately with unanswered options treated as "I don\'t know"', async ({ page }) => {
    await page.goto('/lessons/calculus-intro/limits.html', { waitUntil: 'domcontentloaded' });
    const quiz = page.locator('[data-component="Quiz"]').first();
    await expect(quiz).toBeVisible();

    const groupCount = await quiz.locator('[role="group"]').count();
    expect(groupCount).toBeGreaterThanOrEqual(2);
    await expect(quiz).toContainText(`0 / ${groupCount} answered`);

    const verifyBtn = quiz.getByRole('button', { name: /Verify answers/i });
    await expect(verifyBtn).toBeEnabled();
    await verifyBtn.click();

    await expect(quiz.locator('.feedback-diagnostic')).toContainText("I don't know");
    await expect(quiz).toContainText("Unanswered (I don't know)");
    expect(await quiz.locator('[role="group"] button[aria-pressed="true"]').count()).toBe(0);

    await quiz.getByRole('button', { name: /Reset/i }).click();
    const firstCorrect = quiz.locator('[role="group"]').first().getByRole('button', { name: 'Correct', exact: true });
    await firstCorrect.click();
    await expect(firstCorrect).toHaveAttribute('aria-pressed', 'true');
    await expect(quiz).toContainText(`1 / ${groupCount} answered`);

    // Clicking the selected option again clears it back to unanswered
    await firstCorrect.click();
    await expect(firstCorrect).toHaveAttribute('aria-pressed', 'false');
    await expect(quiz).toContainText(`0 / ${groupCount} answered`);

    // Partial submission leaves untouched options as "I don't know" instead of coercing to Incorrect
    await firstCorrect.click();
    await verifyBtn.click();
    await expect(quiz).toContainText(`${groupCount - 1} “I don't know”`);
    expect(await quiz.locator('[role="group"] button[aria-pressed="true"]').count()).toBe(1);
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
