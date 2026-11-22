export type CalculusTopicId = 'limits' | 'derivatives' | 'integrals' | 'approximations';
export type DatabaseTopicId = 'relational-algebra' | 'functional-dependencies' | 'query-cost' | 'transactions-concurrency' | 'recovery-logging';
export type ArchitectureTopicId = 'representation' | 'pipeline-hazards' | 'cache-amat' | 'instruction-datapath';
export type OperatingSystemsTopicId = 'cpu-scheduling' | 'virtual-memory' | 'concurrency-deadlock' | 'storage-filesystems';

export type TopicId = CalculusTopicId | DatabaseTopicId | ArchitectureTopicId | OperatingSystemsTopicId | string;
export type DifficultyLevel = 'foundational' | 'intermediate' | 'advanced';

export interface CourseTopic {
  id: string;
  name: string;
}

export function getCourseTopics(courseId?: string): CourseTopic[] {
  switch (courseId) {
    case 'database-systems':
      return [
        { id: 'relational-algebra', name: 'Relational Algebra' },
        { id: 'functional-dependencies', name: 'Functional Dependencies & Normalization' },
        { id: 'query-cost', name: 'Query Optimization & Cost Models' },
        { id: 'transactions-concurrency', name: 'Transactions & Concurrency Control' },
        { id: 'recovery-logging', name: 'Crash Recovery & Logging' },
      ];
    case 'computer-architecture':
      return [
        { id: 'representation', name: 'Digital Representation' },
        { id: 'pipeline-hazards', name: 'Pipelining & Hazards' },
        { id: 'cache-amat', name: 'Cache Hierarchies & AMAT' },
        { id: 'instruction-datapath', name: 'Instruction Set Architecture & Datapath' },
      ];
    case 'operating-systems':
      return [
        { id: 'cpu-scheduling', name: 'CPU Scheduling' },
        { id: 'virtual-memory', name: 'Virtual Memory & Page Tables' },
        { id: 'concurrency-deadlock', name: 'Concurrency & Deadlock' },
        { id: 'storage-filesystems', name: 'Storage & File Systems' },
      ];
    case 'calculus-intro':
    default:
      return [
        { id: 'limits', name: 'Limits & Continuity' },
        { id: 'derivatives', name: 'Derivatives & Applications' },
        { id: 'integrals', name: 'Integration & Accumulation' },
        { id: 'approximations', name: 'Series & Approximations' },
      ];
  }
}

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
  courseId?: string;
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

  // =============================================================
  // Database Systems Templates
  // =============================================================
  {
    templateId: 'db-fd-closure',
    courseId: 'database-systems',
    topicId: 'functional-dependencies',
    topicName: 'Functional Dependencies & Normalization',
    difficulty: 'intermediate',
    generate: () => {
      return {
        templateId: 'db-fd-closure',
        topicId: 'functional-dependencies',
        topicName: 'Functional Dependencies & Normalization',
        difficulty: 'intermediate',
        title: 'Attribute Closure and Candidate Key Derivation',
        questionMath: `Consider a relation schema $R(A, B, C, D, E)$ governed by the set of functional dependencies $\\mathcal{F}$:\n\n$$\\mathcal{F} = \\{ A \\to B, \\; BC \\to D, \\; D \\to E \\}$$\n\nCompute the attribute closure $\\{A, C\\}^+$ with respect to $\\mathcal{F}$, and determine whether the attribute set $\\{A, C\\}$ forms a superkey for $R$.`,
        hints: [
          `Begin with the base closure set $X^{(0)} = \\{A, C\\}$.`,
          `Iteratively search for dependencies $Y \\to Z \\in \\mathcal{F}$ where $Y \\subseteq X^{(i)}$, and augment the set with $Z$: $X^{(i+1)} = X^{(i)} \\cup Z$ until reaching a fixed point.`,
        ],
        solutionMath: `1. **Initialization:**\n$$X^{(0)} = \\{A, C\\}$$\n\n2. **Iteration 1:**\nExamine functional dependencies in $\\mathcal{F}$:\n- $A \\to B$: The left-hand side $\\{A\\} \\subseteq X^{(0)}$, so add $B$:\n$$X^{(1)} = \\{A, C\\} \\cup \\{B\\} = \\{A, B, C\\}$$\n\n3. **Iteration 2:**\n- $BC \\to D$: The left-hand side $\\{B, C\\} \\subseteq X^{(1)}$, so add $D$:\n$$X^{(2)} = \\{A, B, C\\} \\cup \\{D\\} = \\{A, B, C, D\\}$$\n\n4. **Iteration 3:**\n- $D \\to E$: The left-hand side $\\{D\\} \\subseteq X^{(2)}$, so add $E$:\n$$X^{(3)} = \\{A, B, C, D\\} \\cup \\{E\\} = \\{A, B, C, D, E\\}$$\n\n5. **Fixed Point & Superkey Verification:**\nNo further functional dependencies can expand $X^{(3)}$. Thus, $\\{A, C\\}^+ = \\{A, B, C, D, E\\}$. Because the closure contains all attributes of $R$, $\\{A, C\\}$ is a superkey. Furthermore, neither $\\{A\\}^+ = \\{A, B\\}$ nor $\\{C\\}^+ = \\{C\\}$ contains all attributes, proving that $\\{A, C\\}$ is a minimal superkey (candidate key).`,
        keyAnswer: `$\\{A, C\\}^+ = \\{A, B, C, D, E\\}$`,
      };
    },
  },

  {
    templateId: 'db-query-cost-selectivity',
    courseId: 'database-systems',
    topicId: 'query-cost',
    topicName: 'Query Optimization & Cost Models',
    difficulty: 'intermediate',
    generate: () => {
      const B = randomChoice([1000, 2000, 4000, 5000]);
      const N = B * 50;
      const h = randomChoice([3, 4]);
      const sStar = ((B - h) / N).toFixed(4);
      const sPercent = (parseFloat(sStar) * 100).toFixed(2);

      return {
        templateId: 'db-query-cost-selectivity',
        topicId: 'query-cost',
        topicName: 'Query Optimization & Cost Models',
        difficulty: 'intermediate',
        title: 'Index Scan vs. Sequential Scan I/O Cost Model',
        questionMath: `A database table contains $N = ${N}$ tuples stored across $B = ${B}$ disk pages (50 tuples per page). An unclustered $\\text{B}^+$ tree index of height $h = ${h}$ indexes the search key.\n\nUnder an unclustered index scan, each matching tuple incurs approximately one random page I/O after traversing the tree: $\\text{Cost}_{\\text{idx}}(s) = h + s \\cdot N$.\nA full sequential scan reads all table pages sequentially: $\\text{Cost}_{\\text{scan}} = B$.\n\nCalculate the crossover selectivity $s^*$ below which the index scan performs fewer page I/Os than the sequential table scan.`,
        hints: [
          `Equate the index scan cost to the sequential scan cost: $h + s^* \\cdot N = B$.`,
          `Solve algebraically for $s^* = \\frac{B - h}{N}$.`,
        ],
        solutionMath: `1. **Cost Formulations:**\n- Sequential Table Scan: reads all table pages directly:\n$$\\text{Cost}_{\\text{scan}} = B = ${B} \\text{ page I/Os}$$\n- Unclustered Index Scan: traverses $h$ index levels then reads each matching record via random I/O:\n$$\\text{Cost}_{\\text{idx}}(s) = h + s \\cdot N = ${h} + s \\cdot ${N}$$\n\n2. **Equate Costs for Crossover Point:**\n$$\n${h} + s^* \\cdot ${N} = ${B}\n$$\n\n3. **Solve for $s^*$:**\n$$s^* \\cdot ${N} = ${B} - ${h} = ${B - h}$$\n$$s^* = \\frac{${B - h}}{${N}} \\approx ${sStar} \\text{ (${sPercent}\\%)}$$\n\n4. **Conclusion:**\nFor queries with predicate selectivity $s < ${sPercent}\\%$, the unclustered index scan yields fewer page I/Os. For queries selecting greater than $s > ${sPercent}\\%$ of the table, the query planner prefers a sequential scan because random page access overhead exceeds reading all clustered pages sequentially.`,
        keyAnswer: `$s^* = \\frac{${B - h}}{${N}} \\approx ${sStar} \\text{ (${sPercent}\\%)}$`,
      };
    },
  },

  {
    templateId: 'db-relalg-cardinality',
    courseId: 'database-systems',
    topicId: 'relational-algebra',
    topicName: 'Relational Algebra',
    difficulty: 'foundational',
    generate: () => {
      const nr = randomChoice([200, 300, 500, 1000]);
      const ns = randomChoice([50, 100, 200]);

      return {
        templateId: 'db-relalg-cardinality',
        topicId: 'relational-algebra',
        topicName: 'Relational Algebra',
        difficulty: 'foundational',
        title: 'Relational Algebra Natural Join Cardinality',
        questionMath: `Let $R(A, B)$ be a relation with $|R| = ${nr}$ tuples, and let $S(B, C)$ be a relation with $|S| = ${ns}$ tuples.\n\nSuppose attribute $B$ is the primary key of $S$, and attribute $R.B$ is a non-null foreign key referencing $S.B$.\n\nDetermine the exact number of tuples in the natural join $R \\bowtie S$.`,
        hints: [
          `Consider how many matching tuples in $S$ exist for each individual tuple in $R$.`,
          `Because $B$ is the primary key of $S$, each foreign key value $r[B]$ matches at most one tuple in $S$. Because the foreign key is non-null and satisfies referential integrity, it matches at least one.`,
        ],
        solutionMath: `1. **Referential Integrity Constraints:**\n- Attribute $B$ is the primary key of $S$, meaning every distinct $b \\in S[B]$ occurs at most once in $S$.\n- Attribute $R.B$ is a foreign key referencing $S.B$, and is declared non-null. Therefore, for every tuple $r \\in R$, there exists at least one matching tuple $s \\in S$ such that $r[B] = s[B]$.\n\n2. **Join Multiplicity:**\nCombining uniqueness and existence, every tuple in $R$ matches exactly one unique tuple in $S$ on attribute $B$.\n\n3. **Result Cardinality:**\n$$|R \\bowtie S| = |R| \\times 1 = ${nr} \\text{ tuples}$$\n\nThe size of the natural join is strictly bounded and equal to $|R| = ${nr}$.`,
        keyAnswer: `$|R \\bowtie S| = ${nr}$`,
      };
    },
  },

  {
    templateId: 'db-concurrency-serializability',
    courseId: 'database-systems',
    topicId: 'transactions-concurrency',
    topicName: 'Transactions & Concurrency Control',
    difficulty: 'intermediate',
    generate: () => {
      return {
        templateId: 'db-concurrency-serializability',
        topicId: 'transactions-concurrency',
        topicName: 'Transactions & Concurrency Control',
        difficulty: 'intermediate',
        title: 'Conflict Serializability and Precedence Graph Analysis',
        questionMath: `Consider the concurrent schedule $S$ comprising transactions $T_1$ and $T_2$ operating on database items $A$ and $B$:\n\n$$S: \\; r_1(A), \\; w_2(A), \\; w_1(B), \\; r_2(B), \\; c_1, \\; c_2$$\n\nConstruct the precedence graph (serialization graph) $\\mathcal{G}(S)$. Determine whether $S$ is conflict-serializable, and identify an equivalent serial execution order if one exists.`,
        hints: [
          `Identify all pairs of conflicting operations belonging to distinct transactions: (Read-Write, Write-Read, Write-Write on the same item).`,
          `An edge $T_i \\to T_j$ exists if an operation of $T_i$ precedes and conflicts with an operation of $T_j$. If the graph is acyclic, $S$ is conflict-serializable.`,
        ],
        solutionMath: `1. **Identify Conflicting Operations:**\nTwo operations conflict if they belong to different transactions, access the same data item, and at least one is a write.\n- On item $A$: $r_1(A)$ precedes $w_2(A)$. Because both access $A$ and $w_2$ is a write, this forms a conflict and requires an edge $T_1 \\to T_2$.\n- On item $B$: $w_1(B)$ precedes $r_2(B)$. Both access $B$ and $w_1$ is a write, requiring an edge $T_1 \\to T_2$.\n\n2. **Construct Precedence Graph $\\mathcal{G}(S)$:**\n- Vertices: $\\{T_1, T_2\\}$\n- Directed edges: $\\{(T_1, T_2)\\}$\n\n3. **Cycle Evaluation & Equivalence:**\nThere are no edges from $T_2$ to $T_1$. The precedence graph $\\mathcal{G}(S)$ contains no directed cycles.\n\nBy the Conflict Serializability Theorem, schedule $S$ is conflict-serializable. Topological sort of $\\mathcal{G}(S)$ yields the unique equivalent serial schedule $\\langle T_1, T_2 \\rangle$.`,
        keyAnswer: `Acyclic; equivalent to $\\langle T_1, T_2 \\rangle$`,
      };
    },
  },

  {
    templateId: 'db-recovery-aries',
    courseId: 'database-systems',
    topicId: 'recovery-logging',
    topicName: 'Crash Recovery & Logging',
    difficulty: 'advanced',
    generate: () => {
      return {
        templateId: 'db-recovery-aries',
        topicId: 'recovery-logging',
        topicName: 'Crash Recovery & Logging',
        difficulty: 'advanced',
        title: 'ARIES Recovery: Redo Start Point and Undo Transaction Set',
        questionMath: `An operating database crashes after appending the following Write-Ahead Log (WAL) records:\n\n$$\\begin{aligned}\n\\text{LSN 100}: & \\; T_1 \\text{ update } P_1 \\\\\n\\text{LSN 110}: & \\; T_2 \\text{ update } P_2 \\\\\n\\text{LSN 120}: & \\; \\text{begin\\_checkpoint} \\\\\n\\text{LSN 130}: & \\; \\text{end\\_checkpoint (DPT: } P_1 \\to 100, P_2 \\to 110; \\; \\text{ATT: } T_1, T_2) \\\\\n\\text{LSN 140}: & \\; T_1 \\text{ commit} \\\\\n\\text{LSN 150}: & \\; T_3 \\text{ update } P_1 \\\\\n\\text{CRASH} &\n\\end{aligned}$$\n\nUnder the ARIES recovery algorithm, determine:\n1. The exact LSN at which the Redo phase starts scanning forward.\n2. The set of active loser transactions that must be rolled back during the Undo phase.`,
        hints: [
          `The Analysis phase scans forward from the checkpoint begin record, updating the Dirty Page Table (DPT) and Active Transaction Table (ATT).`,
          `The Redo phase starts at the minimum recLSN across all pages present in the DPT at the end of the Analysis phase. Transactions in the ATT without a commit record form the Undo set.`,
        ],
        solutionMath: `1. **Analysis Phase:**\n- Restores the Dirty Page Table (DPT) and Active Transaction Table (ATT) as of the checkpoint at LSN 120/130: $\\text{DPT} = \\{P_1: 100, P_2: 110\\}$, $\\text{ATT} = \\{T_1, T_2\\}$.\n- Scans forward from LSN 130:\n  - LSN 140: $T_1$ commits $\\implies$ remove $T_1$ from ATT.\n  - LSN 150: $T_3$ updates $P_1$ $\\implies$ add $T_3$ to ATT with $\\text{lastLSN} = 150$.\n- At end of Analysis:\n  - $\\text{ATT} = \\{T_2, T_3\\}$\n  - $\\text{DPT} = \\{P_1: 100, P_2: 110\\}$\n\n2. **Redo Phase Start:**\nThe Redo phase begins at the smallest $\\text{recLSN}$ in the Dirty Page Table:\n$$\\text{RedoLSN} = \\min(\\text{recLSN}(P_1), \\text{recLSN}(P_2)) = \\min(100, 110) = 100$$\n\n3. **Undo Phase Loser Transactions:**\nThe loser transactions requiring rollback are all transactions active at crash time: $\\{T_2, T_3\\}$.`,
        keyAnswer: `Redo start: $\\text{LSN } 100$; Losers: $\\{T_2, T_3\\}$`,
      };
    },
  },

  // =============================================================
  // Computer Architecture Templates
  // =============================================================
  {
    templateId: 'arch-rep-twos-complement',
    courseId: 'computer-architecture',
    topicId: 'representation',
    topicName: 'Digital Representation',
    difficulty: 'foundational',
    generate: () => {
      const bits = randomChoice([8, 12, 16]);
      const minVal = -Math.pow(2, bits - 1);
      const maxVal = Math.pow(2, bits - 1) - 1;
      const testVal = randomChoice([35, 42, 65, 87]);

      return {
        templateId: 'arch-rep-twos-complement',
        topicId: 'representation',
        topicName: 'Digital Representation',
        difficulty: 'foundational',
        title: "Signed Two's Complement Range and Negation",
        questionMath: `Consider an $n = ${bits}$-bit signed binary representation using two's complement arithmetic.\n\n1. State the closed-form range of representable integer values $[V_{\\min}, V_{\\max}]$.\n2. Compute the exact two's complement negation of the decimal value $+${testVal}$ in $${bits}$-bit binary.`,
        hints: [
          `In an $n$-bit two's complement system, the range is $[-2^{n-1}, 2^{n-1} - 1]$.`,
          `To negate a value in two's complement, invert all bits (bitwise NOT) and add $1$.`,
        ],
        solutionMath: `1. **Range Bounds:**\nFor $n = ${bits}$ bits:\n$$V_{\\min} = -2^{${bits}-1} = -2^{${bits-1}} = ${minVal}$$\n$$V_{\\max} = 2^{${bits}-1} - 1 = 2^{${bits-1}} - 1 = ${maxVal}$$\nThe representable range is $[${minVal}, ${maxVal}]$.\n\n2. **Two's Complement Negation of +${testVal}:**\n- Value $+${testVal}$ in unsigned ${bits}-bit binary: $${testVal.toString(2).padStart(bits, '0')}_2$.\n- Invert all bits: $${testVal.toString(2).padStart(bits, '0').split('').map(b => b === '0' ? '1' : '0').join('')}_2$.\n- Add $1$: $${((Math.pow(2, bits) - testVal) >>> 0).toString(2).padStart(bits, '0')}_2$.\n\nIn hexadecimal, this corresponds to $\\text{0x}${((Math.pow(2, bits) - testVal) >>> 0).toString(16).toUpperCase()}$.`,
        keyAnswer: `$[${minVal}, ${maxVal}]$`,
      };
    },
  },

  {
    templateId: 'arch-pipe-hazards-stalls',
    courseId: 'computer-architecture',
    topicId: 'pipeline-hazards',
    topicName: 'Pipelining & Hazards',
    difficulty: 'intermediate',
    generate: () => {
      const k = randomChoice([5, 6, 8, 10]);
      const totalCycles = k + 5;

      return {
        templateId: 'arch-pipe-hazards-stalls',
        topicId: 'pipeline-hazards',
        topicName: 'Pipelining & Hazards',
        difficulty: 'intermediate',
        title: 'Pipelined Load-Use Hazard Latency Analysis',
        questionMath: `Consider a classical 5-stage RISC pipeline (IF, ID, EX, MEM, WB) equipped with full ALU-to-ALU forwarding hardware.\n\nA sequence of $K = ${k}$ instructions contains exactly one load instruction followed immediately by a dependent arithmetic instruction that uses the loaded register:\n\n$$\\begin{aligned}\nI_1: & \\; \\texttt{lw } r_1, 0(r_2) \\\\\nI_2: & \\; \\texttt{add } r_3, r_1, r_4 \\\\\nI_3 \\dots I_{${k}}: & \\; \\text{independent instructions}\n\\end{aligned}$$\n\nCalculate the total number of clock cycles required to execute the entire $K = ${k}$ instruction sequence from the fetch of $I_1$ to the retirement of $I_{${k}}$.`,
        hints: [
          `In a 5-stage pipeline without hazards, $K$ instructions complete in $5 + (K - 1)$ cycles.`,
          `A load instruction produces its result at the end of the MEM stage. An immediately dependent instruction requires the operand at the beginning of its EX stage. Determine how many stall cycles (bubbles) must be inserted between ID and EX.`,
        ],
        solutionMath: `1. **Load-Use Data Hazard:**\n- $I_1$ (\`lw\`) produces the loaded memory data in the **MEM** stage (Cycle 4 for $I_1$).\n- $I_2$ (\`add\`) requires register $r_1$ in its **EX** stage. In the absence of stalls, $I_2$ enters EX in Cycle 3, before the memory data is available.\n- Even with forwarding hardware routing the result from MEM/WB directly to EX, $I_2$ must stall for exactly 1 clock cycle (interlock bubble in ID).\n\n2. **Cycle Accounting:**\n- In an ideal pipeline with zero stalls, $K = ${k}$ instructions take $T_{\\text{ideal}} = 5 + (K - 1) = ${k + 4}$ clock cycles.\n- The load-use interlock introduces $1$ bubble stall cycle.\n- Total execution time:\n$$T_{\\text{total}} = T_{\\text{ideal}} + 1 = (${k} + 4) + 1 = ${totalCycles} \\text{ clock cycles}$$\n\nAll $K$ instructions retire by Cycle $${totalCycles}$.`,
        keyAnswer: `$${totalCycles} \\text{ clock cycles}$`,
      };
    },
  },

  {
    templateId: 'arch-cache-amat',
    courseId: 'computer-architecture',
    topicId: 'cache-amat',
    topicName: 'Cache Hierarchies & AMAT',
    difficulty: 'intermediate',
    generate: () => {
      const t1 = 1;
      const m1 = randomChoice([0.05, 0.08, 0.10]);
      const t2 = randomChoice([8, 10, 12]);
      const m2 = randomChoice([0.15, 0.20, 0.25]);
      const tmem = randomChoice([100, 150, 200]);

      const l2Penalty = t2 + m2 * tmem;
      const amat = (t1 + m1 * l2Penalty).toFixed(2);

      return {
        templateId: 'arch-cache-amat',
        topicId: 'cache-amat',
        topicName: 'Cache Hierarchies & AMAT',
        difficulty: 'intermediate',
        title: 'Average Memory Access Time (AMAT) in Two-Level Caches',
        questionMath: `A processor features a two-level cache hierarchy with the following parameters:\n\n- L1 Cache: Hit time $t_1 = ${t1}\\text{ cycle}$, Miss rate $m_1 = ${(m1 * 100).toFixed(0)}\\%$\n- L2 Cache: Hit time $t_2 = ${t2}\\text{ cycles}$, Local miss rate $m_2 = ${(m2 * 100).toFixed(0)}\\%$\n- Main Memory: Access latency $t_{\\text{mem}} = ${tmem}\\text{ cycles}$\n\nCalculate the Average Memory Access Time (AMAT) in clock cycles.`,
        hints: [
          `Use the multilevel AMAT formula: $\\text{AMAT} = t_1 + m_1 \\times \\text{Miss Penalty}_{L1}$.`,
          `The L1 miss penalty is the L2 access time plus L2 miss penalty: $\\text{Miss Penalty}_{L1} = t_2 + m_2 \\times t_{\\text{mem}}$.`,
        ],
        solutionMath: `1. **Multilevel AMAT Hierarchy:**\n$$\\text{AMAT} = t_1 + m_1 \\cdot \\text{Penalty}_{L1}$$\nwhere\n$$\\text{Penalty}_{L1} = t_2 + m_2 \\cdot t_{\\text{mem}}$$\n\n2. **Compute L1 Miss Penalty:**\n$$\\text{Penalty}_{L1} = ${t2} + (${m2} \\times ${tmem}) = ${t2} + ${m2 * tmem} = ${l2Penalty} \\text{ cycles}$$\n\n3. **Compute AMAT:**\n$$\\text{AMAT} = ${t1} + (${m1} \\times ${l2Penalty}) = ${t1} + ${(m1 * l2Penalty).toFixed(2)} = ${amat} \\text{ cycles}$$\n\nEach memory reference costs on average ${amat} clock cycles.`,
        keyAnswer: `$\\text{AMAT} = ${amat} \\text{ cycles}$`,
      };
    },
  },

  {
    templateId: 'arch-branch-penalty',
    courseId: 'computer-architecture',
    topicId: 'instruction-datapath',
    topicName: 'Instruction Set Architecture & Datapath',
    difficulty: 'advanced',
    generate: () => {
      const branchFreq = randomChoice([0.15, 0.20, 0.25]);
      const takenProb = randomChoice([0.60, 0.70, 0.80]);
      const penalty = 2;
      const branchStall = branchFreq * takenProb * penalty;
      const cpi = (1.0 + branchStall).toFixed(3);

      return {
        templateId: 'arch-branch-penalty',
        topicId: 'instruction-datapath',
        topicName: 'Instruction Set Architecture & Datapath',
        difficulty: 'advanced',
        title: 'Pipelined Branch Penalty and Effective CPI',
        questionMath: `A pipelined processor has a base $\\text{CPI}_{\\text{ideal}} = 1.0$ when assuming no branch stalls. Branch instructions account for $f_{\\text{br}} = ${(branchFreq * 100).toFixed(0)}\\%$ of all executed instructions.\n\nThe hardware uses a simple predict-not-taken scheme. Profiling indicates that $p_{\\text{taken}} = ${(takenProb * 100).toFixed(0)}\\%$ of branches are actually taken, incurring a penalty of $b = ${penalty}$ stall cycles to flush the pipeline. Correctly predicted (untaken) branches incur 0 stall cycles.\n\nCompute the effective average Cycles Per Instruction (CPI).`,
        hints: [
          `The average CPI is given by $\\text{CPI} = \\text{CPI}_{\\text{ideal}} + \\text{Stall cycles per instruction}$.`,
          `Stall cycles occur only on taken branches: $\\text{Stall cycles} = f_{\\text{br}} \\times p_{\\text{taken}} \\times b$.`,
        ],
        solutionMath: `1. **Branch Misprediction Penalty:**\nUnder predict-not-taken, a branch stall occurs whenever a branch is taken:\n$$\\text{Misprediction Rate} = f_{\\text{br}} \\cdot p_{\\text{taken}} = ${branchFreq} \\times ${takenProb} = ${(branchFreq * takenProb).toFixed(3)}$$\n\n2. **Branch Stall Contribution:**\nEach misprediction stalls the pipeline for $b = ${penalty}$ cycles:\n$$\\text{Stall cycles per instruction} = ${(branchFreq * takenProb).toFixed(3)} \\times ${penalty} = ${branchStall.toFixed(3)}$$\n\n3. **Effective CPI:**\n$$\\text{CPI}_{\\text{eff}} = \\text{CPI}_{\\text{ideal}} + \\text{Stalls} = 1.0 + ${branchStall.toFixed(3)} = ${cpi}$$\n\nBranch mispredictions increase execution time by ${(branchStall * 100).toFixed(1)}\\%.`,
        keyAnswer: `$\\text{CPI} = ${cpi}$`,
      };
    },
  },

  // =============================================================
  // Operating Systems Templates
  // =============================================================
  {
    templateId: 'os-sched-round-robin',
    courseId: 'operating-systems',
    topicId: 'cpu-scheduling',
    topicName: 'CPU Scheduling',
    difficulty: 'intermediate',
    generate: () => {
      const b1 = randomChoice([6, 7, 8]);
      const b2 = randomChoice([3, 4]);
      const b3 = randomChoice([2, 5]);
      const q = 4;

      const t2_end = 4 + b2;
      let t3_end = 0;
      let t1_end = 0;
      let p3_rem = 0;
      let t = 4 + b2;
      if (b3 <= 4) {
        t += b3;
        t3_end = t;
        t += (b1 - 4);
        t1_end = t;
      } else {
        t += 4;
        p3_rem = b3 - 4;
        t += (b1 - 4);
        t1_end = t;
        t += p3_rem;
        t3_end = t;
      }

      const waitP1 = t1_end - b1;
      const waitP2 = t2_end - b2;
      const waitP3 = t3_end - b3;
      const avgWait = ((waitP1 + waitP2 + waitP3) / 3).toFixed(2);

      return {
        templateId: 'os-sched-round-robin',
        topicId: 'cpu-scheduling',
        topicName: 'CPU Scheduling',
        difficulty: 'intermediate',
        title: 'Round-Robin Scheduler Turnaround and Waiting Times',
        questionMath: `Three processes $P_1, P_2, P_3$ arrive at time $t = 0$ in the ready queue in that order. Their CPU burst times are:\n\n- $P_1: ${b1}\\text{ ms}$\n- $P_2: ${b2}\\text{ ms}$\n- $P_3: ${b3}\\text{ ms}$\n\nThe operating system uses a preemptive Round-Robin (RR) scheduling algorithm with time quantum $q = ${q}\\text{ ms}$. Zero context-switching overhead is assumed.\n\nCalculate the average waiting time across all three processes.`,
        hints: [
          `Draw the execution timeline across quantum rounds.`,
          `The waiting time for each process is $\\text{Wait}(P_i) = \\text{FinishTime}(P_i) - \\text{Burst}(P_i) - \\text{ArrivalTime}(P_i)$.`,
        ],
        solutionMath: `1. **Execution Timeline (Quantum $q = ${q}\\text{ ms}$):**\n- $[0, 4]$: $P_1$ executes for 4 ms (remaining: ${b1 - 4} ms).\n- $[4, ${t2_end}]$: $P_2$ executes for ${b2} ms and terminates at $t = ${t2_end}$.\n- Subsequent rounds complete the remaining bursts of $P_1$ and $P_3$.\n\n2. **Completion (Finish) Times:**\n- $P_1$ finishes at $t = ${t1_end}\\text{ ms}$\n- $P_2$ finishes at $t = ${t2_end}\\text{ ms}$\n- $P_3$ finishes at $t = ${t3_end}\\text{ ms}$\n\n3. **Waiting Times ($\\text{Wait} = \\text{Finish} - \\text{Burst}$):**\n- $W(P_1) = ${t1_end} - ${b1} = ${waitP1}\\text{ ms}$\n- $W(P_2) = ${t2_end} - ${b2} = ${waitP2}\\text{ ms}$\n- $W(P_3) = ${t3_end} - ${b3} = ${waitP3}\\text{ ms}$\n\n4. **Average Waiting Time:**\n$$\\bar{W} = \\frac{${waitP1} + ${waitP2} + ${waitP3}}{3} = \\frac{${waitP1 + waitP2 + waitP3}}{3} \\approx ${avgWait}\\text{ ms}$$`,
        keyAnswer: `$\\bar{W} \\approx ${avgWait}\\text{ ms}$`,
      };
    },
  },

  {
    templateId: 'os-vm-sv39',
    courseId: 'operating-systems',
    topicId: 'virtual-memory',
    topicName: 'Virtual Memory & Page Tables',
    difficulty: 'intermediate',
    generate: () => {
      const vpn2 = randomChoice([1, 2, 64, 128, 255]);
      const vpn1 = randomChoice([0, 15, 32, 100]);
      const vpn0 = randomChoice([3, 10, 50, 77]);
      const offset = randomChoice([0x120, 0x4a8, 0x8c4]);

      const vaBig = (BigInt(vpn2) << 30n) | (BigInt(vpn1) << 21n) | (BigInt(vpn0) << 12n) | BigInt(offset);
      const hexVA = '0x' + vaBig.toString(16).toUpperCase();

      return {
        templateId: 'os-vm-sv39',
        topicId: 'virtual-memory',
        topicName: 'Virtual Memory & Page Tables',
        difficulty: 'intermediate',
        title: 'RISC-V Sv39 Virtual Address Index Decomposition',
        questionMath: `In the RISC-V Sv39 virtual memory architecture, virtual addresses are 39 bits wide with 4 KiB ($2^{12}$ bytes) pages. The address divides into three 9-bit Virtual Page Number fields and a 12-bit page offset:\n\n$$\\text{VA}[38:30] = \\text{VPN}[2], \\quad \\text{VA}[29:21] = \\text{VPN}[1], \\quad \\text{VA}[20:12] = \\text{VPN}[0], \\quad \\text{VA}[11:0] = \\text{offset}$$\n\nGiven the virtual address $\\texttt{${hexVA}}$, extract the decimal values of $\\text{VPN}[2]$, $\\text{VPN}[1]$, $\\text{VPN}[0]$, and the hexadecimal page offset.`,
        hints: [
          `Convert the address to binary or mask each field: offset is lower 12 bits, each VPN is 9 bits.`,
          `Offset mask is \`0xFFF\`, VPN masks are 9-bit shifted slices.`,
        ],
        solutionMath: `1. **Bit Field Layout:**\n- Bits 11..0 (12 bits): Page Offset\n- Bits 20..12 (9 bits): $\\text{VPN}[0]$ Level-0 Table Index\n- Bits 29..21 (9 bits): $\\text{VPN}[1]$ Level-1 Table Index\n- Bits 38..30 (9 bits): $\\text{VPN}[2]$ Level-2 (Root) Table Index\n\n2. **Decomposition of $\\texttt{${hexVA}}$:**\n- $\\text{offset} = \\texttt{0x${offset.toString(16).toUpperCase()}}$\n- $\\text{VPN}[0] = ${vpn0}$\n- $\\text{VPN}[1] = ${vpn1}$\n- $\\text{VPN}[2] = ${vpn2}$\n\n3. **Result Summary:**\n$$\\text{VPN}[2] = ${vpn2}, \\quad \\text{VPN}[1] = ${vpn1}, \\quad \\text{VPN}[0] = ${vpn0}, \\quad \\text{offset} = \\texttt{0x${offset.toString(16).toUpperCase()}}$$`,
        keyAnswer: `$\\text{VPN} = (${vpn2}, ${vpn1}, ${vpn0})$, $\\text{offset} = \\texttt{0x${offset.toString(16).toUpperCase()}}$`,
      };
    },
  },

  {
    templateId: 'os-fs-inode-capacity',
    courseId: 'operating-systems',
    topicId: 'storage-filesystems',
    topicName: 'Storage & File Systems',
    difficulty: 'foundational',
    generate: () => {
      const direct = 12;
      const blockSize = 4096;
      const ptrSize = 4;
      const ptrsPerBlock = blockSize / ptrSize;
      const totalBlocks = direct + ptrsPerBlock + ptrsPerBlock * ptrsPerBlock;
      const gib = ((totalBlocks * blockSize) / Math.pow(1024, 3)).toFixed(3);

      return {
        templateId: 'os-fs-inode-capacity',
        topicId: 'storage-filesystems',
        topicName: 'Storage & File Systems',
        difficulty: 'foundational',
        title: 'Multi-Level Inode File Capacity Calculation',
        questionMath: `A Unix-style file system uses $4\\text{ KiB}$ disk blocks ($4096$ bytes) and $4$-byte (32-bit) block addresses. Each inode contains:\n\n- ${direct} direct block pointers\n- 1 single-indirect block pointer\n- 1 double-indirect block pointer\n\nCalculate the maximum addressable file size supported by this inode structure in gibibytes (GiB).`,
        hints: [
          `Determine how many block pointers fit in one 4 KiB block: $\\frac{4096}{4} = 1024$ pointers per block.`,
          `Compute the blocks addressed by direct pointers, single-indirect pointer ($1024$ blocks), and double-indirect pointer ($1024 \\times 1024$ blocks).`,
        ],
        solutionMath: `1. **Pointers per Indirect Block:**\n$$\\text{Pointers per block} = \\frac{4096\\text{ bytes}}{4\\text{ bytes/pointer}} = 1024$$\n\n2. **Block Accounting by Tier:**\n- Direct pointers: ${direct} blocks\n- Single indirect pointer: $1 \\times 1024 = 1024$ blocks\n- Double indirect pointer: $1024 \\times 1024 = 1{,}048{,}576$ blocks\n- Total blocks: ${totalBlocks} blocks\n\n3. **Total File Size:**\n$$\\text{Capacity in GiB} = \\frac{${totalBlocks} \\times 4096}{1024^3} \\approx ${gib} \\text{ GiB}$$\n\nThe inode supports files up to approximately ${gib} GiB.`,
        keyAnswer: `$\\approx ${gib} \\text{ GiB}$`,
      };
    },
  },

  {
    templateId: 'os-sync-amdahl',
    courseId: 'operating-systems',
    topicId: 'concurrency-deadlock',
    topicName: 'Concurrency & Deadlock',
    difficulty: 'foundational',
    generate: () => {
      const sPercent = randomChoice([5, 10, 20]);
      const s = sPercent / 100;
      const n = randomChoice([4, 8, 16]);
      const speedup = (1 / (s + (1 - s) / n)).toFixed(2);
      const maxSpeedup = (1 / s).toFixed(1);

      return {
        templateId: 'os-sync-amdahl',
        topicId: 'concurrency-deadlock',
        topicName: 'Concurrency & Deadlock',
        difficulty: 'foundational',
        title: "Amdahl's Law Multicore Scalability Bounds",
        questionMath: `A kernel benchmark spends $s = ${sPercent}\\%$ of its execution time inside a strictly serialized global spinlock critical section. The remaining $1 - s = ${100 - sPercent}\\%$ of work is perfectly parallelizable across CPU cores.\n\nUnder Amdahl's Law:\n\n$$S(N) = \\frac{1}{s + \\frac{1 - s}{N}}$$\n\n1. Calculate the speedup $S(${n})$ achieved on $N = ${n}$ cores.\n2. Determine the theoretical maximum speedup $S(\\infty)$ possible with an infinite number of cores.`,
        hints: [
          `Substitute $s = ${s}$ and $N = ${n}$ into the denominator of Amdahl's equation.`,
          `Take the limit as $N \\to \\infty$, where $\\frac{1 - s}{N} \\to 0$.`,
        ],
        solutionMath: `1. **Speedup on $N = ${n}$ Cores:**\n$$S(${n}) = \\frac{1}{${s} + \\frac{${(1 - s).toFixed(2)}}{${n}}} \\approx ${speedup}\\times$$\n\n2. **Infinite-Core Asymptotic Limit:**\n$$S(\\infty) = \\lim_{N \\to \\infty} \\frac{1}{s + \\frac{1 - s}{N}} = \\frac{1}{${s}} = ${maxSpeedup}\\times$$\n\nRegardless of how many CPU cores are added, the speedup can never exceed ${maxSpeedup}x because the ${sPercent}\\% serialized portion bounds performance.`,
        keyAnswer: `$S(${n}) \\approx ${speedup}\\times$, $S(\\infty) = ${maxSpeedup}\\times$`,
      };
    },
  },
];

