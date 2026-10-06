import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

const unsuccessful = (alpha: number) => 1 / (1 - alpha);
const successful = (alpha: number) => Math.log(1 / (1 - alpha)) / alpha;
const x = (alpha: number) => 76 + alpha * 600;
const y = (probes: number) => 276 - (Math.min(probes, 20) / 20) * 220;

function ProbePlot({ alpha }: { alpha: number }) {
  const loads = Array.from({ length: 90 }, (_, index) => 0.05 + index * 0.01);
  return <PlotFrame label="Expected successful and unsuccessful probes as hash-table load rises">
    <polyline points={polyline(loads.map((value) => [x(value), y(successful(value))]))} fill="none" stroke="#3b82f6" strokeWidth="4" />
    <polyline points={polyline(loads.map((value) => [x(value), y(unsuccessful(value))]))} fill="none" stroke="#e11d48" strokeWidth="4" />
    <line x1={x(alpha)} x2={x(alpha)} y1="42" y2="276" stroke="currentColor" strokeDasharray="6 6" opacity="0.6" />
    <text x="98" y="62" fill="#3b82f6" fontSize="14" fontWeight="700">successful lookup</text>
    <text x="98" y="84" fill="#e11d48" fontSize="14" fontWeight="700">unsuccessful lookup</text>
  </PlotFrame>;
}

export default function HashProbeCostPlayground() {
  const [percent, setPercent] = useState(70);
  const alpha = percent / 100;
  return <InteractivePlayground
    title="Stress the uniform-probing assumption"
    description="The formulas describe idealized uniform probing; the curve shows why a bounded load factor is part of the expected-time claim."
    status={`α = ${alpha.toFixed(2)}`}
    staticCaption="Expected unsuccessful probes diverge as an open-addressed table approaches full occupancy."
    staticContent={<ProbePlot alpha={0.7} />}
  >
    <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Load factor α = {alpha.toFixed(2)}<input aria-label="Hash table load factor" type="range" min="5" max="95" value={percent} onChange={(event) => setPercent(Number(event.target.value))} /></label>
    <ProbePlot alpha={alpha} />
    <p className="text-sm">Expected probes: <strong>{successful(alpha).toFixed(2)}</strong> for a successful lookup and <strong>{unsuccessful(alpha).toFixed(2)}</strong> for an unsuccessful lookup.</p>
  </InteractivePlayground>;
}
