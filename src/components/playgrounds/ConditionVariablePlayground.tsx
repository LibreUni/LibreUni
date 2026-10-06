import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type ThreadState = 'running' | 'ready' | 'blocked' | 'sleeping' | 'done';
type Snapshot = {
  event: string;
  buffer: string[];
  mutex: string;
  producer: ThreadState;
  consumerA: ThreadState;
  consumerB?: ThreadState;
  wakeup: string;
  verdict: string;
};

const traces: Record<string, { label: string; states: Snapshot[] }> = {
  correct: {
    label: 'Mutex + while-loop condition wait',
    states: [
      { event: 'Initial state', buffer: [], mutex: 'free', producer: 'ready', consumerA: 'ready', wakeup: 'none', verdict: 'The predicate buffer.length > 0 is false.' },
      { event: 'Consumer locks and tests the predicate', buffer: [], mutex: 'consumer A', producer: 'ready', consumerA: 'running', wakeup: 'none', verdict: 'The test and transition to wait occur while the mutex protects the predicate.' },
      { event: 'wait(not_empty, mutex) atomically releases and blocks', buffer: [], mutex: 'free', producer: 'ready', consumerA: 'blocked', wakeup: 'armed', verdict: 'There is no gap in which a signal can be lost.' },
      { event: 'Producer locks, enqueues X, and signals', buffer: ['X'], mutex: 'producer', producer: 'running', consumerA: 'ready', wakeup: 'delivered', verdict: 'Signal makes the consumer eligible; it does not transfer the mutex.' },
      { event: 'Producer unlocks; consumer reacquires', buffer: ['X'], mutex: 'consumer A', producer: 'done', consumerA: 'running', wakeup: 'consumed', verdict: 'Mesa semantics require testing the predicate again after reacquiring.' },
      { event: 'Consumer removes X and unlocks', buffer: [], mutex: 'free', producer: 'done', consumerA: 'done', wakeup: 'none', verdict: 'Safety and progress both hold for this trace.' },
    ],
  },
  lost: {
    label: 'Broken check-then-sleep',
    states: [
      { event: 'Initial state', buffer: [], mutex: 'free', producer: 'ready', consumerA: 'ready', wakeup: 'none', verdict: 'The predicate is false.' },
      { event: 'Consumer checks empty without holding the mutex', buffer: [], mutex: 'free', producer: 'ready', consumerA: 'running', wakeup: 'not armed', verdict: 'The consumer intends to sleep, but has not made that intention visible.' },
      { event: 'Producer enqueues X and signals', buffer: ['X'], mutex: 'producer', producer: 'running', consumerA: 'ready', wakeup: 'lost', verdict: 'No waiter was registered when the signal occurred.' },
      { event: 'Producer unlocks and finishes', buffer: ['X'], mutex: 'free', producer: 'done', consumerA: 'ready', wakeup: 'lost', verdict: 'Work exists, but no future event is required to signal again.' },
      { event: 'Consumer finally sleeps', buffer: ['X'], mutex: 'free', producer: 'done', consumerA: 'sleeping', wakeup: 'lost', verdict: 'Liveness fails: the consumer can sleep forever beside available work.' },
    ],
  },
  ifcheck: {
    label: 'Broken if-check after wakeup',
    states: [
      { event: 'Two consumers wait for one item', buffer: [], mutex: 'free', producer: 'ready', consumerA: 'blocked', consumerB: 'blocked', wakeup: 'armed', verdict: 'Both consumers depend on the same predicate.' },
      { event: 'Producer enqueues X and broadcasts', buffer: ['X'], mutex: 'producer', producer: 'running', consumerA: 'ready', consumerB: 'ready', wakeup: 'broadcast', verdict: 'Both consumers become ready; neither owns the mutex yet.' },
      { event: 'Consumer A reacquires and removes X', buffer: [], mutex: 'consumer A', producer: 'done', consumerA: 'running', consumerB: 'ready', wakeup: 'consumed', verdict: 'The predicate becomes false before consumer B runs.' },
      { event: 'Consumer B reacquires but does not re-test', buffer: [], mutex: 'consumer B', producer: 'done', consumerA: 'done', consumerB: 'running', wakeup: 'consumed', verdict: 'Safety fails: an if-check assumes a condition remains true after wakeup.' },
    ],
  },
};

