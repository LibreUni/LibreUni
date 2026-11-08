import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => x ** 2;
const df = (x) => 2 * x;
const a = 1;

export default defineFigure({
  alt: 'Secant lines with diminishing step sizes h = 1, 0.5, and 0.25 converging to the tangent line with slope 2 at x = 1 for y = x squared.',
  caption: 'Secant lines of $y = x^2$ at $a = 1$ converge to the tangent line of slope $f\'(1) = 2$ as $h \\to 0$.',
  x: [0.2, 2.3],
  y: [0, 5.5],
  curves: [
    { id: 'f', fn: f, d: df, label: 'y = x²' },
  ],
  marks: [
    { type: 'secant', curve: 'f', from: a, to: a + 1, label: 'h=1, m=3' },
    { type: 'secant', curve: 'f', from: a, to: a + 0.5, label: 'h=0.5, m=2.5' },
    { type: 'secant', curve: 'f', from: a, to: a + 0.25, label: 'h=0.25, m=2.25' },
    { type: 'tangent', curve: 'f', at: a, span: 1.0, label: 'tangent, m=2' },
    { type: 'point', curve: 'f', at: a },
    { type: 'point', curve: 'f', at: a + 1 },
    { type: 'point', curve: 'f', at: a + 0.5 },
    { type: 'point', curve: 'f', at: a + 0.25 },
  ],
  checks: [
    [
      'each secant slope is exactly 2 + h and tangent slope is 2',
      () => {
        const s1 = (f(a + 1) - f(a)) / 1;
        const s2 = (f(a + 0.5) - f(a)) / 0.5;
        const s3 = (f(a + 0.25) - f(a)) / 0.25;
        return s1 === 3 && s2 === 2.5 && s3 === 2.25 && df(a) === 2;
      },
    ],
  ],
});
