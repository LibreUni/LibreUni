import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import Color from 'colorjs.io';
import { expect, test } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PLAYGROUNDS = [
  'RelationalAlgebraPlayground',
  'BTreePlayground',
  'JoinPredicatePlayground',
  'CacheHierarchyPlayground',
  'PipelineHazardPlayground',
  'SchedulerPlayground',
  'CrashConsistencyPlayground',
  'EpsilonDeltaPlayground',
  'RiemannPlayground',
];

async function buildBundle(names) {
  const imports = names.map((n, i) => `import C${i} from './src/components/playgrounds/${n}.tsx';`).join('\n');
  const mounts = names
    .map((n, i) => `createRoot(document.getElementById('m-${n}')).render(React.createElement(C${i}));`)
    .join('\n');

  const res = await esbuild.build({
    stdin: {
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client';\n${imports}\n${mounts}`,
      resolveDir: ROOT,
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'iife',
    jsx: 'automatic',
  });
  return res.outputFiles[0].text;
}

function composite(layers) {
  let acc = new Color('white').to('srgb');
  for (const s of layers) {
    try {
      const c = new Color(s).to('srgb');
      const a = c.alpha ?? 1;
      if (a >= 0.999) acc = c;
      else {
        acc = new Color('srgb', [
          c.coords[0] * a + acc.coords[0] * (1 - a),
          c.coords[1] * a + acc.coords[1] * (1 - a),
          c.coords[2] * a + acc.coords[2] * (1 - a),
        ]);
      }
    } catch {}
  }
  return acc;
}

test.describe('Extended WCAG AA contrast for playgrounds, development, and status indicators', () => {
  for (const theme of ['modern', 'monochrome']) {
    for (const mode of ['light', 'dark']) {
      test(`playgrounds maintain >= 4.5:1 contrast for text and SVG labels in ${theme} [${mode}]`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: mode });
        const page = await context.newPage();
        const bundle = await buildBundle(PLAYGROUNDS);
        try {
          await page.addInitScript(
            ({ t, m }) => {
              localStorage.setItem('theme', t);
              localStorage.setItem('color-mode', m);
            },
            { t: theme, m: mode }
          );
          await page.goto('/about.html', { waitUntil: 'domcontentloaded' });
          await page.evaluate(
            ({ t, m }) => {
              document.documentElement.dataset.theme = t;
              document.documentElement.dataset.colorMode = m;
              document.documentElement.classList.toggle('dark', m === 'dark');
              const main = document.querySelector('main') || document.body;
              main.innerHTML = '';
            },
            { t: theme, m: mode }
          );

          await page.evaluate((names) => {
            const main = document.querySelector('main') || document.body;
            main.innerHTML = names.map((n) => `<div id="m-${n}" class="p-4"></div>`).join('');
          }, PLAYGROUNDS);
          await page.addScriptTag({ content: bundle });

          const samples = await page.evaluate(() => {
            function bgLayers(el) {
              const out = [];
              let cur = el;
              while (cur && cur !== document.documentElement) {
                const bg = getComputedStyle(cur).backgroundColor;
                if (bg && bg !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)$/.test(bg)) out.push(bg);
                cur = cur.parentElement;
              }
              out.push(getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)');
              out.reverse();
              return out;
            }

            function findContainingSvgShapeFill(svg, txtEl) {
              const tRect = txtEl.getBoundingClientRect();
              if (tRect.width === 0 || tRect.height === 0) return null;
              const tx = tRect.left + tRect.width / 2;
              const ty = tRect.top + tRect.height / 2;
              const shapes = [...svg.querySelectorAll('circle, rect')];
              let matched = null;
              // Inspect visible shapes painted before txtEl from back to front; topmost match wins
              for (const shape of shapes) {
                if ((shape.compareDocumentPosition(txtEl) & Node.DOCUMENT_POSITION_FOLLOWING) === 0) continue;
                const sf = getComputedStyle(shape).fill;
                const so = Number(getComputedStyle(shape).opacity || '1');
                if (!sf || sf === 'none' || /^rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(sf) || so === 0) continue;
                const sRect = shape.getBoundingClientRect();
                if (sRect.width === 0 || sRect.height === 0) continue;
                if (tx >= sRect.left && tx <= sRect.right && ty >= sRect.top && ty <= sRect.bottom) {
                  matched = so < 1 ? sf.replace(/^rgb\(([^)]+)\)$/, `rgba($1, ${so})`) : sf;
                }
              }
              return matched;
            }

            const items = [];
            for (const el of document.querySelectorAll(
              '#m-RelationalAlgebraPlayground button, #m-BTreePlayground .font-mono, #m-JoinPredicatePlayground button, #m-CacheHierarchyPlayground button, #m-SchedulerPlayground button, #m-CrashConsistencyPlayground button'
            )) {
              const txt = el.textContent?.trim();
              if (!txt || txt.length > 24) continue;
              const s = getComputedStyle(el);
              items.push({ kind: 'html', text: txt, color: s.color, bgs: bgLayers(el) });
            }
            for (const txtEl of document.querySelectorAll('main svg text')) {
              const svg = txtEl.closest('svg');
              if (!svg) continue;
              const svgRect = svg.getBoundingClientRect();
              if (svgRect.width === 0 || svgRect.height === 0) continue;
              const s = getComputedStyle(txtEl);
              const shapeBg = findContainingSvgShapeFill(svg, txtEl);
              const bgs = bgLayers(svg);
              if (shapeBg) bgs.push(shapeBg);
              items.push({ kind: 'svg', text: txtEl.textContent?.trim(), color: s.fill, bgs });
            }
            return items;
          });

          const failures = [];
          for (const item of samples) {
            if (!item.color || item.color === 'none') continue;
            const bg = composite(item.bgs);
            const fg = new Color(item.color).to('srgb');
            const ratio = bg.contrast(fg, 'WCAG21');
            if (ratio < 4.5) {
              failures.push(
                `${item.kind} "${item.text}": ${ratio.toFixed(2)}:1 (fg=${fg.toString({ format: 'hex' })}, bg=${bg.toString({ format: 'hex' })})`
              );
            }
          }
          expect(failures, `Low-contrast items in ${theme} [${mode}]:\n${failures.join('\n')}`).toEqual([]);
        } finally {
          await context.close();
        }
      });

      test(`lesson completion button maintains >= 4.5:1 contrast in ${theme} [${mode}]`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: mode });
        const page = await context.newPage();
        try {
          await page.addInitScript(
            ({ t, m }) => {
              localStorage.setItem('theme', t);
              localStorage.setItem('color-mode', m);
            },
            { t: theme, m: mode }
          );
          await page.goto('/lessons/database-systems/indexes.html', { waitUntil: 'networkidle' });

          const markBtn = page.locator('#mark-completed');
          await expect(markBtn).toBeVisible();

          const measureBtn = async (label) => {
            await markBtn.evaluate((btn) => Promise.all(btn.getAnimations().map((a) => a.finished)));
            const sample = await markBtn.evaluate((btn) => {
              const out = [];
              let cur = btn;
              while (cur && cur !== document.documentElement) {
                const bg = getComputedStyle(cur).backgroundColor;
                if (bg && bg !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)$/.test(bg)) out.push(bg);
                cur = cur.parentElement;
              }
              out.push(getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)');
              out.reverse();
              return { color: getComputedStyle(btn).color, bgs: out, text: btn.textContent?.trim() };
            });
            const bg = composite(sample.bgs);
            const fg = new Color(sample.color).to('srgb');
            const ratio = bg.contrast(fg, 'WCAG21');
            expect(
              ratio,
              `#mark-completed (${label}, "${sample.text}") in ${theme} [${mode}] had ${ratio.toFixed(2)}:1 (fg=${fg.toString({ format: 'hex' })}, bg=${bg.toString({ format: 'hex' })})`
            ).toBeGreaterThanOrEqual(4.5);
          };

          await measureBtn('incomplete');
          await markBtn.click();
          await expect(markBtn).toHaveAttribute('aria-pressed', 'true');
          await measureBtn('completed');
          await markBtn.hover();
          await measureBtn('completed-hover');
        } finally {
          await context.close();
        }
      });
    }
  }
});
