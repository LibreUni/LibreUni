export type TopicId = 'limits' | 'derivatives' | 'integrals' | 'approximations';
export type DifficultyLevel = 'foundational' | 'intermediate' | 'advanced';

export interface PracticeQuestion {
  id: string;
  templateId: string;
  topicId: TopicId;
  topicName: string;
  difficulty: DifficultyLevel;
  title: string;
  questionMath: string;
  hints: string[];
  solutionMath: string;
  keyAnswer: string;
  generatedAt: string;
}

export interface StoredPracticeQuestion extends PracticeQuestion {
  revealedHintsCount: number;
  showSolution: boolean;
  isMastered: boolean;
  notes?: string;
}

/**
 * Automatically repairs and migrates legacy questions stored in localStorage
 * that were generated before math delimiter and LaTeX syntax fixes.
 */
export function repairStoredQuestion(q: StoredPracticeQuestion): StoredPracticeQuestion {
  let solutionMath = q.solutionMath || '';
  if (solutionMath) {
    solutionMath = solutionMath
      .replace(
        /Since (\d+) > 1\$, the line \$y = (\d+)x\$ is above the parabola \$y = x\^2\./g,
        'Since $$$1 > 1$, the line $y = $2x$ is above the parabola $y = x^2$.'
      )
      .replace(/\$y = x\^2\.(?!\$)/g, '$y = x^2$.')
      .replace(/Since (\d+) > 1\$,/g, 'Since $$$1 > 1$,')
      .replace(/The exact area is (\\frac\{[^\}]+\}\{[^\}]+\})\$\./g, 'The exact area is $$$1$$.')
      .replace(/The exact area is \$\$([^\$\n]+)\$\./g, 'The exact area is $$$1$$.')
      .replace(/The exact area is \$([^\$\n]+)\$\./g, 'The exact area is $$$1$$.');
  }

  const hints = (q.hints || []).map((h) => {
    return h
      .replace(/quantity (\d+x\^\{?\d+\}?)\$\./g, 'quantity $$$1$$.')
      .replace(/then (\d+ < x < \d+)\$\./g, 'then $$$1$$.');
  });

  let keyAnswer = q.keyAnswer || '';
  if (keyAnswer && !keyAnswer.includes('$')) {
    keyAnswer = `$${keyAnswer}$`;
  }

  return {
    ...q,
    solutionMath,
    hints,
    keyAnswer,
  };
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

export function formatFraction(num: number, den: number): string {
  if (den === 0) return 'undefined';
  if (num === 0) return '0';
  const sign = num * den < 0 ? '-' : '';
  const n = Math.abs(num);
  const d = Math.abs(den);
  const g = gcd(n, d);
  const rn = n / g;
  const rd = d / g;
  if (rd === 1) return `${sign}${rn}`;
  return `${sign}\\frac{${rn}}{${rd}}`;
}

export function formatSigned(n: number): string {
  if (n > 0) return `+ ${n}`;
  if (n < 0) return `- ${-n}`;
  return '';
}