export function generateQuestion(
  courseOrTopic?: string,
  topicOrDifficulty?: string,
  maybeDifficulty?: DifficultyLevel | 'all'
): PracticeQuestion {
  const isCourseId = ['calculus-intro', 'database-systems', 'computer-architecture', 'operating-systems'].includes(courseOrTopic || '');
  const courseId = isCourseId ? courseOrTopic! : 'calculus-intro';
  const topicId = isCourseId ? topicOrDifficulty : courseOrTopic;
  const difficulty = isCourseId ? maybeDifficulty : (topicOrDifficulty as DifficultyLevel | 'all' | undefined);

  let candidates = QUESTION_TEMPLATES.filter((t) => (t.courseId || 'calculus-intro') === courseId);
  if (candidates.length === 0) {
    candidates = QUESTION_TEMPLATES;
  }

  if (topicId && topicId !== 'all') {
    const topicFiltered = candidates.filter((t) => t.topicId === topicId);
    if (topicFiltered.length > 0) {
      candidates = topicFiltered;
    }
  }

  if (difficulty && difficulty !== 'all') {
    const diffFiltered = candidates.filter((t) => t.difficulty === difficulty);
    if (diffFiltered.length > 0) {
      candidates = diffFiltered;
    }
  }

  const selectedTemplate = randomChoice(candidates);
  const base = selectedTemplate.generate();

  return {
    ...base,
    id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    generatedAt: new Date().toISOString(),
  };
}
