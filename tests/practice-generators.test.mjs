import assert from 'node:assert/strict';
import test from 'node:test';
import katex from 'katex';
import {
  QUESTION_TEMPLATES,
  generateQuestion,
  repairStoredQuestion,
  gcd,
  formatFraction,
  formatPoly,
  formatSigned,
} from '../src/lib/practiceGenerators.ts';

test('mathematical helpers produce correct arithmetic outputs', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(-10, 15), 5);
  assert.equal(gcd(0, 5), 5);

  assert.equal(formatFraction(6, 3), '2');
  assert.equal(formatFraction(-6, 3), '-2');
  assert.equal(formatFraction(2, 4), '\\frac{1}{2}');
  assert.equal(formatFraction(-3, 9), '-\\frac{1}{3}');
  assert.equal(formatFraction(0, 5), '0');

  assert.equal(formatSigned(5), '+ 5');
  assert.equal(formatSigned(-5), '- 5');
  assert.equal(formatSigned(0), '');

  assert.equal(formatPoly([1, -5, 6]), 'x^{2} - 5x + 6');
  assert.equal(formatPoly([-2, 0, 3]), '-2x^{2} + 3');
  assert.equal(formatPoly([1, 0, 0]), 'x^{2}');
  assert.equal(formatPoly([0]), '0');
});

test('every question template generates valid structure and math without crashing across 50 iterations', () => {
  assert.ok(QUESTION_TEMPLATES.length >= 12, 'Must have at least 12 distinct templates');

  for (const template of QUESTION_TEMPLATES) {
    for (let i = 0; i < 50; i++) {
      const q = template.generate();
      assert.ok(q.title.length > 3, `Template ${template.templateId} title is non-empty`);
      assert.ok(q.questionMath.length > 10, `Template ${template.templateId} questionMath is non-empty`);
      assert.ok(Array.isArray(q.hints) && q.hints.length >= 2, `Template ${template.templateId} has at least 2 hints`);
      assert.ok(q.solutionMath.length > 20, `Template ${template.templateId} solutionMath is non-empty`);
      assert.ok(q.keyAnswer.length > 0, `Template ${template.templateId} keyAnswer is non-empty`);

      // Ensure no NaN or undefined leaked into generated strings
      assert.doesNotMatch(q.questionMath, /NaN|undefined/, `questionMath in ${template.templateId} must not contain NaN`);
      assert.doesNotMatch(q.solutionMath, /NaN|undefined/, `solutionMath in ${template.templateId} must not contain NaN`);
      assert.doesNotMatch(q.keyAnswer, /NaN|undefined/, `keyAnswer in ${template.templateId} must not contain NaN`);
    }
  }
});

function validateMathString(str, fieldName, templateId, iteration) {
  // 1. Dollar parity: Ensure every opening $ and $$ has a matching closing delimiter
  const textWithoutEscaped = str.replace(/\\\$/g, '');
  const doubleDollarCount = (textWithoutEscaped.match(/\$\$/g) || []).length;
  assert.equal(
    doubleDollarCount % 2,
    0,
    `Template ${templateId} ${fieldName} (iteration ${iteration}) has mismatched $$ delimiters: "${str}"`
  );

  const textWithoutDisplay = textWithoutEscaped.replace(/\$\$[\s\S]*?\$\$/g, '');
  const singleDollarCount = (textWithoutDisplay.match(/(?<!\$)\$(?!\$)/g) || []).length;
  assert.equal(
    singleDollarCount % 2,
    0,
    `Template ${templateId} ${fieldName} (iteration ${iteration}) has unmatched single $ delimiters: "${str}"`
  );

  // 2. Strict KaTeX compilation of display math blocks
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
  for (const match of textWithoutEscaped.matchAll(displayMathRegex)) {
    const mathContent = match[1].trim();
    assert.doesNotThrow(() => {
      katex.renderToString(mathContent, { displayMode: true, throwOnError: true });
    }, `Template ${templateId} ${fieldName} display math failed KaTeX compilation: "${mathContent}"`);
  }

  // 3. Strict KaTeX compilation of inline math blocks
  const inlineMathRegex = /(?<!\$)\$(?!\$)([\s\S]*?)(?<!\$)\$(?!\$)/g;
  for (const match of textWithoutDisplay.matchAll(inlineMathRegex)) {
    const mathContent = match[1].trim();
    assert.doesNotThrow(() => {
      katex.renderToString(mathContent, { displayMode: false, throwOnError: true });
    }, `Template ${templateId} ${fieldName} inline math failed KaTeX compilation: "${mathContent}"`);
  }

  // 4. No raw LaTeX command leakage outside math mode
  const plainText = textWithoutDisplay.replace(inlineMathRegex, '');
  const texCommandLeakRegex = /\\[a-zA-Z]{2,}/g;
  const leaks = plainText.match(texCommandLeakRegex);
  assert.equal(
    leaks,
    null,
    `Template ${templateId} ${fieldName} (iteration ${iteration}) leaks raw LaTeX outside math delimiters: ${leaks?.join(', ')} in "${plainText}"`
  );
}

