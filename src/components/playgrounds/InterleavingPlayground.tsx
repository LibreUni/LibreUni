import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type ThreadId = 'A' | 'B';
type Operation = { thread: ThreadId; op: 'load' | 'add' | 'store' | 'atomic'; label: string };

const schedules: Record<string, { name: string; operations: Operation[] }> = {
  lost: {
    name: 'Lost update',
    operations: [
      { thread: 'A', op: 'load', label: 'A: rA ← counter' },
      { thread: 'B', op: 'load', label: 'B: rB ← counter' },
      { thread: 'A', op: 'add', label: 'A: rA ← rA + 1' },
      { thread: 'B', op: 'add', label: 'B: rB ← rB + 1' },
      { thread: 'A', op: 'store', label: 'A: counter ← rA' },
      { thread: 'B', op: 'store', label: 'B: counter ← rB' },
    ],
  },
  serial: {
    name: 'Serialized critical sections',
    operations: [
      { thread: 'A', op: 'load', label: 'A: rA ← counter' },
      { thread: 'A', op: 'add', label: 'A: rA ← rA + 1' },
      { thread: 'A', op: 'store', label: 'A: counter ← rA' },
      { thread: 'B', op: 'load', label: 'B: rB ← counter' },
      { thread: 'B', op: 'add', label: 'B: rB ← rB + 1' },
      { thread: 'B', op: 'store', label: 'B: counter ← rB' },
    ],
  },
  atomic: {
    name: 'Atomic read-modify-write',
    operations: [
      { thread: 'A', op: 'atomic', label: 'A: atomic_fetch_add(counter, 1)' },
      { thread: 'B', op: 'atomic', label: 'B: atomic_fetch_add(counter, 1)' },
    ],
  },
};

function run(operations: Operation[], count: number) {
  const state: { counter: number; registers: Record<ThreadId, number | null>; completed: Record<ThreadId, boolean>; trace: string[] } = {
    counter: 0,
    registers: { A: null, B: null },
    completed: { A: false, B: false },
    trace: [],
  };
  operations.slice(0, count).forEach((operation) => {
    if (operation.op === 'load') state.registers[operation.thread] = state.counter;
    if (operation.op === 'add') state.registers[operation.thread] = (state.registers[operation.thread] ?? 0) + 1;
    if (operation.op === 'store') {
      state.counter = state.registers[operation.thread] ?? state.counter;
      state.completed[operation.thread] = true;
    }
    if (operation.op === 'atomic') {
      state.registers[operation.thread] = state.counter;
      state.counter += 1;
      state.completed[operation.thread] = true;
    }
    state.trace.push(operation.label);
  });
  return state;
}

function StateView({ scheduleKey, step }: { scheduleKey: string; step: number }) {
  const schedule = schedules[scheduleKey];
  const state = run(schedule.operations, step);
  const active = step > 0 ? schedule.operations[step - 1] : undefined;
  const finished = step === schedule.operations.length;
  const correct = finished && state.counter === 2;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_13rem]">
      <div className="grid gap-3 sm:grid-cols-2">
        {(['A', 'B'] as ThreadId[]).map((thread) => (
          <section key={thread} className={`rounded-xl border p-4 ${active?.thread === thread ? 'border-primary bg-primary/5' : 'border-light-border bg-light-bg/60 dark:border-dark-border dark:bg-dark-bg/40'}`}>
            <h4 className="m-0 text-sm font-black">Thread {thread}</h4>
            <div className="mt-3 rounded-lg bg-slate-950 p-3 font-mono text-xs leading-6 text-slate-100">
              <div className={active?.thread === thread && active.op === 'load' ? 'bg-primary/50' : ''}>r{thread} = counter;</div>
              <div className={active?.thread === thread && active.op === 'add' ? 'bg-primary/50' : ''}>r{thread} = r{thread} + 1;</div>
              <div className={active?.thread === thread && active.op === 'store' ? 'bg-primary/50' : ''}>counter = r{thread};</div>
              <div className={active?.thread === thread && active.op === 'atomic' ? 'bg-primary/50' : 'text-slate-500'}>atomic_fetch_add(&counter, 1);</div>
            </div>
            <p className="mb-0 mt-3 text-sm">Register r{thread}: <strong>{state.registers[thread] ?? 'not loaded'}</strong></p>
          </section>
        ))}
      </div>
      <section className={`flex min-h-44 flex-col items-center justify-center rounded-xl border-2 p-5 text-center ${finished ? (correct ? 'border-emerald-500 bg-emerald-500/5' : 'border-rose-500 bg-rose-500/5') : 'border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface'}`}>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-light-muted dark:text-dark-muted">Shared memory</div>
        <div className="mt-2 font-mono text-5xl font-black tabular-nums">{state.counter}</div>
        <div className="mt-2 text-sm font-semibold">counter</div>
        {finished && <div className={`mt-3 text-xs font-bold ${correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{correct ? 'Invariant holds: two increments committed' : 'Invariant fails: one increment was lost'}</div>}
      </section>
    </div>
  );
}

export default function InterleavingPlayground() {
  const [scheduleKey, setScheduleKey] = useState('lost');
  const [step, setStep] = useState(0);
  const schedule = schedules[scheduleKey];
  const state = useMemo(() => run(schedule.operations, step), [schedule, step]);

  const changeSchedule = (next: string) => {
    setScheduleKey(next);
    setStep(0);
  };

  return (
    <InteractivePlayground
      title="Find the lost update in an interleaving"
      description="Both threads execute counter++. Scrub one memory-relevant operation at a time; then compare an unsafe schedule, serialized critical sections, and an atomic read-modify-write."
      status={`Step ${step} of ${schedule.operations.length} · counter = ${state.counter}`}
      onReset={() => { setScheduleKey('lost'); setStep(0); }}
      staticContent={<StateView scheduleKey="lost" step={schedules.lost.operations.length} />}
      staticCaption="The unsafe schedule finishes both increments with counter = 1 because each thread stores a value derived from the same stale read."
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 md:grid-cols-[15rem_1fr] md:items-end">
        <label className="grid gap-1 text-sm font-semibold">Schedule
          <select aria-label="Interleaving schedule" className="input-field" value={scheduleKey} onChange={(event) => changeSchedule(event.target.value)}>
            {Object.entries(schedules).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Executed operations = {step}
          <input aria-label="Executed interleaving operations" type="range" min="0" max={schedule.operations.length} value={step} onChange={(event) => setStep(Number(event.target.value))} />
        </label>
      </div>
      <StateView scheduleKey={scheduleKey} step={step} />
      <p className="mb-0 mt-4 min-h-6 font-mono text-xs text-light-muted dark:text-dark-muted">{step === 0 ? 'No instruction has executed.' : schedule.operations[step - 1].label}</p>
    </InteractivePlayground>
  );
}
