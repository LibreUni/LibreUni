import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => 1 / x;
const df = (x) => -1 / (x ** 2);

export default defineFigure({
  alt: 'Failure of the Extreme Value Theorem for the reciprocal function 1/x on the non-compact open interval (0, 1].',
  caption: 'Failure of the Extreme Value Theorem on $(0, 1]$: $f(x) = \\frac{1}{x}$ is continuous but fails to attain a maximum as $x \\to 0^+$.',
  x: [0, 1.2],
  y: [0, 10],
  curves: [
    { id: 'f', fn: f, d: df, domain: [0.1, 1.2], label: 'y = 1/x' },
  ],
  marks: [
    { type: 'point', x: 0.1, y: f(0.1), open: true },
    { type: 'point', curve: 'f', at: 1 },
    { type: 'vline', x: 1, to: 'curve:f', label: 'x=1' },
  ],
  checks: [
    [
      'unbounded growth on (0, 1]',
      () => f(0.01) > f(0.1) && f(0.001) > f(0.01) && f(0.0001) > 1000,
    ],
  ],
});
