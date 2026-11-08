import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => Math.abs(x);

export default defineFigure({
  alt: 'Graph of the absolute value function f(x) = |x| at the sharp corner x = 0 with opposing left and right difference quotients.',
  caption: 'Non-differentiability at a corner: left secant slope is $-1$ while right secant slope is $+1$, so no tangent exists at $x = 0$.',
  x: [-1.8, 1.8],
  y: [-0.3, 2.0],
  curves: [
    { id: 'f', fn: f, label: 'y = |x|' },
  ],
  marks: [
    { type: 'secant', curve: 'f', from: -1, to: 0, label: 'slope -1' },
    { type: 'secant', curve: 'f', from: 0, to: 1, label: 'slope +1' },
    { type: 'point', curve: 'f', at: 0 },
    { type: 'point', curve: 'f', at: -1 },
    { type: 'point', curve: 'f', at: 1 },
  ],
  checks: [
    [
      'left and right difference quotients differ',
      () => {
        const leftSlope = (f(0) - f(-1)) / (0 - -1);
        const rightSlope = (f(1) - f(0)) / (1 - 0);
        return leftSlope === -1 && rightSlope === 1;
      },
    ],
  ],
});
