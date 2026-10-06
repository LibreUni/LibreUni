import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateRenderedLessons } from './validate-rendered-lessons.mjs';

function fixture(html) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'libreuni-rendered-'));
  fs.mkdirSync(path.join(root, 'src/data/course-manifests'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist/lessons/demo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/data/course-manifests/demo.yml'), 'modules:\n  - title: Demo\n    lessons: [one]\n');
  if (html !== null) fs.writeFileSync(path.join(root, 'dist/lessons/demo/one.html'), html);
  return root;
}

test('rendered validator accepts file-format lesson pages and math annotations', () => {
  const root = fixture('<main><p>Cost is $100.</p><math><annotation encoding="application/x-tex">\\frac{1}{2}</annotation><mn>1/2</mn></math></main>');
  assert.deepEqual(validateRenderedLessons(root, ['demo']), { failures: [], pages: [path.join(root, 'dist/lessons/demo/one.html')] });
  fs.rmSync(root, { recursive: true, force: true });
});

test('rendered validator rejects missing, raw-TeX, and renderer-error pages', () => {
  const missing = fixture(null);
  assert.equal(validateRenderedLessons(missing, ['demo']).failures.length, 1);
  fs.rmSync(missing, { recursive: true, force: true });

  const raw = fixture('<main><p>Unrendered $x^2$ expression</p></main>');
  assert.match(validateRenderedLessons(raw, ['demo']).failures[0], /raw TeX/);
  fs.rmSync(raw, { recursive: true, force: true });

  const unclosed = fixture('<main><p>The range is $[-128,127]`.</p></main>');
  assert.match(validateRenderedLessons(unclosed, ['demo']).failures[0], /raw TeX/);
  fs.rmSync(unclosed, { recursive: true, force: true });

  const error = fixture('<main><div>PlantUML Rendering Error</div></main>');
  assert.match(validateRenderedLessons(error, ['demo']).failures[0], /renderer emitted/);
  fs.rmSync(error, { recursive: true, force: true });
});
