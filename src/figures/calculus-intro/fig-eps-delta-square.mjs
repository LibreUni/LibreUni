import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => x ** 2;
const df = (x) => 2 * x;
const c = 3;
const L = 9;
const eps = 1;
const delta = Math.min(1, eps / 7); // 1/7
const deltaOpt = Math.sqrt(L + eps) - c; // sqrt(10) - 3 ≈ 0.162277

export default defineFigure({
  alt: 'Epsilon-delta verification for the limit of x squared as x approaches 3 equals 9, illustrating the tolerance band and delta window.',
  caption: 'Epsilon-delta verification for $\\lim_{x \\to 3} x^2 = 9$ with $\\varepsilon = 1$ and preliminary bound $\\delta = \\frac{1}{7}$.',
  x: [2.5, 3.5],
  y: [7.5, 10.5],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = x²' },
  ],
  marks: [
    { type: 'band', from: L - eps, to: L + eps },
    { type: 'window', from: c - delta, to: c + delta },
    { type: 'point', curve: 'f', at: c },
    { type: 'vline', x: c, to: 'curve:f', label: 'c=3' },
    { type: 'hline', y: L, to: c, label: 'L=9' },
    { type: 'vline', x: c - delta, to: 'curve:f', label: 'c-δ' },
    { type: 'vline', x: c + delta, to: 'curve:f', label: 'c+δ' },
    { type: 'vline', x: c - deltaOpt, to: 'curve:f', label: 'c-δ*', dy: 18 },
    { type: 'vline', x: c + deltaOpt, to: 'curve:f', label: 'c+δ*', dy: 18 },
  ],
  checks: [
    [
      'sup |x² - 9| = 43/49 < 1 on (3-δ, 3+δ)',
      () => {
        const supDiff = Math.abs(f(c + delta) - L);
        return Math.abs(supDiff - 43 / 49) < 1e-9 && supDiff < 1;
      },
    ],
    ['delta is strictly smaller than optimal delta', () => delta < deltaOpt],
  ],
});
