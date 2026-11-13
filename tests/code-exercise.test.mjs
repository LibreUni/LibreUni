import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import React from 'react';
import { renderToString } from 'react-dom/server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Bundle CodeExercise and FillInExercise into node_modules/.cache for runtime testing
fs.mkdirSync(path.join(root, 'node_modules/.cache'), { recursive: true });
const codeExerciseOut = path.join(root, 'node_modules/.cache/CodeExercise-test.mjs');
buildSync({
  entryPoints: [path.join(root, 'src/components/CodeExercise.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['react', 'react-dom', 'lucide-react', 'katex'],
  outfile: codeExerciseOut,
});

const fillInOut = path.join(root, 'node_modules/.cache/FillInExercise-test.mjs');
buildSync({
  entryPoints: [path.join(root, 'src/components/FillInExercise.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  external: ['react', 'react-dom', 'lucide-react', 'katex'],
  outfile: fillInOut,
});

const { default: CodeExercise, validateCodeExercise, isCodeAllComments } = await import(codeExerciseOut);
const { default: FillInExercise, FillIn } = await import(fillInOut);

test('CodeExercise throws when code consists entirely of single-line # comments', () => {
  const commentCode = `# We know d/dx(u * v) = u' * v + u * v'
# Integrating both sides: u * v = ∫(u' * v) dx + ∫(u * v') dx
# Rearranging terms gives the Integration by Parts formula:
# ∫(u * v') dx = u * v - [!blank!]`;

  assert.equal(isCodeAllComments(commentCode), true);
  assert.throws(() => validateCodeExercise(commentCode), /anti-pattern/i);
  assert.throws(
    () => CodeExercise({ code: commentCode, answers: ["∫(u' * v) dx"] }),
    /anti-pattern/i
  );
});

test('CodeExercise throws when code consists entirely of C-style // comments', () => {
  const commentCode = `// Step 1: Initialize the accumulator
// Step 2: Compute intermediate term
// Step 3: Result is [!blank!]`;

  assert.equal(isCodeAllComments(commentCode), true);
  assert.throws(() => validateCodeExercise(commentCode), /anti-pattern/i);
  assert.throws(
    () => CodeExercise({ code: commentCode, answers: ['result'] }),
    /anti-pattern/i
  );
});

test('CodeExercise throws when code consists entirely of block comments /* ... */', () => {
  const commentCode = `/*
 * Fill in the blanks below to complete the algorithm:
 * The condition is [!blank!]
 */`;

  assert.equal(isCodeAllComments(commentCode), true);
  assert.throws(() => validateCodeExercise(commentCode), /anti-pattern/i);
  assert.throws(
    () => CodeExercise({ code: commentCode, answers: ['cond'] }),
    /anti-pattern/i
  );
});

test('CodeExercise throws when code consists entirely of SQL -- comments', () => {
  const commentCode = `-- Query explanation:
-- Select the matching rows where id = [!blank!]`;

  assert.equal(isCodeAllComments(commentCode), true);
  assert.throws(() => validateCodeExercise(commentCode), /anti-pattern/i);
  assert.throws(
    () => CodeExercise({ code: commentCode, answers: ['42'] }),
    /anti-pattern/i
  );
});

test('CodeExercise throws when code is empty or whitespace only', () => {
  assert.equal(isCodeAllComments(''), true);
  assert.equal(isCodeAllComments('   \n\t  '), true);
  assert.throws(() => validateCodeExercise(''), /anti-pattern/i);
  assert.throws(() => validateCodeExercise('   \n  '), /anti-pattern/i);
  assert.throws(() => CodeExercise({ code: '' }), /anti-pattern/i);
});

test('CodeExercise succeeds without throwing when code contains executable code alongside comments', () => {
  const validPython = `def midpoint_riemann_sum(f, a, b, n):
    dx = (b - a) / n
    total_area = 0.0
    for i in range(n):
        # Calculate midpoint of subinterval i
        mid = a + (i + [!blank!]) * dx
        total_area += f(mid) * dx
    return total_area`;

  assert.equal(isCodeAllComments(validPython), false);
  assert.doesNotThrow(() => validateCodeExercise(validPython));
  assert.doesNotThrow(() =>
    renderToString(React.createElement(CodeExercise, { code: validPython, answers: ['0.5'] }))
  );

  const validC = `uint8_t extract_mode(uint8_t word) {
    // Mode field is in bits 1..3
    return (word >> [!blank!]) & 0x07;
}`;
  assert.equal(isCodeAllComments(validC), false);
  assert.doesNotThrow(() => validateCodeExercise(validC));
  assert.doesNotThrow(() =>
    renderToString(React.createElement(CodeExercise, { code: validC, answers: ['1'] }))
  );
});

test('No lesson file in the entire repository uses CodeExercise with all-comment code', () => {
  function walk(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walk(full));
      else if (entry.name.endsWith('.mdx')) files.push(full);
    }
    return files;
  }

  const lessons = walk(path.join(root, 'src/content/lessons'));
  assert.ok(lessons.length > 50, 'Expected > 50 lesson files');

  const violations = [];
  for (const file of lessons) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.matchAll(/<CodeExercise\b([\s\S]*?)\/>/g);
    for (const match of matches) {
      const block = match[1];
      const codeMatch = block.match(/\bcode=\{?(?:String\.raw)?`([\s\S]*?)`\}?|\bcode=\{['"]([\s\S]*?)['"]\}/);
      if (codeMatch) {
        const rawCode = codeMatch[1] ?? codeMatch[2] ?? '';
        if (isCodeAllComments(rawCode)) {
          violations.push({
            file: path.relative(root, file),
            code: rawCode.slice(0, 100),
          });
        }
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found ${violations.length} CodeExercise(s) with all-comment code. Use FillInExercise instead!`
  );
});

test('FillInExercise component exports correctly and renders without errors', () => {
  assert.equal(typeof FillInExercise, 'function');
  assert.equal(typeof FillIn, 'function');
  assert.equal(FillInExercise, FillIn);

  const html = renderToString(
    React.createElement(FillInExercise, {
      title: 'Complete the Integration by Parts formula',
      prompt: 'We know d/dx(u*v) = u\'*v + u*v\'. Then ∫(u*v\') dx = u*v - [!blank!]',
      answers: ["∫(u' * v) dx"],
      explanation: 'Follows from the product rule.',
    })
  );

  assert.ok(html.includes('data-component="FillInExercise"'), 'Rendered HTML should have data-component="FillInExercise"');
  assert.ok(html.includes('Complete the Integration by Parts formula'), 'Rendered HTML should contain title');
  assert.ok(html.includes('fill-in-exercise'), 'Rendered HTML should have fill-in-exercise class');
});

test('CodeExercise supports nested accepted answers and renders MathText description cleanly', () => {
  const html = renderToString(
    React.createElement(CodeExercise, {
      title: 'Darboux term',
      description: 'Supply the supremum factor using `i` and `n`.',
      code: 'u_sum = sum(([!blank!]) * (1 / n) for i in range(1, n + 1))',
      answers: [['(i / n) ** 3', '(i/n)**3']],
      explanation: 'Right endpoint gives $(i/n)^3$.',
    })
  );
  const plain = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(plain.includes('1 token to supply'));
  assert.ok(plain.includes('<code'));
  assert.ok(!plain.includes('`i`'), 'Backticks should be formatted into <code> elements');
});

test('FillInExercise wraps TeX primary answers cleanly in print-static-prompt', () => {
  const html = renderToString(
    React.createElement(FillInExercise, {
      title: 'Integration by Parts',
      prompt: String.raw`Rearranging gives $\int (u \cdot v')\,dx = u \cdot v -$ [!blank!]`,
      answers: [[String.raw`\int (u' \cdot v)\,dx`, "∫(u' * v) dx"]],
    })
  );
  const plain = html.replace(/<!--[\s\S]*?-->/g, '');
  const visible = plain.replace(/<annotation\b[\s\S]*?<\/annotation>/gi, '');
  assert.ok(plain.includes('1 blank to complete'));
  assert.ok(!visible.includes('\\int'), 'TeX primary answer in print-static-prompt should render via KaTeX, not raw TeX');
  assert.ok(visible.includes('class="katex"'));
});

test('Every FillInExercise and CodeExercise in repository lessons matches blank count to answers length', async () => {
  const { extractJsxComponentTags, maskCodeAndComments } = await import('../scripts/lib/mdx_lint_rules.mjs');
  function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith('.mdx')) out.push(full);
    }
    return out;
  }

  const mismatches = [];
  for (const file of walk(path.join(root, 'src/content/lessons'))) {
    const raw = fs.readFileSync(file, 'utf8');
    const { tags } = extractJsxComponentTags(maskCodeAndComments(raw));
    for (const tag of tags) {
      if (tag.name !== 'FillInExercise' && tag.name !== 'CodeExercise') continue;
      const src = tag.name === 'FillInExercise'
        ? tag.props.prompt ?? tag.props.text ?? tag.props.statement
        : tag.props.code;
      const answers = tag.props.answers;
      if (typeof src !== 'string' || !Array.isArray(answers)) continue;
      const blanks = src.split(/(?:\[!blank!]|_{3,})/).length - 1;
      if (blanks < 1 || answers.length !== blanks) {
        mismatches.push(`${path.relative(root, file)}:${tag.line} <${tag.name}> blanks=${blanks} answers=${answers.length}`);
      }
    }
  }
  assert.deepEqual(mismatches, []);
});