const stateStyle: Record<ThreadState, string> = {
  running: 'border-emerald-500 bg-emerald-500/10',
  ready: 'border-sky-500 bg-sky-500/10',
  blocked: 'border-amber-500 bg-amber-500/10',
  sleeping: 'border-rose-500 bg-rose-500/10',
  done: 'border-light-border bg-light-bg/50 dark:border-dark-border dark:bg-dark-bg/40',
};

function SnapshotView({ traceKey, step }: { traceKey: string; step: number }) {
  const snapshot = traces[traceKey].states[step];
  return (
    <div>
      <div className={`grid gap-3 ${snapshot.consumerB ? 'md:grid-cols-[1fr_1fr_1fr_1.2fr]' : 'md:grid-cols-[1fr_1fr_1.2fr]'}`}>
        <section className={`rounded-xl border p-4 ${stateStyle[snapshot.producer]}`}><div className="text-xs font-black uppercase tracking-wide">Producer</div><div className="mt-2 text-lg font-bold">{snapshot.producer}</div></section>
        <section className={`rounded-xl border p-4 ${stateStyle[snapshot.consumerA]}`}><div className="text-xs font-black uppercase tracking-wide">Consumer A</div><div className="mt-2 text-lg font-bold">{snapshot.consumerA}</div></section>
        {snapshot.consumerB && <section className={`rounded-xl border p-4 ${stateStyle[snapshot.consumerB]}`}><div className="text-xs font-black uppercase tracking-wide">Consumer B</div><div className="mt-2 text-lg font-bold">{snapshot.consumerB}</div></section>}
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-wide">Bounded buffer</span><span className="font-mono text-xs">mutex: {snapshot.mutex}</span></div><div className="mt-3 flex min-h-12 gap-2">{snapshot.buffer.length ? snapshot.buffer.map((item, index) => <span key={`${item}-${index}`} className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary font-mono font-black text-white">{item}</span>) : <span className="text-sm text-light-muted dark:text-dark-muted">empty</span>}</div></section>
      </div>
      <div className="mt-4 rounded-xl border border-light-border p-4 dark:border-dark-border">
        <div className="text-xs font-black uppercase tracking-wide text-primary">{snapshot.event}</div>
        <p className="mb-0 mt-2 text-sm leading-relaxed">{snapshot.verdict}</p>
        <p className="mb-0 mt-2 font-mono text-xs text-light-muted dark:text-dark-muted">wakeup state: {snapshot.wakeup}</p>
      </div>
    </div>
  );
}

export default function ConditionVariablePlayground() {
  const [traceKey, setTraceKey] = useState('correct');
  const [step, setStep] = useState(0);
  const trace = traces[traceKey];

  const chooseTrace = (next: string) => {
    setTraceKey(next);
    setStep(0);
  };

  return (
    <InteractivePlayground
      title="Place a context switch inside a condition-variable protocol"
      description="Compare the atomic wait protocol with a lost-wakeup gap and an if-check that fails under Mesa semantics. The buffer predicate—not the notification—is the source of truth."
      status={`Event ${step + 1} of ${trace.states.length}`}
      onReset={() => { setTraceKey('correct'); setStep(0); }}
      staticContent={<SnapshotView traceKey="lost" step={traces.lost.states.length - 1} />}
      staticCaption="Static state: a signal occurs between an unlocked emptiness check and sleep. The notification is lost, leaving the consumer asleep while data is available."
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 md:grid-cols-[18rem_1fr] md:items-end">
        <label className="grid gap-1 text-sm font-semibold">Protocol trace
          <select aria-label="Condition variable protocol trace" className="input-field" value={traceKey} onChange={(event) => chooseTrace(event.target.value)}>
            {Object.entries(traces).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Trace event = {step + 1}
          <input aria-label="Condition variable trace event" type="range" min="0" max={trace.states.length - 1} value={step} onChange={(event) => setStep(Number(event.target.value))} />
        </label>
      </div>
      <SnapshotView traceKey={traceKey} step={step} />
    </InteractivePlayground>
  );
}
