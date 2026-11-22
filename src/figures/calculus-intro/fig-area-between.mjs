import { defineFigure, areaBetween } from '../../lib/plot/index.mjs';

const f1 = (x) => x;
const df1 = () => 1;

const f2 = (x) => x ** 2;
const df2 = (x) => 2 * x;

export default defineFigure({
  alt: 'Area between the line y = x and parabola y = x squared on [0, 1], highlighting the enclosed region of area 1/6.',
  caption: 'Area bounded between curves: the region enclosed by $y = x$ and $y = x^2$ on $[0, 1]$ has area $\\int_0^1 (x - x^2) \\, dx = \\frac{1}{6}$.',
  x: [-0.15, 1.15],
  y: [-0.15, 1.15],
  curves: [
    { id: 'f1', fn: f1, d: df1, label: 'y = x' },
    { id: 'f2', fn: f2, d: df2, label: 'y = x²' },
  ],
  marks: [
    { type: 'area', curve: 'f1', betweenCurve: 'f2', from: 0, to: 1 },
    { type: 'point', curve: 'f1', at: 0 },
    { type: 'point', curve: 'f1', at: 1 },
  ],
  checks: [
    [
      'computed area between curves equals 1/6',
      () => {
        const { area } = areaBetween({ f1, f2, interval: [0, 1], n: 200 });
        return Math.abs(area - 1 / 6) < 1e-5;
      },
    ],
  ],
});
