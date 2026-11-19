import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { auditExtendedMdxContent, auditSiteStructureConsistency } from '../scripts/lib/content_audit_rules.mjs';
import { lintAllUiFiles, lintUiSourceContent } from '../scripts/lib/ui_lint_rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walkFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results.sort();
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  return { frontmatter: YAML.parse(match[1]) || {}, body: match[2] };
}

test('LINT-16 extension rejects GFM table header rows with empty cells except top-left matrix corner', () => {
  const bad = auditExtendedMdxContent({
    relPath: 'bad-table.mdx',
    frontmatter: { kind: 'recap', covers: ['x'] },
    body: `
| Expected \`Task 1\` result |  |  |
| --- | --- | --- |
| \`id\` | \`code\` | \`count\` |
| 10 | DB101 | 1 |
`,
  });
  assert.ok(bad.some((e) => /\[LINT-16\].*empty column cell/.test(e)), `Expected empty header error, got: ${bad}`);

  const goodMatrix = auditExtendedMdxContent({
    relPath: 'matrix-table.mdx',
    frontmatter: { kind: 'recap', covers: ['x'] },
    body: `
|  | A | B |
| --- | --- | --- |
| row 1 | 1 | 2 |
`,
  });
  assert.deepEqual(goodMatrix, []);

  const good = auditExtendedMdxContent({
    relPath: 'good-table.mdx',
    frontmatter: { kind: 'recap', covers: ['x'] },
    body: `
| \`id\` | \`code\` | \`note\` |
| --- | --- | --- |
| 10 | DB101 |  |
`,
  });
  assert.deepEqual(good, []);
});

test('LINT-19 enforces D-0017 autonomous learning terminology in content', () => {
  const bad = auditExtendedMdxContent({
    relPath: 'legacy.mdx',
    frontmatter: {
      kind: 'recap',
      title: 'SQL lab: build a registration report',
    },
    body: 'Join `Enrollment` with `(course_code, term)` for each student during office hours.',
  });
  assert.ok(bad.some((e) => /\[LINT-19\].*frontmatter\.title/.test(e)), `Expected title violation: ${bad}`);
  assert.ok(bad.some((e) => /\[LINT-19\].*enrollment/i.test(e)), `Expected Enrollment violation: ${bad}`);
  assert.ok(bad.some((e) => /\[LINT-19\].*course_code/.test(e)), `Expected course_code violation: ${bad}`);
  assert.ok(bad.some((e) => /\[LINT-19\].*student/.test(e)), `Expected student violation: ${bad}`);
  assert.ok(bad.some((e) => /\[LINT-19\].*office hours/.test(e)), `Expected office hours violation: ${bad}`);

  const good = auditExtendedMdxContent({
    relPath: 'valid.mdx',
    frontmatter: { kind: 'recap', title: 'Virtual address translation' },
    body: 'Guest physical address (`GPA`) maps across host tables with no scheduling dependency across cores.',
  });
  assert.deepEqual(good, []);
});

test('LINT-20 requires ExerciseSet on lesson/lab pages and forbids list-splitting JSX', () => {
  const missingEx = auditExtendedMdxContent({
    relPath: 'review.mdx',
    frontmatter: { kind: 'lesson' },
    body: '## Review\n\n**Review exercise.** Trace the state machine.\n',
  });
  assert.ok(missingEx.some((e) => /\[LINT-20\].*<ExerciseSet>/.test(e)));
  assert.ok(missingEx.some((e) => /\[LINT-20\].*\*\*Review exercise\.\*\*/.test(e)));

  const listSplit = auditExtendedMdxContent({
    relPath: 'split.mdx',
    frontmatter: { kind: 'recap', covers: ['a'] },
    body: `
* **Theorem**
  * *Case 1:* first item

<Figure id="fig-test" size="thumb" />

  * *Case 2:* second item
`,
  });
  assert.ok(listSplit.some((e) => /\[LINT-20\].*splits an indented Markdown list/.test(e)));
});

test('UI-LINT rules catch missing button types, unsafe innerHTML, low contrast, pathname hacks, and playground contracts', () => {
  const errs = lintUiSourceContent({
    relPath: 'src/components/playgrounds/DemoPlayground.tsx',
    content: `
export default function DemoPlayground() {
  return (
    <div className="rounded border p-2 text-slate-500">
      <button onClick={() => {}}>Go</button>
      <p>Past \`T\`</p>
      <span className="text-emerald-600">OK</span>
      <svg><text x="1" y="1">Hi</text></svg>
    </div>
  );
}`,
  });
  assert.ok(errs.some((e) => /\[UI-LINT-01\]/.test(e)));
  assert.ok(errs.some((e) => /\[UI-LINT-03\].*border-light-border/.test(e)));
  assert.ok(errs.some((e) => /\[UI-LINT-03\].*text-slate-500/.test(e)));
  assert.ok(errs.some((e) => /\[UI-LINT-03\].*text-emerald-600/.test(e)));
  assert.ok(errs.some((e) => /\[UI-LINT-03\].*SVG <text>/.test(e)));
  assert.ok(errs.some((e) => /\[UI-LINT-04\].*backtick/.test(e)));
  assert.ok(errs.some((e) => /\[UI-LINT-05\].*InteractivePlayground/.test(e)));

  const xssErrs = lintUiSourceContent({
    relPath: 'src/pages/demo.astro',
    content: `<script>el.innerHTML = \`<span>\${row.title}</span>\`; const x = window.location.pathname.split('/').filter(Boolean)[1];</script>`,
  });
  assert.ok(xssErrs.some((e) => /\[UI-LINT-02\]/.test(xssErrs[0])));
  assert.ok(xssErrs.some((e) => /\[UI-LINT-04\].*pathname/.test(e)));

  const clean = lintUiSourceContent({
    relPath: 'src/components/playgrounds/CleanPlayground.tsx',
    content: `
import InteractivePlayground from '../InteractivePlayground';
export default function CleanPlayground() {
  return (
    <InteractivePlayground title="Demo" description="Desc" staticCaption="Cap" staticContent={<div />} onReset={() => {}}>
      <div className="rounded border border-light-border dark:border-dark-border text-light-muted dark:text-dark-muted">
        <button type="button" onClick={() => {}}>Go</button>
        <span className="text-emerald-700 dark:text-emerald-300">OK</span>
        <svg><text x="1" y="1" fill="currentColor">Hi</text></svg>
      </div>
    </InteractivePlayground>
  );
}`,
  });
  assert.deepEqual(clean, []);
});

test('Repository-wide content audit rules find zero extended MDX or site-consistency violations', () => {
  const lessons = walkFiles(path.join(ROOT, 'src/content/lessons'), '.mdx');
  const errors = [];
  for (const file of lessons) {
    const relPath = path.relative(ROOT, file).replaceAll('\\', '/');
    const { frontmatter, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
    errors.push(...auditExtendedMdxContent({ relPath, body, frontmatter }));
  }
  errors.push(...auditSiteStructureConsistency(ROOT));
  assert.deepEqual(errors, [], `Extended MDX & site audit failures:\n${errors.join('\n')}`);
});

test('Repository-wide UI lint rules find zero Astro/TSX component or page violations', () => {
  const { errors } = lintAllUiFiles(ROOT);
  assert.deepEqual(errors, [], `UI lint failures:\n${errors.join('\n')}`);
});
