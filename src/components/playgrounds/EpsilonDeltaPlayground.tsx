import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

function Visual({ epsilon }: { epsilon: number }) {
  const xScale = (x: number) => 76 + (x - 1.35) * 450;
  const yScale = (y: number) => 276 - (y - 3.5) * 92;
  const delta = epsilon / 3;
  const curve = Array.from({ length: 80 }, (_, i) => { const x = 1.35 + (i / 79) * 1.35; return [xScale(x), yScale(3 * x - 1)] as [number, number]; });
  return <PlotFrame label="Epsilon band and corresponding delta window"><rect x={xScale(2 - delta)} y={yScale(5 + epsilon)} width={xScale(2 + delta) - xScale(2 - delta)} height={yScale(5 - epsilon) - yScale(5 + epsilon)} fill="#22c55e" opacity=".12" /><line x1={xScale(1.35)} x2={xScale(2.7)} y1={yScale(5 + epsilon)} y2={yScale(5 + epsilon)} stroke="#ef4444" strokeDasharray="7 6" /><line x1={xScale(1.35)} x2={xScale(2.7)} y1={yScale(5 - epsilon)} y2={yScale(5 - epsilon)} stroke="#ef4444" strokeDasharray="7 6" /><line x1={xScale(2 - delta)} x2={xScale(2 - delta)} y1="40" y2="296" stroke="#22c55e" strokeDasharray="7 6" /><line x1={xScale(2 + delta)} x2={xScale(2 + delta)} y1="40" y2="296" stroke="#22c55e" strokeDasharray="7 6" /><polyline points={polyline(curve)} fill="none" stroke="#2563eb" strokeWidth="4" /><circle cx={xScale(2)} cy={yScale(5)} r="6" fill="#2563eb" /><text x="500" y={yScale(5 + epsilon) - 8} fill="currentColor" fontSize="15">ε-band</text><text x={xScale(2 - delta) + 8} y="66" fill="currentColor" fontSize="15">δ-window</text></PlotFrame>;
}

export default function EpsilonDeltaPlayground() {
  const [epsilon, setEpsilon] = useState(0.45);
  return <InteractivePlayground title="Move the ε-band" description="Change ε and watch the corresponding δ-window shrink or expand." staticCaption="For f(x)=3x−1 at c=2, the δ-window pulls back the ε-band around L=5." staticContent={<Visual epsilon={0.45} />} status={`ε = ${epsilon.toFixed(2)}, δ = ${(epsilon / 3).toFixed(2)}`}><label className="interactive-playground-controls flex items-center gap-3">ε = {epsilon.toFixed(2)}<input aria-label="Epsilon" type="range" min="0.08" max="0.8" step="0.01" value={epsilon} onChange={(event) => setEpsilon(Number(event.target.value))} /></label><Visual epsilon={epsilon} /></InteractivePlayground>;
}
