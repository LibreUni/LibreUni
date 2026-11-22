import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Policy = 'FIFO' | 'LRU' | 'OPT';
type Step = { page: number; frames: Array<number | null>; fault: boolean; evicted: number | null; faults: number };

const traces: Record<string, number[]> = {
  locality: [1, 2, 3, 2, 1, 4, 1, 2, 5, 2, 1, 3],
  belady: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5],
  scan: [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
};

export function simulate(reference: number[], capacity: number, policy: Policy): Step[] {
  const frames: Array<number | null> = Array(capacity).fill(null);
  const loadedAt = new Map<number, number>();
  const lastUsed = new Map<number, number>();
  const steps: Step[] = [];
  let faults = 0;

  reference.forEach((page, index) => {
    const hitIndex = frames.indexOf(page);
    let evicted: number | null = null;
    const fault = hitIndex === -1;
    if (fault) {
      faults += 1;
      let slot = frames.indexOf(null);
      if (slot === -1) {
        if (policy === 'FIFO') {
          slot = frames.reduce<number>((best, candidate, candidateIndex) => ((loadedAt.get(candidate!) ?? Infinity) < (loadedAt.get(frames[best]!) ?? Infinity) ? candidateIndex : best), 0);
        } else if (policy === 'LRU') {
          slot = frames.reduce<number>((best, candidate, candidateIndex) => ((lastUsed.get(candidate!) ?? -1) < (lastUsed.get(frames[best]!) ?? -1) ? candidateIndex : best), 0);
        } else {
          const nextUse = (candidate: number | null) => {
            if (candidate === null) return Infinity;
            const distance = reference.slice(index + 1).indexOf(candidate);
            return distance === -1 ? Infinity : distance;
          };
          slot = frames.reduce<number>((best, candidate, candidateIndex) => (nextUse(candidate) > nextUse(frames[best]) ? candidateIndex : best), 0);
        }
        evicted = frames[slot];
      }
      frames[slot] = page;
      loadedAt.set(page, index);
    }
    lastUsed.set(page, index);
    steps.push({ page, frames: [...frames], fault, evicted, faults });
  });
  return steps;
}

function FaultCurve({ steps, totalReferences, totalFaults }: { steps: Step[]; totalReferences: number; totalFaults: number }) {
  const width = 720;
  const height = 150;
  const maxFaults = Math.max(totalFaults, 1);
  const points = [`40,${height - 28}`, ...steps.map((step, index) => {
    const x = 40 + ((index + 1) / Math.max(totalReferences, 1)) * (width - 70);
    const y = height - 28 - (step.faults / maxFaults) * (height - 55);
    return `${x},${y}`;
  })].join(' ');
  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable cumulative page-fault graph">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[32rem] w-full" role="img" aria-label={`Cumulative page faults: ${steps.at(-1)?.faults ?? 0}`}>
      <line x1="40" y1={height - 28} x2={width - 30} y2={height - 28} stroke="currentColor" opacity="0.25" />
      <line x1="40" y1="22" x2="40" y2={height - 28} stroke="currentColor" opacity="0.25" />
      <polyline points={points} fill="none" stroke="#7c3aed" strokeWidth="4" strokeLinejoin="round" />
      <text x="44" y="18" fill="currentColor" fontSize="12" fontWeight="700">cumulative faults</text>
      <text x={width - 32} y={height - 10} textAnchor="end" fill="currentColor" fontSize="11">references</text>
    </svg>
    </div>
  );
}

