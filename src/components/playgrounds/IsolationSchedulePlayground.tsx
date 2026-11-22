import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import SteppedSlider from '../SteppedSlider';
import { lostUpdateState } from './databaseModels.mjs';

const events = ['T₁ reads x=0', 'T₂ reads x=0', 'T₁ computes x+1', 'T₂ computes x+1', 'T₁ writes x=1', 'T₂ writes x=1'];

function scheduleState(step: number) {
  return {
    t1: step >= 3 ? 1 : step >= 1 ? 0 : '—',
    t2: step >= 4 ? 1 : step >= 2 ? 0 : '—',
    ...lostUpdateState(step),
  };
}

function Schedule({ step }: { step: number }) {
  const state = scheduleState(step);
  return <div className="grid gap-4">
    <ol className="grid gap-2 md:grid-cols-3">{events.map((event, index) => <li key={event} className={`list-none rounded-lg border p-3 text-sm ${index < step ? 'border-primary/40 bg-primary/10' : index === step ? 'border-amber-500/40 bg-amber-500/10' : 'border-light-border opacity-55 dark:border-dark-border'}`}><span className="mr-2 font-black tabular-nums">{index + 1}</span>{event}</li>)}</ol>
    <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded border border-light-border p-3 dark:border-dark-border"><span className="block text-xs text-light-muted dark:text-dark-muted">T₁ local</span><strong>{state.t1}</strong></div><div className="rounded border border-light-border p-3 dark:border-dark-border"><span className="block text-xs text-light-muted dark:text-dark-muted">T₂ local</span><strong>{state.t2}</strong></div><div className={`rounded border p-3 ${state.lost ? 'border-rose-500 bg-rose-500/10' : 'border-light-border dark:border-dark-border'}`}><span className="block text-xs text-light-muted dark:text-dark-muted">database x</span><strong>{state.database}</strong></div></div>
  </div>;
}

export default function IsolationSchedulePlayground() {
  const [step, setStep] = useState(0);
  const state = scheduleState(step);
  return <InteractivePlayground
    title="Expose a lost update in the schedule"
    description="Advance the interleaving. Both transactions read the same version, so the second write overwrites rather than composes with the first."
    status={state.lost ? 'lost update: expected x=2, observed x=1' : `${step} of ${events.length} events applied`}
    staticCaption="A schedule is the evidence: two successful transactions can still violate the intended increment invariant."
    staticContent={<Schedule step={6} />}
    onReset={() => setStep(0)}
  >
    <div className="interactive-playground-controls mb-5">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span>Schedule step: {step} of {events.length}</span>
      </div>
      <SteppedSlider
        ariaLabel="Schedule step"
        min={0}
        max={events.length}
        step={1}
        value={step}
        onChange={setStep}
        labels={['0', '1', '2', '3', '4', '5', '6']}
      />
    </div>
    <Schedule step={step} />
    <p className="text-sm">The final value alone cannot explain the anomaly. The read-from relation and write order show why both commits are individually valid but the pair is not equivalent to serial execution.</p>
  </InteractivePlayground>;
}
