import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const minutesPerMonth = 30 * 24 * 60;

function BudgetBars({ target, dependencies }: { target: number; dependencies: number }) {
  const componentAvailability = 0.999;
  const composed = componentAvailability ** dependencies;
  const targetBudget = (1 - target) * minutesPerMonth;
  const composedDowntime = (1 - composed) * minutesPerMonth;
  const scale = Math.max(targetBudget, composedDowntime, 1);
  return <div className="grid gap-4 py-5" role="img" aria-label="Comparison of target error budget and composed dependency downtime">
    <div><div className="mb-1 flex justify-between text-xs"><span>Target error budget</span><strong>{targetBudget.toFixed(1)} min/month</strong></div><div className="h-6 rounded bg-slate-200 dark:bg-slate-700"><div className="h-6 rounded bg-primary" style={{ width: `${(targetBudget / scale) * 100}%` }} /></div></div>
    <div><div className="mb-1 flex justify-between text-xs"><span>Series dependency model</span><strong>{composedDowntime.toFixed(1)} min/month</strong></div><div className="h-6 rounded bg-slate-200 dark:bg-slate-700"><div className={`h-6 rounded ${composedDowntime > targetBudget ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${(composedDowntime / scale) * 100}%` }} /></div></div>
  </div>;
}

export default function ReliabilityBudgetPlayground() {
  const [targetBasisPoints, setTargetBasisPoints] = useState(9990);
  const [dependencies, setDependencies] = useState(3);
  const target = targetBasisPoints / 10000;
  const composed = 0.999 ** dependencies;
  return <InteractivePlayground
    title="Turn an availability adjective into a budget"
    description="Each required dependency is modeled at 99.9% availability with independent failures. The series model is a starting hypothesis, not evidence of independence."
    status={`${(composed * 100).toFixed(3)}% modeled service availability`}
    staticCaption="A quality target becomes testable when expressed as a time budget and composed with dependency assumptions."
    staticContent={<BudgetBars target={0.999} dependencies={3} />}
  >
    <div className="grid gap-4 md:grid-cols-2">
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Target = {(target * 100).toFixed(2)}%<input aria-label="Availability target" type="range" min="9900" max="9999" value={targetBasisPoints} onChange={(event) => setTargetBasisPoints(Number(event.target.value))} /></label>
      <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Required dependencies = {dependencies}<input aria-label="Required dependency count" type="range" min="1" max="8" value={dependencies} onChange={(event) => setDependencies(Number(event.target.value))} /></label>
    </div>
    <BudgetBars target={target} dependencies={dependencies} />
    <p className="text-sm">If every dependency is required, availability multiplies. Redundancy, correlated failures, recovery time, and partial-service behavior require a richer model and measurements.</p>
  </InteractivePlayground>;
}
