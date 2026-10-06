import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

const samples = Array.from({ length: 63 }, (_, index) => 4 + index * 2);
const x = (n: number) => 76 + ((n - 4) / 124) * 600;
const y = (value: number) => 276 - (Math.log2(Math.max(1, value)) / 14) * 220;

function GrowthPlot({ n }: { n: number }) {
  const curves = [
    { label: 'n', color: '#3b82f6', values: samples.map((value) => [x(value), y(value)] as [number, number]) },
    { label: 'n log₂ n', color: '#8b5cf6', values: samples.map((value) => [x(value), y(value * Math.log2(value))] as [number, number]) },
    { label: 'n²', color: '#e11d48', values: samples.map((value) => [x(value), y(value * value)] as [number, number]) },
  ];
  return <PlotFrame label="Log-scale comparison of linear, n log n, and quadratic growth">
    {curves.map((curve, index) => <g key={curve.label}><polyline points={polyline(curve.values)} fill="none" stroke={curve.color} strokeWidth="4" /><text x="92" y={62 + index * 22} fill={curve.color} fontSize="14" fontWeight="700">{curve.label}</text></g>)}
    <line x1={x(n)} x2={x(n)} y1="42" y2="276" stroke="currentColor" strokeDasharray="6 6" opacity="0.6" />
    <text x={x(n)} y="306" textAnchor="middle" fill="currentColor" fontSize="14">n={n}</text>
    <text x="32" y="170" transform="rotate(-90 32 170)" fill="currentColor" fontSize="12">operations (log₂ scale)</text>
  </PlotFrame>;
}

export default function ComplexityGrowthPlayground() {
  const [n, setN] = useState(32);
  return <InteractivePlayground
    title="Compare growth at the same input size"
    description="Move n while the logarithmic vertical scale keeps linear, n log n, and quadratic costs visible together."
    status={`n = ${n}`}
    staticCaption="A logarithmic vertical scale makes different growth families comparable without hiding the quadratic curve."
    staticContent={<GrowthPlot n={32} />}
  >
    <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">
      Input size n = {n}
      <input aria-label="Input size" type="range" min="4" max="128" step="2" value={n} onChange={(event) => setN(Number(event.target.value))} />
    </label>
    <GrowthPlot n={n} />
    <div className="grid grid-cols-3 gap-2 text-center text-sm">
      <div><strong>{n.toLocaleString()}</strong><span className="block text-xs text-light-muted dark:text-dark-muted">n</span></div>
      <div><strong>{Math.round(n * Math.log2(n)).toLocaleString()}</strong><span className="block text-xs text-light-muted dark:text-dark-muted">n log₂ n</span></div>
      <div><strong>{(n * n).toLocaleString()}</strong><span className="block text-xs text-light-muted dark:text-dark-muted">n²</span></div>
    </div>
  </InteractivePlayground>;
}
