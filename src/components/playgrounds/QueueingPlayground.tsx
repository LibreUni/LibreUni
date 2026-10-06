import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

const response = (rho: number) => 1 / (1 - rho);
const queue = (rho: number) => (rho * rho) / (1 - rho);
const x = (rho: number) => 76 + rho * 600;
const y = (value: number) => 276 - (Math.min(value, 20) / 20) * 220;

function QueuePlot({ rho }: { rho: number }) {
  const loads = Array.from({ length: 94 }, (_, index) => 0.05 + index * 0.01);
  return <PlotFrame label="Response time and queue growth as utilization approaches one">
    <polyline points={polyline(loads.map((value) => [x(value), y(response(value))]))} fill="none" stroke="#3b82f6" strokeWidth="4" />
    <polyline points={polyline(loads.map((value) => [x(value), y(queue(value))]))} fill="none" stroke="#e11d48" strokeWidth="4" />
    <line x1={x(rho)} x2={x(rho)} y1="42" y2="276" stroke="currentColor" strokeDasharray="6 6" opacity="0.6" />
    <text x="98" y="62" fill="#3b82f6" fontSize="14" fontWeight="700">normalized response time</text>
    <text x="98" y="84" fill="#e11d48" fontSize="14" fontWeight="700">mean queued work</text>
    <text x="570" y="306" fill="currentColor" fontSize="12">utilization ρ → 1</text>
  </PlotFrame>;
}

export default function QueueingPlayground() {
  const [percent, setPercent] = useState(65);
  const rho = percent / 100;
  return <InteractivePlayground
    title="Drive a bottleneck toward saturation"
    description="The model is deliberately idealized: it isolates why small load increases near capacity create large queues."
    status={`ρ = ${rho.toFixed(2)}`}
    staticCaption="Queueing delay is nonlinear near saturation; operating at 100% nominal capacity leaves no room for variability."
    staticContent={<QueuePlot rho={0.65} />}
  >
    <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Offered load = {percent}% of service capacity<input aria-label="Offered load" type="range" min="5" max="95" value={percent} onChange={(event) => setPercent(Number(event.target.value))} /></label>
    <QueuePlot rho={rho} />
    <p className="text-sm">At this load, normalized response time is <strong>{response(rho).toFixed(2)}×</strong> service time and the model predicts <strong>{queue(rho).toFixed(2)}</strong> requests waiting on average.</p>
  </InteractivePlayground>;
}
