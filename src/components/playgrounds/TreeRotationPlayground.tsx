import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const steps = [
  { title: 'Before rotation', nodes: [['x', 260, 80], ['y', 410, 150], ['A', 150, 220], ['B', 330, 220], ['C', 500, 220]], edges: [['x', 'y'], ['x', 'A'], ['y', 'B'], ['y', 'C']] },
  { title: 'Move y above x', nodes: [['y', 260, 80], ['x', 150, 150], ['C', 410, 150], ['A', 70, 220], ['B', 230, 220]], edges: [['y', 'x'], ['y', 'C'], ['x', 'A'], ['x', 'B']] },
];

function Tree({ step }: { step: typeof steps[number] }) {
  const positions = Object.fromEntries(step.nodes.map(([key, x, y]) => [key, { x: Number(x), y: Number(y) }]));
  return <svg viewBox="0 0 620 290" role="img" aria-label={step.title} className="h-auto w-full">{step.edges.map(([from, to]) => <line key={`${from}-${to}`} x1={positions[from].x} y1={positions[from].y + 22} x2={positions[to].x} y2={positions[to].y - 22} stroke="currentColor" opacity=".45" />)}{step.nodes.map(([key, x, y]) => <g key={key}><circle cx={x} cy={y} r="23" fill={key === 'x' || key === 'y' ? '#3b82f6' : '#94a3b8'} /><text x={x} y={Number(y) + 6} textAnchor="middle" fill="white" fontWeight="700">{key}</text></g>)}</svg>;
}

export default function TreeRotationPlayground() {
  const [step, setStep] = useState(0);
  const current = steps[step];
  return <InteractivePlayground title="Animate a right rotation" description="Advance one structural change at a time. The inorder sequence A, x, B, y, C remains unchanged." staticCaption="A right rotation changes local pointers while preserving inorder order." staticContent={<Tree step={steps[1]} />} status={`${current.title} · step ${step + 1} of ${steps.length}`}><Tree step={current} /><div className="flex flex-wrap gap-3"><button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white" onClick={() => setStep((step + 1) % steps.length)}>Next step</button><button type="button" className="rounded-lg border border-light-border px-4 py-2 text-sm font-bold dark:border-dark-border" onClick={() => setStep(0)}>Reset</button></div></InteractivePlayground>;
}
