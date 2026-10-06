import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Design = 'global' | 'sharded' | 'rcu';

function speedup(design: Design, cores: number, criticalFraction: number, readFraction: number) {
  const f = criticalFraction;
  if (design === 'global') return 1 / (f + (1 - f) / cores);
  if (design === 'sharded') {
    const shards = Math.min(8, cores);
    return 1 / (f / shards + (1 - f) / cores);
  }
  const serializedWrites = f * (1 - readFraction);
  const graceAndMetadata = f * readFraction * 0.08;
  const parallelWork = (1 - f) + f * readFraction;
  return 1 / (serializedWrites + graceAndMetadata + parallelWork / cores);
}

const colors: Record<Design, string> = { global: '#db2777', sharded: '#2563eb', rcu: '#059669' };
const names: Record<Design, string> = { global: 'one global lock', sharded: 'eight-way sharding', rcu: 'read-optimized RCU model' };
const patterns: Record<Design, string | undefined> = { global: undefined, sharded: '11 5', rcu: '2 5' };

function Curve({ selected, cores, criticalFraction, readFraction }: { selected: Design; cores: number; criticalFraction: number; readFraction: number }) {
  const width = 760;
  const height = 260;
  const left = 48;
  const bottom = 220;
  const top = 28;
  const maxObserved = Math.max(...(['global', 'sharded', 'rcu'] as Design[]).flatMap((design) =>
    Array.from({ length: 64 }, (_, index) => speedup(design, index + 1, criticalFraction, readFraction))
  ));
  const maxY = Math.max(8, Math.ceil(maxObserved / 8) * 8);
  const ticks = Array.from({ length: 5 }, (_, index) => (maxY / 4) * index);
  const x = (core: number) => left + ((core - 1) / 63) * 670;
  const y = (value: number) => bottom - (Math.min(value, maxY) / maxY) * (bottom - top);
  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable multicore speedup graph">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[40rem] w-full" role="img" aria-label="Modeled throughput relative to a one-core global-lock baseline">
      {ticks.map((value) => <g key={value}><line x1={left} y1={y(value)} x2="718" y2={y(value)} stroke="currentColor" opacity="0.1" /><text x="42" y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="10">{Number.isInteger(value) ? value : value.toFixed(1)}×</text></g>)}
      {(['global', 'sharded', 'rcu'] as Design[]).map((design) => {
        const points = Array.from({ length: 64 }, (_, index) => `${x(index + 1)},${y(speedup(design, index + 1, criticalFraction, readFraction))}`).join(' ');
        return <polyline key={design} points={points} fill="none" stroke={colors[design]} strokeDasharray={patterns[design]} strokeLinecap="round" strokeWidth={design === selected ? 5 : 2.5} opacity={design === selected ? 1 : 0.65} />;
      })}
      <line x1={x(cores)} y1={top} x2={x(cores)} y2={bottom} stroke="currentColor" strokeDasharray="5 5" opacity="0.45" />
      <circle cx={x(cores)} cy={y(speedup(selected, cores, criticalFraction, readFraction))} r="7" fill={colors[selected]} />
      <text x={left} y="248" fill="currentColor" fontSize="11">1 core</text><text x="718" y="248" textAnchor="end" fill="currentColor" fontSize="11">64 cores</text>
    </svg>
    </div>
  );
}

export default function LockScalabilityPlayground() {
  const [design, setDesign] = useState<Design>('global');
  const [cores, setCores] = useState(16);
  const [criticalPercent, setCriticalPercent] = useState(10);
  const [readPercent, setReadPercent] = useState(90);
  const criticalFraction = criticalPercent / 100;
  const readFraction = readPercent / 100;
  const selectedSpeedup = useMemo(() => speedup(design, cores, criticalFraction, readFraction), [design, cores, criticalFraction, readFraction]);
  const staticSpeedup = speedup('global', 16, 0.1, 0.9);

  return (
    <InteractivePlayground
      title="Watch one lock flatten a multicore speedup curve"
      description="Change core count, critical-section fraction, read share, and synchronization design. Every curve reports throughput relative to the same one-core global-lock baseline; the graph is an analytical hypothesis, not benchmark data."
      status={`${names[design]} · ${selectedSpeedup.toFixed(1)}× baseline throughput at ${cores} cores`}
      onReset={() => { setDesign('global'); setCores(16); setCriticalPercent(10); setReadPercent(90); }}
      staticContent={<Curve selected="global" cores={16} criticalFraction={0.1} readFraction={0.9} />}
      staticCaption={`Static state: with 10% serialized work, one global lock yields ${staticSpeedup.toFixed(1)}× modeled speedup at 16 cores; adding cores cannot remove the serial bottleneck.`}
    >
      <div className="interactive-playground-controls mb-4 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Synchronization design
          <select aria-label="Synchronization design" className="input-field" value={design} onChange={(event) => setDesign(event.target.value as Design)}>
            <option value="global">One global lock</option><option value="sharded">Eight-way sharding</option><option value="rcu">Read-optimized RCU model</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Cores = {cores}
          <input aria-label="Processor core count" type="range" min="1" max="64" value={cores} onChange={(event) => setCores(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Critical-section work = {criticalPercent}%
          <input aria-label="Critical section percentage" type="range" min="1" max="40" value={criticalPercent} onChange={(event) => setCriticalPercent(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Reads within critical work (RCU curve) = {readPercent}%
          <input aria-label="Read percentage of critical section" type="range" min="0" max="100" value={readPercent} onChange={(event) => setReadPercent(Number(event.target.value))} />
        </label>
      </div>
      <Curve selected={design} cores={cores} criticalFraction={criticalFraction} readFraction={readFraction} />
      <div className="grid gap-2 text-xs sm:grid-cols-3">{(['global', 'sharded', 'rcu'] as Design[]).map((item) => <div key={item} className={`rounded-lg border p-3 ${item === design ? 'border-primary bg-primary/5 font-black' : 'border-light-border dark:border-dark-border'}`}><svg viewBox="0 0 56 12" className="mr-2 inline-block h-3 w-14" aria-hidden="true"><line x1="2" x2="54" y1="6" y2="6" stroke={colors[item]} strokeWidth="4" strokeDasharray={patterns[item]} strokeLinecap="round" /></svg>{names[item]}: {speedup(item, cores, criticalFraction, readFraction).toFixed(1)}×</div>)}</div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model assumptions: balanced shards, no cache-coherence traffic, no NUMA penalty, and an illustrative fixed RCU management/grace cost equal to 8% of read-side critical work. The RCU model moves that read work into the parallel term; it does not erase it. All values use one-core global-lock throughput as 1×. The model predicts a bottleneck; it does not replace profiling, contention traces, or correctness analysis.</p>
    </InteractivePlayground>
  );
}
