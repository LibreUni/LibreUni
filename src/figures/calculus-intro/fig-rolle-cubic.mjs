import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => x ** 3 - 3 * x;
const df = (x) => 3 * x ** 2 - 3;
const sqrt3 = Math.sqrt(3);

export default defineFigure({
  alt: 'Rolle\'s theorem on the cubic polynomial x cubed minus 3x between roots minus square root of 3 and square root of 3 with horizontal tangents at x = plus and minus 1.',
  caption: "Rolle's theorem: $f(-\\sqrt{3}) = f(\\sqrt{3}) = 0$ implies $f'(c) = 0$ at both critical points $c = -1$ and $c = 1$.",
  x: [-2.2, 2.2],
  y: [-2.8, 2.8],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = x³ - 3x' },
  ],
  marks: [
    { type: 'tangent', curve: 'f', at: -1, span: 1.0, label: 'f′(-1)=0' },
    { type: 'tangent', curve: 'f', at: 1, span: 1.0, label: 'f′(1)=0' },
    { type: 'point', curve: 'f', at: -1 },
    { type: 'point', curve: 'f', at: 1 },
    { type: 'point', curve: 'f', at: -sqrt3 },
    { type: 'point', curve: 'f', at: sqrt3 },
    { type: 'vline', x: -1, to: 'curve:f', label: 'c=-1' },
    { type: 'vline', x: 1, to: 'curve:f', label: 'c=1' },
  ],
  checks: [
    [
      'f(±√3) = 0 and f′(±1) = 0',
      () =>
        Math.abs(f(-sqrt3)) < 1e-12 &&
        Math.abs(f(sqrt3)) < 1e-12 &&
        df(-1) === 0 &&
        df(1) === 0,
    ],
  ],
});