test('exhaustive KaTeX validation and math delimiter parity across 100 iterations per template', () => {
  for (const template of QUESTION_TEMPLATES) {
    for (let i = 0; i < 100; i++) {
      const q = template.generate();

      validateMathString(q.questionMath, 'questionMath', template.templateId, i);

      for (let hIdx = 0; hIdx < q.hints.length; hIdx++) {
        validateMathString(q.hints[hIdx], `hint[${hIdx}]`, template.templateId, i);
      }

      validateMathString(q.solutionMath, 'solutionMath', template.templateId, i);

      // keyAnswer must be valid math and free of raw LaTeX leakage
      validateMathString(q.keyAnswer, 'keyAnswer', template.templateId, i);
    }
  }
});

test('generateQuestion respects topic and difficulty filters', () => {
  const topics = ['limits', 'derivatives', 'integrals', 'approximations'];
  const difficulties = ['foundational', 'intermediate', 'advanced'];

  for (const topic of topics) {
    const q = generateQuestion(topic, 'all');
    assert.equal(q.topicId, topic, `Generated question topic must be ${topic}`);
  }

  for (const diff of difficulties) {
    const q = generateQuestion('all', diff);
    assert.equal(q.difficulty, diff, `Generated question difficulty must be ${diff}`);
  }

  for (const topic of topics) {
    for (const diff of difficulties) {
      const q = generateQuestion(topic, diff);
      assert.equal(q.topicId, topic);
      assert.equal(q.difficulty, diff);
    }
  }
});

test('repairStoredQuestion repairs legacy broken questions from localStorage so KaTeX parses without error', () => {
  const legacyBrokenQ = {
    id: 'legacy-q-1',
    templateId: 'integral-area-curves',
    topicId: 'integrals',
    topicName: 'Integration & Accumulation',
    difficulty: 'intermediate',
    title: 'Area Enclosed Between Two Curves',
    questionMath: 'Compute the exact area of the planar region bounded between the line $y = 2x$ and the parabola $y = x^2$.',
    hints: [
      'Find the $x$-coordinates of the intersection points by solving $x^2 = 2x$.',
      'Determine which curve lies above the other on the interval between the intersection points. Set up the integral $\\int_{x_1}^{x_2} (y_{\\text{top}} - y_{\\text{bottom}})\\,dx$.',
    ],
    solutionMath:
      '1. **Find Intersection Points:**\n$$x^2 = 2x \\implies x(x - 2) = 0 \\implies x = 0 \\quad \\text{and} \\quad x = 2$$\n\n2. **Identify Upper and Lower Curves:**\nFor any test point in $(0, 2)$, such as $x = 1$, we have $y = 2(1) = 2$ and $y = 1^2 = 1$. Since 2 > 1$, the line $y = 2x$ is above the parabola $y = x^2.\n\n3. **Set Up Area Integral:**\n$$A = \\int_0^{2} (2x - x^2)\\,dx$$\n\n4. **Evaluate Antiderivative:**\n$$A = \\left[ \\frac{2}{2}x^2 - \\frac{x^3}{3} \\right]_0^{2} = \\left( \\frac{2}{2}(2)^2 - \\frac{(2)^3}{3} \\right) - 0$$\n$$A = \\frac{2^3}{2} - \\frac{2^3}{3} = \\frac{8}{6} = \\frac{4}{3}$$\n\nThe exact area is \\frac{4}{3}$.',
    keyAnswer: '\\frac{4}{3}',
    generatedAt: '2026-11-08T10:00:00.000Z',
    revealedHintsCount: 1,
    showSolution: true,
    isMastered: false,
  };

  const repaired = repairStoredQuestion(legacyBrokenQ);

  // Validate that repaired strings pass all KaTeX checks
  validateMathString(repaired.questionMath, 'questionMath', repaired.templateId, 0);
  for (let idx = 0; idx < repaired.hints.length; idx++) {
    validateMathString(repaired.hints[idx], `hint[${idx}]`, repaired.templateId, 0);
  }
  validateMathString(repaired.solutionMath, 'solutionMath', repaired.templateId, 0);
  validateMathString(repaired.keyAnswer, 'keyAnswer', repaired.templateId, 0);
});
