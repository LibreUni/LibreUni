import { defineFigure } from '../../lib/plot/index.mjs';

const f_ovh = (q) => 20 / q;
const df_ovh = (q) => -20 / (q * q);
const f_resp = (q) => 0.5 * q;
const df_resp = () => 0.5;

export default defineFigure({
  alt: 'Scheduling quantum trade-off showing context switch overhead percentage decaying inversely with quantum size while interactive latency scales linearly.',
  caption: 'Round-Robin trade-off: context-switch overhead $\\delta/q$ (decaying as $O(1/q)$) vs. interactive queue response latency (increasing linearly with quantum size $q$).',
  x: [1, 20],
  y: [0, 25],
  curves: [
    { id: 'ovh', fn: f_ovh, d: df_ovh, label: 'Switch overhead (%)' },
    { id: 'resp', fn: f_resp, d: df_resp, label: 'Response latency (ms)' },
  ],
  marks: [
    { type: 'point', curve: 'ovh', at: 10 },
    { type: 'point', curve: 'resp', at: 10 },
    { type: 'vline', x: 10, to: 10, dy: 18, label: 'q = 10 ms' },
    { type: 'hline', y: f_ovh(10), to: 10, label: '2.0%' },
    { type: 'hline', y: f_resp(10), to: 10, label: '5.0 ms' },
  ],
  checks: [
    ['overhead at q=1 is 20%', () => Math.abs(f_ovh(1) - 20) < 1e-9],
    ['overhead at q=10 is 2%', () => Math.abs(f_ovh(10) - 2) < 1e-9],
    ['latency at q=10 is 5ms', () => Math.abs(f_resp(10) - 5) < 1e-9],
  ],
});
