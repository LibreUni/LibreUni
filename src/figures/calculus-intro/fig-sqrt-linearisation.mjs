import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => Math.sqrt(x);
const df = (x) => 1 / (2 * Math.sqrt(x));
const a = 4;
const x0 = 4.4;
const L = (x) => 2 + (x - 4) / 4;

export default defineFigure({
  alt: 'Linear approximation of the square root function near x = 4, showing the tangent line L(x) and the small truncation error at x = 4.4.',
  caption: 'Linear approximation $L(x) = 2 + \\frac{x-4}{4}$ to $\\sqrt{x}$ at $a = 4$: at $x = 4.4$, $L(4.4) = 2.100$ exceeds $\\sqrt{4.4} \\approx 2.098$ by $0.0024$.',
  x: [2.5, 5.5],
  y: [1.4, 2.5],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = √x' },
  ],
  marks: [
    { type: 'tangent', curve: 'f', at: a, span: 2.0, label: 'L(x)' },
    { type: 'point', curve: 'f', at: a },
    { type: 'point', curve: 'f', at: x0 },
    { type: 'vline', x: a, to: 'curve:f', label: 'a=4' },
    { type: 'vline', x: x0, to: 'curve:f', label: 'x=4.4', dy: 18 },
  ],
  checks: [
    [
      'linearization error is positive and approx 0.00238',
      () => {
        const err = L(x0) - f(x0);
        return err > 0 && Math.abs(err - 0.002382) < 1e-5;
      },
    ],
  ],
});
