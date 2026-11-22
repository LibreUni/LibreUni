import { defineFigure } from '../../lib/plot/index.mjs';

const f = (x) => (Math.abs(x) < 1e-6 ? 0 : x * Math.sin(1 / x));
const u = (x) => Math.abs(x);
const l = (x) => -Math.abs(x);

export default defineFigure({
  alt: 'Graph illustrating the squeeze theorem with x sin(1/x) bounded above by |x| and below by -|x| on [-0.4, 0.4].',
  caption: 'The squeeze theorem: $-|x| \\le x \\sin(1/x) \\le |x|$, trapping the oscillating function at the origin.',
  x: [-0.4, 0.4],
  y: [-0.45, 0.45],
  curves: [
    { id: 'f', fn: f, domain: [-0.4, 0.4], exclude: [[-0.001, 0.001]], label: 'y = x sin(1/x)' },
    { id: 'u', fn: u, domain: [-0.4, 0.4], style: 'dashed', label: 'y = |x|' },
    { id: 'l', fn: l, domain: [-0.4, 0.4], style: 'dashed', label: 'y = -|x|' },
  ],
  marks: [
    { type: 'point', curve: 'f', at: 0 },
  ],
  checks: [
    [
      '|f(x)| <= |x| at all non-zero samples',
      () => {
        for (let x = -0.4; x <= 0.4; x += 0.005) {
          if (Math.abs(x) < 0.002) continue;
          if (Math.abs(f(x)) > Math.abs(x) + 1e-9) return false;
        }
        return true;
      },
    ],
  ],
});
