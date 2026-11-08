import { defineFigure, solve } from '../../lib/plot/index.mjs';

const f = (x) => x ** 3 - x - 2;
const df = (x) => 3 * x ** 2 - 1;
const r = solve(f, [1, 2], 1e-12);

export default defineFigure({
  alt: 'Intermediate Value Theorem guaranteed root of the cubic polynomial x cubed minus x minus 2 on the interval [1, 2].',
  caption: 'The Intermediate Value Theorem guarantees a root $r \\approx 1.5214$ in $[1, 2]$ because $f(1) = -2 < 0 < 4 = f(2)$.',
  x: [0.8, 2.2],
  y: [-3, 5],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = x³ - x - 2' },
  ],
  marks: [
    { type: 'point', x: r, y: 0 },
    { type: 'vline', x: r, to: 'curve:f', label: 'r ≈ 1.521', dy: 18 },
    { type: 'point', curve: 'f', at: 1 },
    { type: 'point', curve: 'f', at: 2 },
  ],
  checks: [
    [
      'computed root satisfies f(1) < 0 < f(2) and |f(r)| < 1e-9',
      () => f(1) < 0 && f(2) > 0 && Math.abs(f(r)) < 1e-9 && Math.abs(r - 1.5214) < 1e-3,
    ],
  ],
});
