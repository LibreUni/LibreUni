import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { PlotFrame, polyline } from './plot';

const speedup = (parallelFraction: number, processors: number) => 1 / ((1 - parallelFraction) + parallelFraction / processors);
const x = (processors: number) => 76 + ((processors - 1) / 63) * 600;
const y = (value: number) => 276 - (Math.min(value, 20) / 20) * 220;

function SpeedupPlot({ parallelFraction, processors }: { parallelFraction: number; processors: number }) {
  const points = Array.from({ length: 64 }, (_, index) => index + 1).map((count) => [x(count), y(speedup(parallelFraction, count))] as [number, number]);
  const current = speedup(parallelFraction, processors);
  return <PlotFrame label="Amdahl speedup curve as processor count increases">
    <polyline points={polyline(points)} fill="none" stroke="#3b82f6" strokeWidth="4" />
    <line x1="76" x2="676" y1={y(1 / (1 - parallelFraction))} y2={y(1 / (1 - parallelFraction))} stroke="#e11d48" strokeDasharray="7 6" />
    <circle cx={x(processors)} cy={y(current)} r="7" fill="#3b82f6" />
    <text x={x(processors)} y={Math.max(34, y(current) - 12)} textAnchor="middle" fill="currentColor" fontSize="13">{current.toFixed(2)}×</text>
    <text x="620" y={Math.max(34, y(1 / (1 - parallelFraction)) - 8)} fill="#e11d48" fontSize="12">serial ceiling</text>
  </PlotFrame>;
}

export default function AmdahlPlayground() {
  const [parallelPercent, setParallelPercent] = useState(90);
  const [processors, setProcessors] = useState(8);
  const parallelFraction = parallelPercent / 100;
  return <InteractivePlayground
    title="Expose Amdahl’s serial ceiling"
    description="Vary the parallel fraction and processor count; the curve approaches a ceiling fixed by the serial work."
    status={`${speedup(parallelFraction, processors).toFixed(2)}× speedup`}
    staticCaption="Even abundant parallel hardware cannot remove the execution time of the serial fraction."
    staticContent={<SpeedupPlot parallelFraction={0.9} processors={8} />}
  >
    <div className="grid gap-4 md:grid-cols-2">
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Parallel work = {parallelPercent}%<input aria-label="Parallel fraction" type="range" min="50" max="99" value={parallelPercent} onChange={(event) => setParallelPercent(Number(event.target.value))} /></label>
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Processors = {processors}<input aria-label="Processor count" type="range" min="1" max="64" value={processors} onChange={(event) => setProcessors(Number(event.target.value))} /></label>
    </div>
    <SpeedupPlot parallelFraction={parallelFraction} processors={processors} />
  </InteractivePlayground>;
}
