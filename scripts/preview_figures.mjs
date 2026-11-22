#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFigure, renderCaptionMath } from '../src/lib/plot/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const figuresDir = path.join(root, 'src/figures');
const reportsDir = path.join(root, 'reports/figures');

fs.mkdirSync(reportsDir, { recursive: true });

async function run() {
  if (!fs.existsSync(figuresDir)) {
    console.log('No figures directory found.');
    return;
  }

  const courses = fs.readdirSync(figuresDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const figuresList = [];

  for (const courseId of courses) {
    const courseDir = path.join(figuresDir, courseId);
    const courseReportDir = path.join(reportsDir, courseId);
    fs.mkdirSync(courseReportDir, { recursive: true });

    const specFiles = fs.readdirSync(courseDir).filter((name) => name.endsWith('.mjs'));

    for (const specFile of specFiles) {
      const id = path.basename(specFile, '.mjs');
      const specPath = path.join(courseDir, specFile);
      const mod = await import(`file://${specPath}`);
      const spec = mod.default || mod;

      const { svg } = renderFigure({ ...spec, id });

      // Save SVG
      const svgPath = path.join(courseReportDir, `${id}.svg`);
      fs.writeFileSync(svgPath, svg, 'utf8');

      // Run custom checks
      const checkResults = [];
      for (const [name, fn] of spec.checks || []) {
        try {
          const pass = Boolean(fn());
          checkResults.push({ name, pass });
        } catch (err) {
          checkResults.push({ name, pass: false, error: err.message });
        }
      }

      figuresList.push({
        id,
        courseId,
        caption: spec.caption,
        alt: spec.alt,
        svgPath: path.relative(reportsDir, svgPath),
        svg,
        checkResults,
      });
    }
  }

  // Generate index.html contact sheet
  const contactSheetHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Figure Contact Sheet · LibreUni</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.18.4/dist/katex.min.css">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; color: #0f172a; }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    .grid { display: grid; gap: 2.5rem; }
    .figure-card { background: white; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .fig-id { font-size: 1.1rem; font-weight: bold; margin-bottom: 0.25rem; }
    .fig-caption { font-size: 0.9rem; color: #334155; margin-bottom: 1rem; }
    .previews { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .preview-box { border-radius: 0.75rem; padding: 1rem; border: 1px solid #e2e8f0; }
    .preview-light { background: #ffffff; color: #0f172a; }
    .preview-dark { background: #111827; color: #f1f5f9; }
    .preview-label { font-size: 0.75rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; opacity: 0.6; }
    .checks { border-top: 1px solid #e2e8f0; padding-top: 1rem; font-size: 0.85rem; }
    .check-pass { color: #059669; }
    .check-fail { color: #dc2626; font-weight: bold; }
    .alt-text { font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; font-style: italic; }
  </style>
</head>
<body>
  <h1>Verified Figures Contact Sheet</h1>
  <p class="subtitle">${figuresList.length} figures rendered across active courses</p>
  <div class="grid">
    ${figuresList
      .map(
        (f) => `
      <div class="figure-card" id="${f.id}">
        <div class="fig-id">${f.courseId} / ${f.id}</div>
        <div class="fig-caption">${renderCaptionMath(f.caption)}</div>
        <div class="previews">
          <div class="preview-box preview-light">
            <div class="preview-label">Light Mode</div>
            ${f.svg}
          </div>
          <div class="preview-box preview-dark">
            <div class="preview-label">Dark Mode</div>
            ${f.svg}
          </div>
        </div>
        <div class="checks">
          <strong>Mathematical checks:</strong>
          <ul>
            ${f.checkResults
              .map(
                (c) => `
              <li class="${c.pass ? 'check-pass' : 'check-fail'}">
                ${c.pass ? '✓' : '✗'} ${c.name} ${c.error ? `(${c.error})` : ''}
              </li>`
              )
              .join('')}
          </ul>
          <div class="alt-text"><strong>Alt:</strong> ${f.alt}</div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>
  `.trim();

  fs.writeFileSync(path.join(reportsDir, 'index.html'), contactSheetHtml, 'utf8');
  console.log(`Figures preview complete: ${figuresList.length} figures generated in reports/figures/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
