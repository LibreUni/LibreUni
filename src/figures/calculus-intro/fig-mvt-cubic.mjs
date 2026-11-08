import { defineFigure, solve } from '../../lib/plot/index.mjs';

const f = (x) => x ** 3;
const df = (x) => 3 * x ** 2;
const a = 0;
const b = 2;
const m = (f(b) - f(a)) / (b - a); // 4
const c = solve((x) => df(x) - m, [a, b], 1e-12); // 2/√3 ≈ 1.1547

export default defineFigure({
  alt: 'Graph of y = x cubed on [0, 2] with the chord from (0, 0) to (2, 8) and the parallel tangent line at x = c = 2 over square root of 3.',
  caption: 'The tangent at $c$ is parallel to the chord: $f\'(c) = \\frac{f(2) - f(0)}{2} = 4$.',
  x: [-0.3, 2.3],
  y: [-1, 9],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = x³' },
  ],
  marks: [
    { type: 'secant', curve: 'f', from: a, to: b, label: 'chord' },
    { type: 'tangent', curve: 'f', at: c, span: 0.8, label: 'tangent at c' },
    { type: 'point', curve: 'f', at: c },
    { type: 'vline', x: c, to: 'curve:f', label: 'c' },
  ],
  checks: [
    [
      'f′(c) = 4 and c = 2/√3',
      () => Math.abs(df(c) - 4) < 1e-6 && Math.abs(c - 2 / Math.sqrt(3)) < 1e-6,
    ],
  ],
});