function FrameView({ trace, steps, count }: { trace: number[]; steps: Step[]; count: number }) {
  const current = count > 0 ? steps[count - 1] : undefined;
  const capacity = steps[0]?.frames.length ?? 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
      <section className="rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-light-muted dark:text-dark-muted">Frames after {count} references</div>
        <div className="mt-3 grid gap-2">
          {Array.from({ length: capacity }, (_, index) => (
            <div key={index} className="flex min-h-11 items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 font-mono">
              <span className="text-xs text-light-muted dark:text-dark-muted">frame {index}</span>
              <strong>{current?.frames[index] ?? '—'}</strong>
            </div>
          ))}
        </div>
        <p className={`mb-0 mt-3 text-sm font-bold ${current?.fault ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
          {!current ? 'Move the trace slider.' : current.fault ? `Fault${current.evicted === null ? ': free frame used' : `: evicted page ${current.evicted}`}` : 'Hit: frame contents unchanged'}
        </p>
      </section>
      <section className="min-w-0 rounded-xl border border-light-border p-4 dark:border-dark-border">
        <div className="flex flex-wrap gap-2" aria-label="Page reference string">
          {trace.map((page, index) => <span key={index} className={`flex h-9 w-9 items-center justify-center rounded-lg border font-mono text-sm font-bold ${index === count - 1 ? 'border-primary bg-primary text-white' : index < count ? 'border-primary/30 bg-primary/5' : 'border-light-border text-light-muted dark:border-dark-border dark:text-dark-muted'}`}>{page}</span>)}
        </div>
        <FaultCurve steps={steps.slice(0, count)} totalReferences={steps.length} totalFaults={steps.at(-1)?.faults ?? 0} />
      </section>
    </div>
  );
}

export default function PageReplacementPlayground() {
  const [policy, setPolicy] = useState<Policy>('LRU');
  const [traceName, setTraceName] = useState('locality');
  const [capacity, setCapacity] = useState(3);
  const [count, setCount] = useState(traces.locality.length);
  const trace = traces[traceName];
  const steps = useMemo(() => simulate(trace, capacity, policy), [trace, capacity, policy]);
  const faults = steps.slice(0, count).at(-1)?.faults ?? 0;
  const staticSteps = simulate(traces.belady, 3, 'FIFO');

  const chooseTrace = (next: string) => {
    setTraceName(next);
    setCount(traces[next].length);
  };

  return (
    <InteractivePlayground
      title="Run a page-replacement policy against locality"
      description="Change frame capacity, policy, and reference pattern. Scrub the trace to inspect every victim choice; use the Belady trace to test whether adding memory can increase FIFO faults."
      status={`${faults} faults in ${count} references`}
      onReset={() => { setPolicy('LRU'); setTraceName('locality'); setCapacity(3); setCount(traces.locality.length); }}
      staticContent={<FrameView trace={traces.belady} steps={staticSteps} count={traces.belady.length} />}
      staticCaption={`Static state: FIFO with three frames on the Belady trace produces ${staticSteps.at(-1)?.faults} faults. Compare four frames interactively; stack algorithms such as LRU do not exhibit this anomaly.`}
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">Policy
          <select aria-label="Page replacement policy" className="input-field" value={policy} onChange={(event) => setPolicy(event.target.value as Policy)}>
            <option value="FIFO">FIFO</option><option value="LRU">LRU</option><option value="OPT">OPT (offline lower bound)</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Reference pattern
          <select aria-label="Page reference pattern" className="input-field" value={traceName} onChange={(event) => chooseTrace(event.target.value)}>
            <option value="locality">Changing working set</option><option value="belady">Belady anomaly probe</option><option value="scan">Cyclic scan</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Physical frames = {capacity}
          <input aria-label="Physical frame capacity" type="range" min="2" max="5" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-3">References executed = {count}
          <input aria-label="Executed page references" type="range" min="0" max={trace.length} value={count} onChange={(event) => setCount(Number(event.target.value))} />
        </label>
      </div>
      <FrameView trace={trace} steps={steps} count={count} />
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">OPT looks into the future and is not implementable online; it supplies a comparison bound. LRU here is exact, while production kernels approximate recency and also consider dirty pages, sharing, I/O cost, cgroups, and reclaim pressure.</p>
    </InteractivePlayground>
  );
}
