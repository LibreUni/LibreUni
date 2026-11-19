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

test('rendered validator catches leaked \\bowtie and broken table cardinality math like $1,000+', () => {
  const bowtieRoot = fixture('<table><tbody><tr><td>unknown</td><td>$1,000+</td><td>A\\bowtie C</td></tr></tbody></table>');
  const { failures } = validateRenderedLessons(bowtieRoot, ['demo']);
  assert.ok(failures.some((f) => /raw TeX/i.test(f)), `Expected raw TeX failure, got: ${failures}`);
});

test('rendered validator catches KaTeX error spans anywhere in HTML', () => {
  const katexErrRoot = fixture('<main><span class="katex-error" title="ParseError">\\badcmd</span></main>');
  const { failures } = validateRenderedLessons(katexErrRoot, ['demo']);
  assert.ok(failures.some((f) => /KaTeX error/i.test(f)), `Expected KaTeX error failure, got: ${failures}`);
});

test('rendered validator catches HTML table column count mismatches', () => {
  const badTable = fixture('<table><thead><tr><th>A</th><th>B</th><th>C</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>');
  const { failures } = validateRenderedLessons(badTable, ['demo']);
  assert.ok(failures.some((f) => /2 column\(s\), expected 3/i.test(f)), `Expected table column mismatch, got: ${failures}`);
});

test('rendered validator catches leaked Markdown backticks in visible prose and ignores diagram-source', () => {
  const backtickRoot = fixture('<article><p>Hint: use `WHERE` carefully.</p></article>');
  assert.ok(
    validateRenderedLessons(backtickRoot, ['demo']).failures.some((f) => /backtick/i.test(f)),
    'Expected leaked backtick failure'
  );

  const diagramSourceRoot = fixture(
    '<article><details class="diagram-source"><summary>Code</summary><pre><code>A -> B : wait\\nrelease</code></pre></details><p>Price is $100.</p></article>'
  );
  assert.deepEqual(validateRenderedLessons(diagramSourceRoot, ['demo']).failures, []);
});

test('rendered validator checks template math previews and serialized FillInExercise blank arity', () => {
  const badPreview = fixture('<main><template data-math-preview>Let $x = \\frac{1}{2}$.</template></main>');
  assert.ok(
    validateRenderedLessons(badPreview, ['demo']).failures.some((f) => /raw TeX/i.test(f)),
    'Expected raw TeX leak inside <template data-math-preview>'
  );

  const badIsland = fixture(
    `<main><astro-island component-url="/assets/FillInExercise.js" props="{&quot;prompt&quot;:[0,&quot;Value = [!blank!]&quot;],&quot;answers&quot;:[1,[[0,&quot;1&quot;],[0,&quot;2&quot;]]]}"></astro-island></main>`
  );
  assert.ok(
    validateRenderedLessons(badIsland, ['demo']).failures.some((f) => /1 blank\(s\) but serialized 2 answer slot\(s\)/i.test(f)),
    'Expected serialized FillInExercise blank arity failure'
  );
  fs.rmSync(badIsland, { recursive: true, force: true });
});

test('rendered validator catches mangled hash links and broken Ref anchors', () => {
  const mangled = fixture('<main><a class="lu-ref" href="other#stmt.html">Ref</a></main>');
  assert.ok(
    validateRenderedLessons(mangled, ['demo']).failures.some((f) => /mangled \.html after hash/i.test(f)),
    'Expected mangled hash failure'
  );
  fs.rmSync(mangled, { recursive: true, force: true });

  const brokenSamePage = fixture('<main><a class="lu-ref" data-ref-id="missing" href="#missing">Ref</a></main>');
  assert.ok(
    validateRenderedLessons(brokenSamePage, ['demo']).failures.some((f) => /anchor #missing missing/i.test(f)),
    'Expected missing same-page anchor failure'
  );
  fs.rmSync(brokenSamePage, { recursive: true, force: true });

  const valid = fixture('<main><section id="stmt">Stmt</section><a class="lu-ref" data-ref-id="stmt" href="#stmt">Ref</a></main>');
  assert.deepEqual(validateRenderedLessons(valid, ['demo']).failures, []);
  fs.rmSync(valid, { recursive: true, force: true });
});