export function formatPoly(coeffs: number[], variable = 'x'): string {
  const degree = coeffs.length - 1;
  let result = '';
  let isFirst = true;

  for (let i = 0; i <= degree; i++) {
    const c = coeffs[i];
    if (c === 0 && degree > 0) continue;

    const power = degree - i;
    const absC = Math.abs(c);
    const sign = c < 0 ? '-' : '+';

    let term = '';
    if (power === 0) {
      term = `${absC}`;
    } else if (power === 1) {
      term = absC === 1 ? variable : `${absC}${variable}`;
    } else {
      term = absC === 1 ? `${variable}^{${power}}` : `${absC}${variable}^{${power}}`;
    }

    if (isFirst) {
      result += c < 0 ? `-${term}` : term;
      isFirst = false;
    } else {
      result += ` ${sign} ${term}`;
    }
  }

  return result || '0';
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------------------------------------------------
// Question Generators
// -------------------------------------------------------------

interface QuestionTemplate {
  templateId: string;
  topicId: TopicId;
  topicName: string;
  difficulty: DifficultyLevel;
  generate: () => Omit<PracticeQuestion, 'id' | 'generatedAt'>;
}

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // 1. Limits - Foundational
  {
    templateId: 'limits-factor-00',
    topicId: 'limits',
    topicName: 'Limits & Continuity',
    difficulty: 'foundational',
    generate: () => {
      const r = randomChoice([-3, -2, -1, 1, 2, 3, 4, 5]);
      let s = randomChoice([-4, -3, -2, -1, 1, 2, 3, 4, 6]);
      if (s === r) s = r + 2;
      const c = randomChoice([1, 2, 3]);

      const polyCoeffs = [c, -c * (r + s), c * r * s];
      const numStr = formatPoly(polyCoeffs);
      const denomStr = r >= 0 ? `x - ${r}` : `x + ${-r}`;
      const answerVal = c * (r - s);

      return {
        templateId: 'limits-factor-00',
        topicId: 'limits',
        topicName: 'Limits & Continuity',
        difficulty: 'foundational',
        title: 'Evaluating Indeterminate 0/0 by Factorization',
        questionMath: `Evaluate the following limit analytically:\n\n$$\\lim_{x \\to ${r}} \\frac{${numStr}}{${denomStr}}$$\n\nIdentify why direct substitution fails and calculate the exact value.`,
        hints: [
          `Direct substitution gives $\\frac{0}{0}$, an indeterminate form. This indicates $(x - ${r})$ is a root of both the numerator and denominator.`,
          `Factor the numerator into $${c === 1 ? '' : c}(x - ${r})(x - ${s})$. For all $x \\neq ${r}$, you can cancel the common factor $(x - ${r})$.`,
        ],
        solutionMath: `1. **Indeterminate Form Check:** Direct substitution yields $\\frac{${formatPoly(polyCoeffs).replace(/x/g, `(${r})`)}}{${r} - ${r}} = \\frac{0}{0}$.\n\n2. **Factor Numerator:**\n$$${numStr} = ${c === 1 ? '' : c}(x ${formatSigned(-r)})(x ${formatSigned(-s)})$$\n\n3. **Cancel $(x - ${r})$ for $x \\neq ${r}$:**\n$$\\lim_{x \\to ${r}} \\frac{${c === 1 ? '' : c}(x ${formatSigned(-r)})(x ${formatSigned(-s)})}{${denomStr}} = \\lim_{x \\to ${r}} ${c === 1 ? '' : c}(x ${formatSigned(-s)})$$\n\n4. **Evaluate Limit by Continuity:**\n$$${c === 1 ? '' : c}(${r} ${formatSigned(-s)}) = ${answerVal}$$\n\nThe limit exists and equals $${answerVal}$.`,
        keyAnswer: `$${answerVal}$`,
      };
    },
  },

  // 2. Limits - Intermediate
  {
    templateId: 'limits-squeeze',
    topicId: 'limits',
    topicName: 'Limits & Continuity',
    difficulty: 'intermediate',
    generate: () => {
      const p = randomChoice([2, 4]);
      const k = randomChoice([2, 3, 5, 7]);
      const b = randomChoice([2, 3, 4, 6]);

      return {
        templateId: 'limits-squeeze',
        topicId: 'limits',
        topicName: 'Limits & Continuity',
        difficulty: 'intermediate',
        title: 'Squeeze Theorem on Oscillatory Discontinuities',
        questionMath: `Evaluate the limit and prove your conclusion using the Squeeze Theorem:\n\n$$\\lim_{x \\to 0} ${k}x^{${p}} \\cos\\left(\\frac{${b}}{x}\\right)$$`,
        hints: [
          `Note that as $x \\to 0$, the argument $\\frac{${b}}{x} \\to \\pm\\infty$, so $\\cos(b/x)$ oscillates infinitely between $-1$ and $1$. The limit of the cosine term alone does not exist.`,
          `Use the inequality $-1 \\le \\cos(u) \\le 1$ for all real $u$. Multiply every side of the inequality by the non-negative quantity $${k}x^{${p}}$.`,
        ],
        solutionMath: `1. **Establish Universal Bound:**\nFor all $x \\neq 0$, the cosine function is bounded:\n$$-1 \\le \\cos\\left(\\frac{${b}}{x}\\right) \\le 1$$\n\n2. **Multiply by Strictly Positive Term:**\nSince $x^{${p}} > 0$ for all $x \\neq 0$ and $k = ${k} > 0$:\n$$-${k}x^{${p}} \\le ${k}x^{${p}} \\cos\\left(\\frac{${b}}{x}\\right) \\le ${k}x^{${p}}$$\n\n3. **Calculate Outer Limits:**\n$$\\lim_{x \\to 0} (-${k}x^{${p}}) = 0 \\quad \\text{and} \\quad \\lim_{x \\to 0} (${k}x^{${p}}) = 0$$\n\n4. **Apply Squeeze Theorem:**\nSince the bounding functions both converge to $0$, the inner function must also converge to $0$:\n$$\\lim_{x \\to 0} ${k}x^{${p}} \\cos\\left(\\frac{${b}}{x}\\right) = 0$$`,
        keyAnswer: '$0$',
      };
    },
  },

  // 3. Limits - Advanced
  {
    templateId: 'limits-epsilon-delta',
    topicId: 'limits',
    topicName: 'Limits & Continuity',
    difficulty: 'advanced',
    generate: () => {
      const c = randomChoice([2, 3, 4]);
      const a = randomChoice([2, 3, 4]);
      const d = randomChoice([-3, -1, 1, 3, 5]);
      const L = c * a * a + d;
      const M = c * (2 * a + 1);

      return {
        templateId: 'limits-epsilon-delta',
        topicId: 'limits',
        topicName: 'Limits & Continuity',
        difficulty: 'advanced',
        title: 'Formal Epsilon-Delta Limit Proof',
        questionMath: `Use the formal $\\varepsilon$-$\\delta$ definition of a limit to prove that:\n\n$$\\lim_{x \\to ${a}} (${c}x^2 ${formatSigned(d)}) = ${L}$$\n\nProvide preliminary bounding analysis, explicitly construct $\\delta(\\varepsilon) > 0$, and write the deduction.`,
        hints: [
          `Express the error term: $|f(x) - L| = |(${c}x^2 ${formatSigned(d)}) - ${L}| = ${c}|x^2 - ${a * a}| = ${c}|x + ${a}||x - ${a}|$.`,
          `Place an initial constraint on $\\delta$, such as $\\delta_1 \\le 1$. If $|x - ${a}| < 1$, then $${a - 1} < x < ${a + 1}$. Bound the factor $|x + ${a}|$ on this interval.`,
        ],
        solutionMath: `1. **Preliminary Factorization:**\n$$|f(x) - L| = |(${c}x^2 ${formatSigned(d)}) - ${L}| = ${c}|x^2 - ${a * a}| = ${c}|x + ${a}| \\cdot |x - ${a}|$$\n\n2. **Bound the Variable Factor:**\nImpose the initial restriction $\\delta_1 \\le 1$. Whenever $|x - ${a}| < 1$:\n$$-1 < x - ${a} < 1 \\implies ${2 * a - 1} < x + ${a} < ${2 * a + 1}$$\nTherefore, $|x + ${a}| < ${2 * a + 1}$, which implies:\n$$|f(x) - L| < ${c} \\cdot ${2 * a + 1} \\cdot |x - ${a}| = ${M}|x - ${a}|$$\n\n3. **Choice of $\\delta$:**\nFor any $\\varepsilon > 0$, choose:\n$$\\delta = \\min\\left(1, \\frac{\\varepsilon}{${M}}\\right)$$\n\n4. **Formal Synthesis:**\nAssume $0 < |x - ${a}| < \\delta$. Since $\\delta \\le 1$, we have $|x + ${a}| < ${2 * a + 1}$. Since $\\delta \\le \\frac{\\varepsilon}{${M}}$, we have $|x - ${a}| < \\frac{\\varepsilon}{${M}}$.\nHence:\n$$|f(x) - L| = ${c}|x + ${a}||x - ${a}| < ${M} \\cdot \\frac{\\varepsilon}{${M}} = \\varepsilon$$\nThis verifies $\\forall \\varepsilon > 0, \\exists \\delta > 0$ such that $0 < |x - ${a}| < \\delta \\implies |f(x) - L| < \\varepsilon$.`,
        keyAnswer: `$\\delta = \\min\\left(1, \\frac{\\varepsilon}{${M}}\\right)$`,
      };
    },
  },

  // 4. Derivatives - Foundational
  {
    templateId: 'deriv-tangent-line',
    topicId: 'derivatives',
    topicName: 'Derivatives & Applications',
    difficulty: 'foundational',
    generate: () => {
      const a = randomChoice([1, 2, -1, -2]);
      const b = randomChoice([-3, -2, -1, 1, 2, 3]);
      const c = randomChoice([-4, -2, 1, 3, 5]);
      const x0 = randomChoice([-2, -1, 1, 2, 3]);

      const y0 = a * x0 * x0 + b * x0 + c;
      const m = 2 * a * x0 + b;
      const k = y0 - m * x0;

      const polyStr = formatPoly([a, b, c]);

      return {
        templateId: 'deriv-tangent-line',
        topicId: 'derivatives',
        topicName: 'Derivatives & Applications',
        difficulty: 'foundational',
        title: 'Tangent Line to a Parabola',
        questionMath: `Find the exact equation of the tangent line to the curve $f(x) = ${polyStr}$ at the point where $x = ${x0}$. Write your answer in slope-intercept form $y = mx + b$.`,
        hints: [
          `Find the derivative function $f'(x)$ using the power rule. The slope of the tangent line is $m = f'(${x0})$.`,
          `Calculate the $y$-coordinate of the contact point: $y_0 = f(${x0})$. Then substitute into the point-slope form $y - y_0 = m(x - x_0)$ and solve for $y$.`,
        ],
        solutionMath: `1. **Compute Derivative (Slope Function):**\n$$f'(x) = ${2 * a === 1 ? '' : 2 * a === -1 ? '-' : 2 * a}x ${formatSigned(b)}$$\n\n2. **Evaluate Slope at $x = ${x0}$:**\n$$m = f'(${x0}) = ${2 * a}(${x0}) ${formatSigned(b)} = ${m}$$\n\n3. **Find the Contact Point $(x_0, y_0)$:**\n$$y_0 = f(${x0}) = ${a}(${x0})^2 ${formatSigned(b)}(${x0}) ${formatSigned(c)} = ${y0}$$\nSo the tangent touches the curve at $(${x0}, ${y0})$.\n\n4. **Formulate Line Equation:**\n$$y - (${y0}) = ${m}(x - (${x0}))$$\n$$y = ${m}x ${formatSigned(k)}$$`,
        keyAnswer: `$y = ${m}x ${formatSigned(k)}$`,
      };
    },
  },

  // 5. Derivatives - Intermediate
  {
    templateId: 'deriv-mvt-point',
    topicId: 'derivatives',
    topicName: 'Derivatives & Applications',
    difficulty: 'intermediate',
    generate: () => {
      const a = randomChoice([-3, -2, -1, 0, 1]);
      let b = randomChoice([2, 3, 4, 5]);
      if ((a + b) % 2 !== 0) b += 1; // ensure (a + b) is even so c is an integer
      const k = randomChoice([1, 2, 3]);
      const d = randomChoice([-2, 0, 1, 3]);
      const e = randomChoice([-3, 0, 2]);

      const c = (a + b) / 2;
      const fa = k * a * a + d * a + e;
      const fb = k * b * b + d * b + e;
      const secantSlope = (fb - fa) / (b - a);

      return {
        templateId: 'deriv-mvt-point',
        topicId: 'derivatives',
        topicName: 'Derivatives & Applications',
        difficulty: 'intermediate',
        title: 'Mean Value Theorem: Finding Intermediate Value c',
        questionMath: `Consider the function $f(x) = ${formatPoly([k, d, e])}$ on the closed interval $[${a}, ${b}]$.\n\n1. Verify that $f$ satisfies the hypotheses of the Mean Value Theorem on $[${a}, ${b}]$.\n2. Find the exact point $c \\in (${a}, ${b})$ such that $f'(c) = \\frac{f(${b}) - f(${a})}{${b} - (${a})}$.`,
        hints: [
          `Recall the MVT hypotheses: $f$ must be continuous on $[${a}, ${b}]$ and differentiable on $(${a}, ${b})$. Why do all polynomial functions satisfy this?`,
          `Calculate the secant slope $\\frac{f(${b}) - f(${a})}{${b - a}}$. Set it equal to $f'(c) = ${2 * k}c ${formatSigned(d)}$ and solve for $c$.`,
        ],
        solutionMath: `1. **Verify Hypotheses:**\n- $f$ is a polynomial, so it is continuous on $[${a}, ${b}]$.\n- $f$ is differentiable on $(${a}, ${b})$ with derivative $f'(x) = ${2 * k}x ${formatSigned(d)}$.\nBoth hypotheses of the Mean Value Theorem are satisfied.\n\n2. **Compute Average Rate of Change:**\n$$f(${a}) = ${fa}, \\quad f(${b}) = ${fb}$$\n$$\\frac{f(${b}) - f(${a})}{${b} - (${a})} = \\frac{${fb - fa}}{${b - a}} = ${secantSlope}$$\n\n3. **Solve for $c$:**\n$$f'(c) = ${2 * k}c ${formatSigned(d)} = ${secantSlope}$$\n$$${2 * k}c = ${secantSlope - d} \\implies c = ${c}$$\n\nNotice that ${a} < ${c} < ${b}, so $c = ${c} \\in (${a}, ${b})$ as guaranteed.`,
        keyAnswer: `$c = ${c}$`,
      };
    },
  },

  // 6. Derivatives - Advanced
  {
    templateId: 'deriv-smooth-piecewise',
    topicId: 'derivatives',
    topicName: 'Derivatives & Applications',
    difficulty: 'advanced',
    generate: () => {
      const a = randomChoice([1, 2, 3]);
      const b = randomChoice([1, 3, 5]);
      const x0 = randomChoice([1, 2, 3]);

      const m = 2 * a * x0;
      const k = b - a * x0 * x0;

      return {
        templateId: 'deriv-smooth-piecewise',
        topicId: 'derivatives',
        topicName: 'Derivatives & Applications',
        difficulty: 'advanced',
        title: 'Smooth Splice: Differentiability of Piecewise Functions',
        questionMath: `Determine the exact values of constants $m$ and $k$ that make the function $f(x)$ differentiable at $x = ${x0}$:\n\n$$f(x) = \\begin{cases} ${a === 1 ? '' : a}x^2 ${formatSigned(b)} & \\text{if } x \\le ${x0} \\\\ mx + k & \\text{if } x > ${x0} \\end{cases}$$`,
        hints: [
          `Differentiability at $x_0$ strictly requires continuity at $x_0$. Ensure $\\lim_{x \\to ${x0}^-} f(x) = \\lim_{x \\to ${x0}^+} f(x)$.`,
          `Next, equate the left-hand derivative $\\lim_{h \\to 0^-} \\frac{f(${x0}+h)-f(${x0})}{h}$ with the right-hand derivative $\\lim_{h \\to 0^+} \\frac{f(${x0}+h)-f(${x0})}{h}$.`,
        ],
        solutionMath: `1. **Continuity at $x = ${x0}$:**\n$$\\lim_{x \\to ${x0}^-} f(x) = ${a}(${x0})^2 ${formatSigned(b)} = ${a * x0 * x0 + b}$$\n$$\\lim_{x \\to ${x0}^+} f(x) = m(${x0}) + k$$\nFor continuity, we must have:\n$$${x0}m + k = ${a * x0 * x0 + b} \\quad \\text{--- (Eq. 1)}$$\n\n2. **Differentiability at $x = ${x0}$:**\nThe left-hand derivative is:\n$$f'_-( ${x0} ) = 2(${a})(${x0}) = ${m}$$\nThe right-hand derivative is:\n$$f'_+( ${x0} ) = m$$\nEquating $f'_-( ${x0} ) = f'_+( ${x0} )$ gives:\n$$m = ${m}$$\n\n3. **Solve for $k$:**\nSubstitute $m = ${m}$ into Eq. 1:\n$$${x0}(${m}) + k = ${a * x0 * x0 + b} \\implies ${x0 * m} + k = ${a * x0 * x0 + b}$$\n$$k = ${a * x0 * x0 + b} - ${x0 * m} = ${k}$$\n\nHence, $m = ${m}$ and $k = ${k}$.`,
        keyAnswer: `$m = ${m}, \\quad k = ${k}$`,
      };
    },
  },

  // 7. Integrals - Foundational
  {
    templateId: 'integral-ftc-definite',
    topicId: 'integrals',
    topicName: 'Integration & Accumulation',
    difficulty: 'foundational',
    generate: () => {
      const c = randomChoice([3, 6]);
      const d = randomChoice([2, 4, 6]);
      const e = randomChoice([1, 2, 3]);
      const a = randomChoice([0, 1]);
      const b = randomChoice([2, 3]);

      // F(x) = (c/3)x^3 + (d/2)x^2 + ex
      const F = (x: number) => (c / 3) * x * x * x + (d / 2) * x * x + e * x;
      const answerVal = F(b) - F(a);

      const polyStr = formatPoly([c, d, e]);

      return {
        templateId: 'integral-ftc-definite',
        topicId: 'integrals',
        topicName: 'Integration & Accumulation',
        difficulty: 'foundational',
        title: 'Definite Integral via Fundamental Theorem of Calculus',
        questionMath: `Evaluate the definite integral using the Fundamental Theorem of Calculus:\n\n$$\\int_{${a}}^{${b}} (${polyStr})\\,dx$$`,
        hints: [
          `Find an antiderivative $F(x)$ such that $F'(x) = ${polyStr}$. Use the power rule for integration: $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}$.`,
          `According to FTC Part 2, $\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$. Compute $F(${b}) - F(${a})$.`,
        ],
        solutionMath: `1. **Determine the Antiderivative:**\n$$F(x) = \\int (${polyStr})\\,dx = \\frac{${c}}{3}x^3 + \\frac{${d}}{2}x^2 + ${e}x = ${c / 3 === 1 ? '' : c / 3}x^3 + ${d / 2 === 1 ? '' : d / 2}x^2 + ${e}x$$\n\n2. **Apply Fundamental Theorem of Calculus:**\n$$\\int_{${a}}^{${b}} (${polyStr})\\,dx = \\left[ ${c / 3 === 1 ? '' : c / 3}x^3 + ${d / 2 === 1 ? '' : d / 2}x^2 + ${e}x \\right]_{${a}}^{${b}}$$\n\n3. **Evaluate at Boundaries:**\n$$F(${b}) = ${c / 3}(${b})^3 + ${d / 2}(${b})^2 + ${e}(${b}) = ${F(b)}$$\n$$F(${a}) = ${c / 3}(${a})^3 + ${d / 2}(${a})^2 + ${e}(${a}) = ${F(a)}$$\n$$F(${b}) - F(${a}) = ${F(b)} - ${F(a)} = ${answerVal}$$\n\nThe value of the integral is $${answerVal}$.`,
        keyAnswer: `$${answerVal}$`,
      };
    },
  },

  // 8. Integrals - Intermediate
  {
    templateId: 'integral-area-curves',
    topicId: 'integrals',
    topicName: 'Integration & Accumulation',
    difficulty: 'intermediate',
    generate: () => {
      const a = randomChoice([2, 3, 4, 5]);
      // Intersections: x = 0, x = a.
      // Area = int_0^a (ax - x^2) dx = [a x^2 / 2 - x^3 / 3]_0^a = a^3 / 6.
      const num = a * a * a;
      const den = 6;
      const fracStr = formatFraction(num, den);

      return {
        templateId: 'integral-area-curves',
        topicId: 'integrals',
        topicName: 'Integration & Accumulation',
        difficulty: 'intermediate',
        title: 'Area Enclosed Between Two Curves',
        questionMath: `Compute the exact area of the planar region bounded between the line $y = ${a}x$ and the parabola $y = x^2$.`,
        hints: [
          `Find the $x$-coordinates of the intersection points by solving $x^2 = ${a}x$.`,
          `Determine which curve lies above the other on the interval between the intersection points. Set up the integral $\\int_{x_1}^{x_2} (y_{\\text{top}} - y_{\\text{bottom}})\\,dx$.`,
        ],
        solutionMath: `1. **Find Intersection Points:**\n$$x^2 = ${a}x \\implies x(x - ${a}) = 0 \\implies x = 0 \\quad \\text{and} \\quad x = ${a}$$\n\n2. **Identify Upper and Lower Curves:**\nFor any test point in $(0, ${a})$, such as $x = 1$, we have $y = ${a}(1) = ${a}$ and $y = 1^2 = 1$. Since $${a} > 1$, the line $y = ${a}x$ is above the parabola $y = x^2$.\n\n3. **Set Up Area Integral:**\n$$A = \\int_0^{${a}} (${a}x - x^2)\\,dx$$\n\n4. **Evaluate Antiderivative:**\n$$A = \\left[ \\frac{${a}}{2}x^2 - \\frac{x^3}{3} \\right]_0^{${a}} = \\left( \\frac{${a}}{2}(${a})^2 - \\frac{(${a})^3}{3} \\right) - 0$$\n$$A = \\frac{${a}^3}{2} - \\frac{${a}^3}{3} = \\frac{${num}}{6} = ${fracStr}$$\n\nThe exact area is $${fracStr}$.`,
        keyAnswer: `$${fracStr}$`,
      };
    },
  },

  // 9. Integrals - Advanced
  {
    templateId: 'integral-darboux-riemann',
    topicId: 'integrals',
    topicName: 'Integration & Accumulation',
    difficulty: 'advanced',
    generate: () => {
      const k = randomChoice([3, 6]);
      const b = randomChoice([1, 2, 3]);
      const limitVal = (k * b * b * b) / 3;

      return {
        templateId: 'integral-darboux-riemann',
        topicId: 'integrals',
        topicName: 'Integration & Accumulation',
        difficulty: 'advanced',
        title: 'Upper Darboux Partition Limit from First Principles',
        questionMath: `For the function $f(x) = ${k === 1 ? '' : k}x^2$ on the interval $[0, ${b}]$, consider a uniform partition $P_n$ dividing $[0, ${b}]$ into $n$ equal subintervals.\n\n1. Formulate the upper Darboux sum $U(f, P_n)$ using the sum of squares formula $\\sum_{i=1}^n i^2 = \\frac{n(n+1)(2n+1)}{6}$.\n2. Evaluate $\\lim_{n \\to \\infty} U(f, P_n)$ and verify that it matches $\\int_0^{${b}} ${k === 1 ? '' : k}x^2\\,dx$.`,
        hints: [
          `For uniform subintervals, the width of each subinterval is $\\Delta x = \\frac{${b}}{n}$. The grid points are $x_i = \\frac{${b}i}{n}$.`,
          `Since $f(x) = ${k === 1 ? '' : k}x^2$ is increasing on $[0, ${b}]$, the supremum $M_i$ on $[x_{i-1}, x_i]$ occurs at the right endpoint $x_i$.`,
        ],
        solutionMath: `1. **Partition Specification:**\nSubinterval width: $\\Delta x_i = \\frac{${b}}{n}$. Right endpoints: $x_i = \\frac{${b}i}{n}$ for $i = 1, \\dots, n$.\nSince $f$ is strictly increasing on $[0, ${b}]$, the supremum on the $i$-th subinterval is:\n$$M_i = \\sup_{x \\in [x_{i-1}, x_i]} f(x) = f(x_i) = ${k}\\left(\\frac{${b}i}{n}\\right)^2 = \\frac{${k * b * b}i^2}{n^2}$$\n\n2. **Express Upper Sum:**\n$$U(f, P_n) = \\sum_{i=1}^n M_i \\Delta x_i = \\sum_{i=1}^n \\left( \\frac{${k * b * b}i^2}{n^2} \\right) \\left( \\frac{${b}}{n} \\right) = \\frac{${k * b * b * b}}{n^3} \\sum_{i=1}^n i^2$$\nSubstitute $\\sum_{i=1}^n i^2 = \\frac{n(n+1)(2n+1)}{6}$:\n$$U(f, P_n) = \\frac{${k * b * b * b}}{n^3} \\cdot \\frac{n(n+1)(2n+1)}{6} = \\frac{${k * b * b * b}}{6} \\cdot \\frac{2n^3 + 3n^2 + n}{n^3}$$\n\n3. **Compute Limit as $n \\to \\infty$:**\n$$\\lim_{n \\to \\infty} U(f, P_n) = \\frac{${k * b * b * b}}{6} \\cdot 2 = \\frac{${k * b * b * b}}{3} = ${limitVal}$$\n\n4. **Verification via FTC:**\n$$\\int_0^{${b}} ${k}x^2\\,dx = \\left[ \\frac{${k}}{3}x^3 \\right]_0^{${b}} = \\frac{${k}}{3}(${b})^3 = ${limitVal}$$\nThe partition limit matches the exact definite integral.`,
        keyAnswer: `$${limitVal}$`,
      };
    },
  },

  // 10. Approximations - Foundational
  {
    templateId: 'approx-linear-differential',
    topicId: 'approximations',
    topicName: 'Series & Approximations',
    difficulty: 'foundational',
    generate: () => {
      const a = randomChoice([3, 4, 5, 6]);
      const k = randomChoice([-2, -1, 1, 2]);
      const x0 = a * a;
      const xTarget = x0 + k;

      // L(x) = f(x0) + f'(x0)(x - x0) = a + (1 / (2a)) * k = (2a^2 + k) / (2a)
      const num = 2 * x0 + k;
      const den = 2 * a;
      const fracStr = formatFraction(num, den);
      const decStr = (num / den).toFixed(4);

      return {
        templateId: 'approx-linear-differential',
        topicId: 'approximations',
        topicName: 'Series & Approximations',
        difficulty: 'foundational',
        title: 'Linear Approximation (Differentials) of Radicals',
        questionMath: `Use the linear approximation (tangent line) of $f(x) = \\sqrt{x}$ centered at the base point $x_0 = ${x0}$ to estimate $\\sqrt{${xTarget}}$ without a calculator. Express your result as an exact fraction.`,
        hints: [
          `Recall the linearization formula: $L(x) = f(x_0) + f'(x_0)(x - x_0)$.`,
          `Differentiate $f(x) = x^{1/2}$ to get $f'(x) = \\frac{1}{2\\sqrt{x}}$. Evaluate $f(${x0})$ and $f'(${x0})$, then substitute $x = ${xTarget}$.`,
        ],
        solutionMath: `1. **Calculate Value and Derivative at Base Point:**\n$$f(${x0}) = \\sqrt{${x0}} = ${a}$$\n$$f'(x) = \\frac{1}{2\\sqrt{x}} \\implies f'(${x0}) = \\frac{1}{2\\sqrt{${x0}}} = \\frac{1}{${2 * a}}$$\n\n2. **Form Linearization Equation:**\n$$L(x) = f(${x0}) + f'(${x0})(x - ${x0}) = ${a} + \\frac{1}{${2 * a}}(x - ${x0})$$\n\n3. **Evaluate at $x = ${xTarget}$:**\n$$L(${xTarget}) = ${a} + \\frac{1}{${2 * a}}(${xTarget} - ${x0}) = ${a} + \\frac{${k}}{${2 * a}} = \\frac{${2 * a * a} ${formatSigned(k)}}{${2 * a}} = ${fracStr} \\approx ${decStr}$$\n\n(For comparison, the true calculator value of $\\sqrt{${xTarget}}$ is $\\approx ${(Math.sqrt(xTarget)).toFixed(4)}$.)`,
        keyAnswer: `$${fracStr}$`,
      };
    },
  },

  // 11. Approximations - Intermediate
  {
    templateId: 'approx-taylor-poly',
    topicId: 'approximations',
    topicName: 'Series & Approximations',
    difficulty: 'intermediate',
    generate: () => {
      const k = randomChoice([-2, -1, 2, 3]);

      // f(x) = e^{kx}
      // T_3(x) = 1 + kx + (k^2/2)x^2 + (k^3/6)x^3
      const c1Str = k === 1 ? 'x' : k === -1 ? '-x' : `${k}x`;
      const c2Frac = formatFraction(k * k, 2);
      const c3Frac = formatFraction(k * k * k, 6);

      const sign2 = k * k > 0 ? '+' : '-';
      const sign3 = k * k * k > 0 ? '+' : '-';

      return {
        templateId: 'approx-taylor-poly',
        topicId: 'approximations',
        topicName: 'Series & Approximations',
        difficulty: 'intermediate',
        title: 'Maclaurin Polynomial Construction',
        questionMath: `Construct the 3rd-degree Maclaurin polynomial $T_3(x)$ for the function $f(x) = e^{${k === 1 ? '' : k === -1 ? '-' : k}x}$ centered at $x = 0$.`,
        hints: [
          `Recall the Maclaurin polynomial formula: $T_3(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\frac{f'''(0)}{3!}x^3$.`,
          `Compute successive derivatives: each derivative of $e^{kx}$ multiplies the expression by $k$.`,
        ],
        solutionMath: `1. **Compute Successive Derivatives:**\n- $f(x) = e^{${k === 1 ? '' : k === -1 ? '-' : k}x} \\implies f(0) = 1$\n- $f'(x) = ${k}e^{${k === 1 ? '' : k === -1 ? '-' : k}x} \\implies f'(0) = ${k}$\n- $f''(x) = ${k * k}e^{${k === 1 ? '' : k === -1 ? '-' : k}x} \\implies f''(0) = ${k * k}$\n- $f'''(x) = ${k * k * k}e^{${k === 1 ? '' : k === -1 ? '-' : k}x} \\implies f'''(0) = ${k * k * k}$\n\n2. **Assemble Taylor Coefficients:**\n- $c_0 = \\frac{1}{0!} = 1$\n- $c_1 = \\frac{${k}}{1!} = ${k}$\n- $c_2 = \\frac{${k * k}}{2!} = ${c2Frac}$\n- $c_3 = \\frac{${k * k * k}}{3!} = \\frac{${k * k * k}}{6} = ${c3Frac}$\n\n3. **Synthesize Polynomial:**\n$$T_3(x) = 1 ${k > 0 ? `+ ${c1Str}` : `- ${c1Str.replace('-', '')}`} + ${c2Frac}x^2 ${k > 0 ? `+ ${c3Frac}` : `- ${c3Frac.replace('-', '')}`}x^3$$`,
        keyAnswer: `$T_3(x) = 1 ${k > 0 ? `+ ${c1Str}` : `- ${c1Str.replace('-', '')}`} + ${c2Frac}x^2 ${k > 0 ? `+ ${c3Frac}` : `- ${c3Frac.replace('-', '')}`}x^3$`,
      };
    },
  },

  // 12. Approximations - Advanced
  {
    templateId: 'approx-lagrange-bound',
    topicId: 'approximations',
    topicName: 'Series & Approximations',
    difficulty: 'advanced',
    generate: () => {
      const d = randomChoice([0.2, 0.4, 0.5, 0.6]);
      // f(x) = cos(x), T_2(x) = 1 - x^2/2.
      // R_2(x) = f'''(c) / 3! * x^3 = sin(c) / 6 * x^3
      // Since |sin(c)| <= 1, max error on [-d, d] <= d^3 / 6.
      const boundVal = (Math.pow(d, 3) / 6).toFixed(6);

      return {
        templateId: 'approx-lagrange-bound',
        topicId: 'approximations',
        topicName: 'Series & Approximations',
        difficulty: 'advanced',
        title: 'Lagrange Error Remainder Bound for Taylor Series',
        questionMath: `Consider the quadratic approximation $\\cos(x) \\approx 1 - \\frac{x^2}{2}$ on the interval $[-${d}, ${d}]$.\n\nUsing Taylor's Theorem with the Lagrange form of the remainder, find a rigorous upper bound on the absolute approximation error:\n\n$$\\max_{x \\in [-${d}, ${d}]} \\left| \\cos(x) - \\left( 1 - \\frac{x^2}{2} \\right) \\right|$$`,
        hints: [
          `Taylor's theorem states that $f(x) - T_2(x) = R_2(x) = \\frac{f^{(3)}(c)}{3!} x^3$ for some point $c$ strictly between $0$ and $x$.`,
          `Calculate the 3rd derivative of $\\cos(x)$. Bound $|f^{(3)}(c)|$ across the interval by its theoretical supremum, and bound $|x|^3$ by $(${d})^3$.`,
        ],
        solutionMath: `1. **Taylor Remainder Formula:**\nFor $f(x) = \\cos(x)$ expanded around $0$, the 2nd-degree Taylor polynomial is $T_2(x) = 1 - \\frac{x^2}{2}$. The remainder term is:\n$$R_2(x) = \\frac{f^{(3)}(c)}{3!} x^3 = \\frac{\\sin(c)}{6} x^3$$\nfor some $c$ strictly between $0$ and $x$.\n\n2. **Bound the Derivative Factor:**\nFor any real $c$, $|\\sin(c)| \\le 1$.\n\n3. **Bound the Interval Factor:**\nFor any $x \\in [-${d}, ${d}]$, we have $|x| \\le ${d} \\implies |x|^3 \\le (${d})^3 = ${Math.pow(d, 3).toFixed(4)}$.\n\n4. **Compute Error Bound:**\n$$|R_2(x)| = \\frac{|\\sin(c)|}{6} |x|^3 \\le \\frac{1}{6} (${d})^3 = \\frac{${Math.pow(d, 3).toFixed(4)}}{6} \\approx ${boundVal}$$\n\nThus, the approximation error never exceeds $${boundVal}$ anywhere on $[-${d}, ${d}]$.`,
        keyAnswer: `$\\le \\frac{(${d})^3}{6} \\approx ${boundVal}$`,
      };
    },
  },
];

export function generateQuestion(topicId?: TopicId | 'all', difficulty?: DifficultyLevel | 'all'): PracticeQuestion {
  let candidates = QUESTION_TEMPLATES;

  if (topicId && topicId !== 'all') {
    candidates = candidates.filter((t) => t.topicId === topicId);
  }

  if (difficulty && difficulty !== 'all') {
    candidates = candidates.filter((t) => t.difficulty === difficulty);
  }

  if (candidates.length === 0) {
    // Fallback if combination has no direct match
    candidates = QUESTION_TEMPLATES;
  }

  const selectedTemplate = randomChoice(candidates);
  const base = selectedTemplate.generate();

  return {
    ...base,
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    generatedAt: new Date().toISOString(),
  };
}
