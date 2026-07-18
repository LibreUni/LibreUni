import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const states = [
  ['[10 | 20]', '[3, 7]', '[12, 18]', '[24, 31]'],
  ['[10 | 20 | 24]', '[3, 7]', '[12, 18]', '[31]'],
  ['[10 | 20]', '[3, 7]', '[12, 18]', '[24, 27]', '[31]'],
];
export default function BTreePlayground() { const [step, setStep] = useState(0); return <InteractivePlayground title="Split a B-tree page" description="A full leaf splits, promotes a separator, and preserves sorted ranges." staticCaption="B-tree updates split bounded pages instead of extending a pointer-heavy path." staticContent={<div className="grid gap-2 sm:grid-cols-3">{states[2].map((node) => <div key={node} className="rounded border border-primary bg-primary/10 p-3 text-center font-mono">{node}</div>)}</div>} status={`operation ${step + 1} of ${states.length}`}><div className="grid gap-2 sm:grid-cols-3">{states[step].map((node) => <div key={node} className="rounded border border-primary bg-primary/10 p-3 text-center font-mono">{node}</div>)}</div><div className="mt-4 flex gap-3"><button type="button" className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white" onClick={() => setStep((step + 1) % states.length)}>Next split step</button><button type="button" className="rounded-lg border border-light-border px-4 py-2 text-sm font-bold dark:border-dark-border" onClick={() => setStep(0)}>Reset</button></div></InteractivePlayground>; }
