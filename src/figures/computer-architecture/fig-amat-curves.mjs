import { defineFigure } from '../../lib/plot/index.mjs';

const f1 = (x) => 1.0 + 40.0 * x;
const df1 = () => 40.0;
const f2 = (x) => 1.0 + 15.0 * x;
const df2 = () => 15.0;

export default defineFigure({
  alt: 'Average Memory Access Time AMAT curves as a function of level-one cache miss rate, comparing single-level cache with two-level hierarchy.',
  caption: 'Average Memory Access Time (AMAT) vs. L1 miss rate $m_1$, contrasting a direct main-memory penalty ($t_{\\text{miss}}=40$) with an intermediate L2 cache ($t_{\\text{miss}}=15$).',
  x: [0, 0.12],
  y: [0, 6],
  curves: [
    { id: 'c1', fn: f1, d: df1, label: 'L1 + DRAM' },
    { id: 'c2', fn: f2, d: df2, label: 'L1 + L2 + DRAM' },
  ],
  marks: [
    { type: 'point', curve: 'c1', at: 0.06 },
    { type: 'point', curve: 'c2', at: 0.06 },
    { type: 'vline', x: 0.06, to: f1(0.06), dy: 18, label: 'm1=6%' },
    { type: 'hline', y: f1(0.06), to: 0.06, label: '3.4 cyc' },
    { type: 'hline', y: f2(0.06), to: 0.06, label: '1.9 cyc' },
  ],
  checks: [
    ['f1 at zero is L1 hit time', () => Math.abs(f1(0) - 1.0) < 1e-9],
    ['f2 at zero is L1 hit time', () => Math.abs(f2(0) - 1.0) < 1e-9],
    ['f1 exceeds f2 for positive miss rate', () => f1(0.06) > f2(0.06)],
  ],
});
