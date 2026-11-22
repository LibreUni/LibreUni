import { defineFigure } from '../../lib/plot/index.mjs';

const f_seq = () => 1000;
const df_seq = () => 0;
const f_idx = (x) => 50 + 40000 * x;
const df_idx = () => 40000;
const s_star = 950 / 40000; // 0.02375

export default defineFigure({
  alt: 'Query execution cost model comparing sequential heap scan with unclustered index scan as selectivity varies, showing the crossover threshold at approximately 2.4 percent selectivity.',
  caption: 'Estimated I/O cost as a function of predicate selectivity $s$. The unclustered index scan dominates for small $s$ but exceeds the full sequential table scan at the crossover threshold $s^* \\approx 2.4\\%$.',
  x: [0, 0.06],
  y: [0, 2000],
  curves: [
    { id: 'seq', fn: f_seq, d: df_seq, label: 'Seq scan' },
    { id: 'idx', fn: f_idx, d: df_idx, label: 'Index scan' },
  ],
  marks: [
    { type: 'point', curve: 'idx', at: s_star },
    { type: 'vline', x: s_star, to: 1000, dy: 18, label: 's* ≈ 2.4%' },
    { type: 'hline', y: 1000, to: s_star, label: 'B=1000' },
  ],
  checks: [
    ['crossover occurs at s_star', () => Math.abs(f_idx(s_star) - f_seq(s_star)) < 1e-9],
    ['index scan cheaper below crossover', () => f_idx(0.01) < f_seq(0.01)],
    ['seq scan cheaper above crossover', () => f_idx(0.04) > f_seq(0.04)],
  ],
});
