import assert from 'node:assert/strict';
import test from 'node:test';
import { lintMdxSourceContent } from '../scripts/lib/mdx_lint_rules.mjs';
import { renderInlineMarkdownMath } from '../src/utils/inlineFormat.mjs';

test('LINT-16 rejects GFM table rows broken by unescaped pipes inside math', () => {
  const body = `
| Candidate | First join cost | Second join cost | Total |
| --- | ---: | ---: | ---: |
| $(A \\bowtie C) \\bowtie B$ | 110 | $1,000+|A\\bowtie C|$ | $1,110+|A\\bowtie C|$ |
`;
  const errs = lintMdxSourceContent({ relPath: 'demo.mdx', body });
  assert.ok(errs.some((e) => /\[LINT-16\]/.test(e) && /\\lvert/.test(e)), `Expected LINT-16 pipe-in-math error, got: ${errs}`);
  assert.ok(errs.some((e) => /\[LINT-16\]/.test(e) && /cell\(s\), expected 4/.test(e)), `Expected LINT-16 column count error, got: ${errs}`);
});

test('LINT-16 accepts GFM table cells using \\lvert ... \\rvert', () => {
  const body = `
| Candidate | First join cost | Second join cost | Total |
| --- | ---: | ---: | ---: |
| $(A \\bowtie C) \\bowtie B$ | 110 | $1,000+\\lvert A\\bowtie C\\rvert$ | $1,110+\\lvert A\\bowtie C\\rvert$ |
`;
  const errs = lintMdxSourceContent({ relPath: 'demo.mdx', body });
  assert.deepEqual(errs, []);
});

test('LINT-17 catches raw TeX commands, invalid KaTeX in Quiz/CaseStudy props, and unescaped JS backslashes', () => {
  const proseErrs = lintMdxSourceContent({
    relPath: 'prose.mdx',
    body: 'Join result cost includes A\\bowtie C outside delimiters.',
  });
  assert.ok(proseErrs.some((e) => /\[LINT-17\].*raw TeX command "\\bowtie"/.test(proseErrs[0])));

  const quizErrs = lintMdxSourceContent({
    relPath: 'quiz.mdx',
    body: `<Quiz client:load question="Pick $\\invalidcommand{x}$" options={[{ id: "a", text: "$\sigma \\to \\sigma'$", isCorrect: true, feedback: "Yes" }]} />`,
  });
  assert.ok(quizErrs.some((e) => /invalid KaTeX inline math/.test(e)), `Expected KaTeX error in Quiz prop, got: ${quizErrs}`);
  assert.ok(quizErrs.some((e) => /single backslash in JS string math/.test(e)), `Expected single-backslash JS warning, got: ${quizErrs}`);
});

test('LINT-17 permits standalone currency in prose and validates frontmatter', () => {
  const currencyErrs = lintMdxSourceContent({
    relPath: 'currency.mdx',
    body: 'A client sends "transfer $100" and times out.',
  });
  assert.deepEqual(currencyErrs, []);

  const fmErrs = lintMdxSourceContent({
    relPath: 'fm.mdx',
    body: 'Valid prose.',
    frontmatter: {
      outcomes: ['Use `SELECT` with $\\badkatex{$'],
    },
  });
  assert.ok(fmErrs.some((e) => /\[LINT-17\]/.test(e)), `Expected frontmatter validation error, got: ${fmErrs}`);
});

test('LINT-18 catches blank-to-answer arity mismatches and split math across [!blank!]', () => {
  const fillInMismatch = lintMdxSourceContent({
    relPath: 'fillin.mdx',
    body: `<FillInExercise client:load
  prompt="Compute $\\frac{1}{2} =$ [!blank!]"
  answers={["1/2", "0.5"]}
/>`,
  });
  assert.ok(
    fillInMismatch.some((e) => /\[LINT-18\].*1 blank\(s\) but answers array has 2 slot\(s\)/.test(e)),
    `Expected LINT-18 mismatch for FillInExercise, got: ${fillInMismatch}`
  );

  const codeMismatch = lintMdxSourceContent({
    relPath: 'code.mdx',
    body: `<CodeExercise client:load
  code="x = [!blank!] + 1"
  answers={["a", "b"]}
/>`,
  });
  assert.ok(
    codeMismatch.some((e) => /\[LINT-18\].*1 blank\(s\) but answers array has 2 slot\(s\)/.test(e)),
    `Expected LINT-18 mismatch for CodeExercise, got: ${codeMismatch}`
  );

  const splitMath = lintMdxSourceContent({
    relPath: 'split.mdx',
    body: `<FillInExercise client:load
  prompt="$A(x) = \\pi($ [!blank!] $- x^4)$"
  answers={[["x^2"]]}
/>`,
  });
  assert.ok(
    splitMath.some((e) => /\[LINT-18\].*splits inline math/.test(e)),
    `Expected LINT-18 split-math error when math splits around [!blank!], got: ${splitMath}`
  );
});

test('renderInlineMarkdownMath formats code spans, bold, and KaTeX strictly', () => {
  const html = renderInlineMarkdownMath('Check **filter** on `WHERE` where $x^2 > 0$.');
  assert.match(html, /<strong>filter<\/strong>/);
  assert.match(html, /<code[^>]*>WHERE<\/code>/);
  assert.match(html, /class="katex"/);
  assert.doesNotThrow(() => renderInlineMarkdownMath('Value `$HOME` inside code.'));
  assert.throws(() => renderInlineMarkdownMath('Broken $\\frac{1$'));
});
