import { defineFigure } from '../../lib/plot/index.mjs';

const cosFn = (x) => Math.cos(x);
const dCosFn = (x) => -Math.sin(x);
const p2 = (x) => 1 - (x ** 2) / 2;
const dp2 = (x) => -x;
const p4 = (x) => 1 - (x ** 2) / 2 + (x ** 4) / 24;
const dp4 = (x) => -x + (x ** 3) / 6;

export default defineFigure({
  alt: 'Graph of cos(x) compared against its degree-2 and degree-4 Maclaurin polynomials P_2(x) and P_4(x) over [-3.5, 3.5].',
  caption: 'Maclaurin polynomials $P_2(x) = 1 - \\frac{x^2}{2}$ and $P_4(x) = 1 - \\frac{x^2}{2} + \\frac{x^4}{24}$ approximating $\\cos(x)$ around $a = 0$.',
  x: [-3.5, 3.5],
  y: [-1.6, 1.6],
  curves: [
    { id: 'cos', fn: cosFn, d: dCosFn, label: 'cos(x)', labelAt: -2.6, dy: -12 },
    { id: 'p2', fn: p2, d: dp2, style: 'dashed', series: 2, label: 'P₂(x)', labelAt: 1.85, dx: 18 },
    { id: 'p4', fn: p4, d: dp4, style: 'dotted', series: 3, label: 'P₄(x)', labelAt: 2.55, dy: 14 },
  ],
  marks: [
    { type: 'point', curve: 'cos', at: 0 },
  ],
  checks: [
    [
      'P_4 is strictly more accurate than P_2 at x = 1',
      () => Math.abs(p4(1) - cosFn(1)) < Math.abs(p2(1) - cosFn(1)),
    ],
    [
      'Lagrange remainder bound holds at x = 1 for P_4 (error <= 1/720)',
      () => Math.abs(p4(1) - cosFn(1)) <= 1 / 720,
    ],
  ],
});
