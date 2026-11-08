import { defineFigure, argmin } from '../../lib/plot/index.mjs';

const f = (t) => t ** 2 - 1;
const df = (t) => 2 * t;

const A = (x) => (x ** 3) / 3 - x;
const dA = (x) => x ** 2 - 1;

export default defineFigure({
  alt: 'Two-panel figure illustrating the Fundamental Theorem of Calculus: integrand f(t) = t squared minus 1 on the left and accumulation function A(x) = x cubed over 3 minus x on the right.',
  caption: 'The Fundamental Theorem of Calculus: the accumulation function $A(x) = \\int_0^x (t^2 - 1) \\, dt$ reaches its global minimum at $x = 1$, where the rate of change $f(1) = 0$.',
  panels: [
    {
      title: 'Integrand f(t) = t² - 1',
      x: [-0.2, 2.2],
      y: [-1.4, 3.4],
      curves: [
        { id: 'f', fn: f, d: df, label: 'y = t² - 1' },
      ],
      marks: [
        { type: 'area', curve: 'f', from: 0, to: 1.6 },
        { type: 'vline', x: 1.6, to: 'curve:f', label: 'x=1.6', dy: 18 },
        { type: 'point', curve: 'f', at: 1 },
      ],
      checks: [
        [
          'f(1) is 0 and f(0) is -1',
          () => f(1) === 0 && f(0) === -1,
        ],
      ],
    },
    {
      title: 'Accumulation A(x) = x³/3 - x',
      x: [-0.2, 2.2],
      y: [-1.2, 1.4],
      curves: [
        { id: 'A', fn: A, d: dA, label: 'y = x³/3 - x' },
      ],
      marks: [
        { type: 'point', curve: 'A', at: 1 },
        { type: 'tangent', curve: 'A', at: 1, span: 0.8, label: 'A′(1)=0' },
        { type: 'vline', x: 1, to: 'curve:A', label: 'x=1' },
      ],
      checks: [
        [
          'argmin A is 1 and A(1) is -2/3',
          () => {
            const minX = argmin(A, [0, 2]);
            return Math.abs(minX - 1) < 1e-3 && Math.abs(A(1) - (-2 / 3)) < 1e-9;
          },
        ],
      ],
    },
  ],
});
