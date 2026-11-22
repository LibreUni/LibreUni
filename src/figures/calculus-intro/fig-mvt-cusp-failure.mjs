import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => Math.cbrt(x) ** 2;

export default defineFigure({
  alt: 'Failure of the Mean Value Theorem for the cusp function x to the two thirds on [-1, 1], where the chord is horizontal but no horizontal tangent exists.',
  caption: 'Failure of the Mean Value Theorem when differentiability fails at an interior point: $f(x) = x^{2/3}$ has chord slope $0$ on $[-1, 1]$, but $f\'(x) \\ne 0$ for all $x \\ne 0$.',
  x: [-1.3, 1.3],
  y: [-0.2, 1.4],
  curves: [
    { id: 'f', fn: f, label: 'y = x^(2/3)' },
  ],
  marks: [
    { type: 'secant', curve: 'f', from: -1, to: 1, label: 'chord slope 0' },
    { type: 'point', curve: 'f', at: 0 },
    { type: 'point', curve: 'f', at: -1 },
    { type: 'point', curve: 'f', at: 1 },
  ],
  checks: [
    [
      'chord slope is 0 and numerical derivative is nonzero away from 0',
      () => {
        const chord = (f(1) - f(-1)) / 2;
        let noZero = true;
        for (let x = -1; x <= 1; x += 0.05) {
          if (Math.abs(x) < 0.02) continue;
          const numDeriv = (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;
          if (Math.abs(numDeriv) < 1e-3) noZero = false;
        }
        return chord === 0 && noZero;
      },
    ],
  ],
});
