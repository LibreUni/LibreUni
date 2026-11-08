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
