import { defineFigure } from '../../lib/plot/index.mjs';

const f1 = (x) => x + 1;
const df1 = () => 1;

const f2Left = () => -1;
const f2Right = () => 1;
const df2 = () => 0;

const f3 = (x) => Math.sin(1 / x);

export default defineFigure({
  alt: 'Comparison of three discontinuity types: removable at (1, 2), jump discontinuity at x = 0, and essential oscillation of sin(1/x).',
  caption: 'Three types of discontinuity: removable (hole at $(1, 2)$), jump (finite gap at $x = 0$), and essential (infinite oscillation as $x \\to 0$).',
  panels: [
    {
      title: 'Removable',
      x: [-1, 3],
      y: [-0.5, 4.5],
      curves: [
        { id: 'f1', fn: f1, d: df1, domain: [-1, 3], exclude: [[0.98, 1.02]], label: 'y = (x²-1)/(x-1)' },
      ],
      marks: [
        { type: 'point', x: 1, y: 2, open: true },
        { type: 'vline', x: 1, to: 2, label: 'x=1' },
      ],
      checks: [
        [
          'open point y equals computed limit 2',
          () => {
            const lim = 2;
            const evalRem = (x) => (x * x - 1) / (x - 1);
            return Math.abs(evalRem(1 + 1e-6) - lim) < 1e-4;
          },
        ],
      ],
    },
    {
      title: 'Jump',
      x: [-2, 2],
      y: [-2, 2],
      curves: [
        { id: 'f2l', fn: f2Left, d: df2, domain: [-2, -0.01] },
        { id: 'f2r', fn: f2Right, d: df2, domain: [0, 2] },
      ],
      marks: [
        { type: 'point', x: 0, y: -1, open: true },
        { type: 'point', x: 0, y: 1, open: false },
      ],
      checks: [
        [
          'jump gap is 2 between left and right limits',
          () => Math.abs(f2Right() - f2Left()) === 2,
        ],
      ],
    },
    {
      title: 'Essential',
      x: [-0.5, 0.5],
      y: [-1.2, 1.2],
      curves: [
        { id: 'f3', fn: f3, domain: [-0.5, 0.5], exclude: [[-0.005, 0.005]], label: 'y = sin(1/x)' },
      ],
      marks: [],
      checks: [
        [
          'oscillates between -1 and 1',
          () => Math.abs(f3(2 / Math.PI) - 1) < 1e-9 && Math.abs(f3(2 / (3 * Math.PI)) - (-1)) < 1e-9,
        ],
      ],
    },
  ],
});
