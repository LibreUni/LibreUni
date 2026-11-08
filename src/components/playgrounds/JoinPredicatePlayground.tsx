import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Placement = 'on' | 'where';

const hosts = [
  { id: 'h-001', name: 'worker-01' },
  { id: 'h-002', name: 'worker-02' },
  { id: 'h-003', name: 'worker-03' },
];

const allocations = [
  { hostId: 'h-001', service: 'auth-svc', memoryGb: 87 },
  { hostId: 'h-002', service: 'auth-svc', memoryGb: 40 },
];

function ResultTable({ placement, threshold }: { placement: Placement; threshold: number }) {
  const rows = useMemo(() => hosts.flatMap((host) => {
    const matches = allocations.filter((allocation) => allocation.hostId === host.id);
    const joined = matches.length ? matches.map((match) => ({ name: host.name, service: match.service, memory: String(match.memoryGb) })) : [{ name: host.name, service: 'NULL', memory: 'NULL' }];
    if (placement === 'on') {
      const qualifying = matches.filter((match) => match.memoryGb >= threshold).map((match) => ({ name: host.name, service: match.service, memory: String(match.memoryGb) }));
      return qualifying.length ? qualifying : [{ name: host.name, service: 'NULL', memory: 'NULL' }];
    }
    return joined.filter((row) => row.memory !== 'NULL' && Number(row.memory) >= threshold);
  }), [placement, threshold]);
  return <div className="overflow-x-auto rounded-xl border border-light-border dark:border-dark-border"><table className="w-full min-w-72 text-left text-sm"><caption className="sr-only">Left-join result with the memory allocation predicate in {placement === 'on' ? 'ON' : 'WHERE'}</caption><thead className="bg-light-bg/70 text-xs text-light-muted dark:bg-dark-bg/40 dark:text-dark-muted"><tr><th scope="col" className="px-3 py-2">host</th><th scope="col" className="px-3 py-2">service</th><th scope="col" className="px-3 py-2">memory_gb</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.name}-${row.service}`} className="border-t border-light-border dark:border-dark-border"><td className="px-3 py-2 font-mono text-xs">{row.name}</td><td className="px-3 py-2 font-mono text-xs">{row.service}</td><td className="px-3 py-2 font-mono text-xs">{row.memory}</td></tr>)}{rows.length === 0 && <tr><td colSpan={3} className="px-3 py-3 text-light-muted dark:text-dark-muted">No output rows</td></tr>}</tbody></table></div>;
}

export default function JoinPredicatePlayground() {
  const [placement, setPlacement] = useState<Placement>('on');
  const [threshold, setThreshold] = useState(50);
  const query = placement === 'on'
    ? `SELECT h.name, a.service, a.memory_gb\nFROM Host h\nLEFT JOIN Allocation a\n  ON a.host_id = h.host_id AND a.memory_gb >= ${threshold};`
    : `SELECT h.name, a.service, a.memory_gb\nFROM Host h\nLEFT JOIN Allocation a\n  ON a.host_id = h.host_id\nWHERE a.memory_gb >= ${threshold};`;
  const status = placement === 'on'
    ? 'The predicate limits matching Allocation rows, so every Host remains in the output.'
    : 'WHERE filters after NULL extension, so hosts without a qualifying allocation disappear.';
  return <InteractivePlayground
    title="Place a left-join predicate; inspect which hosts survive"
    description="worker-01 has 87 GB allocated, worker-02 has 40 GB, and worker-03 has no allocations. Move the memory condition between ON and WHERE, then compare the relation the query actually returns."
    status={status}
    staticContent={<div className="grid gap-4"><p className="m-0 text-sm">With a threshold of 50 GB, the two placements answer different questions. Compare the result tables before deciding where the predicate belongs.</p><div className="grid gap-4 lg:grid-cols-2"><section className="grid gap-2"><h4 className="m-0 text-sm font-bold">Predicate in <code>ON</code>: preserve every host</h4><ResultTable placement="on" threshold={50} /></section><section className="grid gap-2"><h4 className="m-0 text-sm font-bold">Predicate in <code>WHERE</code>: filter after NULL extension</h4><ResultTable placement="where" threshold={50} /></section></div></div>}
    staticCaption="Static state: memory_gb ≥ 50 in ON preserves worker-01, worker-02, and worker-03; the same predicate in WHERE leaves only worker-01 because the NULL-extended and nonqualifying rows are filtered afterward."
    onReset={() => { setPlacement('on'); setThreshold(50); }}
  >
    <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-[1fr_1fr]">
      <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">Place <code>a.memory_gb ≥ threshold</code></legend><div className="flex flex-wrap gap-2">{([
        ['on', 'In ON'],
        ['where', 'In WHERE'],
      ] as Array<[Placement, string]>).map(([value, label]) => <button key={value} type="button" aria-pressed={placement === value} onClick={() => setPlacement(value)} className={placement === value ? 'assessment-action-primary' : 'assessment-action-secondary'}>{label}</button>)}</div></fieldset>
      <label className="grid gap-2 text-sm font-semibold">Threshold = {threshold} GB<input aria-label="Threshold allocation size" type="range" min="0" max="100" step="10" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
    </div>
    <div className="grid gap-4 lg:grid-cols-2"><pre className="m-0 overflow-x-auto rounded-xl border border-light-border bg-light-bg/70 p-4 text-xs leading-relaxed text-light-text dark:border-dark-border dark:bg-dark-bg/40 dark:text-dark-text"><code>{query}</code></pre><ResultTable placement={placement} threshold={threshold} /></div>
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: one allocation per host in this sample, no duplicate rows, standard SQL NULL semantics, and no ordering guarantee. The example isolates predicate placement; real queries may introduce additional joins, aggregates, policies, or correlated predicates that need their own semantic check.</p>
  </InteractivePlayground>;
}
