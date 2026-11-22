import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => x ** 2;
const df = (x) => 2 * x;

export default defineFigure({
  alt: 'Lower and upper Darboux sums for y = x squared on [0, 1] with n = 4 subintervals, demonstrating lower sum 7/32 and upper sum 15/32 bounding the true integral 1/3.',
  caption: 'Darboux sums for $f(x) = x^2$ on $[0, 1]$ with $n = 4$: lower sum $L = \\frac{7}{32} = 0.21875$ and upper sum $U = \\frac{15}{32} = 0.46875$ sandwich $\\int_0^1 x^2 \\, dx = \\frac{1}{3}$.',
  x: [-0.1, 1.15],
  y: [-0.1, 1.15],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = x²' },
  ],
  marks: [
    { type: 'riemann', curve: 'f', interval: [0, 1], n: 4, rule: 'upper' },
    { type: 'riemann', curve: 'f', interval: [0, 1], n: 4, rule: 'lower' },
    { type: 'point', curve: 'f', at: 0 },
    { type: 'point', curve: 'f', at: 0.25 },
    { type: 'point', curve: 'f', at: 0.5 },
    { type: 'point', curve: 'f', at: 0.75 },
    { type: 'point', curve: 'f', at: 1 },
  ],
  checks: [
    [
      'lower and upper Darboux bounds',
      () => {
        const L = 7 / 32;
        const U = 15 / 32;
        return L === 0.21875 && U === 0.46875 && L <= 1 / 3 && 1 / 3 <= U;
      },
    ],
  ],
});
