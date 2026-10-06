import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import { simulate } from './cacheModel.mjs';

type Access = { block: number; hit: boolean; set: number; evicted: number | null; resident: number[] };

function Trace({ accesses }: { accesses: Access[] }) {
  return <div className="overflow-x-auto" tabIndex={0} aria-label="Cache access trace">
    <table className="w-full text-left text-xs"><thead><tr className="border-b border-light-border dark:border-dark-border"><th scope="col" className="p-2">Block</th><th scope="col" className="p-2">Set</th><th scope="col" className="p-2">Result</th><th scope="col" className="p-2">Resident: MRU → LRU</th></tr></thead>
      <tbody>{accesses.map((access, index) => <tr key={`${index}-${access.block}`} className="border-b border-light-border/60 dark:border-dark-border/60"><td className="p-2 font-mono">B{access.block}</td><td className="p-2">{access.set}</td><td className="p-2 font-semibold">{access.hit ? 'hit' : 'miss'}{access.evicted !== null && <span className="block font-normal">evict B{access.evicted}</span>}</td><td className="p-2 font-mono">{access.resident.map(block => `B${block}`).join(' → ')}</td></tr>)}</tbody>
    </table>
  </div>;
}

export default function CacheHierarchyPlayground() {
  const [ways, setWays] = useState(1);
  const [pattern, setPattern] = useState<'alternating' | 'three'>('alternating');
  const blocks = pattern === 'alternating' ? [0, 4, 0, 4, 0, 4] : [0, 4, 8, 0, 4, 8];
  const accesses: Access[] = useMemo(() => simulate(blocks, ways), [blocks.join(','), ways]);
  const hits = accesses.filter((access) => access.hit).length;
  return <InteractivePlayground
    title="Make associativity explain the trace"
    description="Two sets receive a deliberately adversarial block stream. Change associativity and the number of competing blocks to separate conflict misses from capacity claims."
    status={`${hits}/${accesses.length} hits · ${(100 * (1 - hits / accesses.length)).toFixed(0)}% miss rate`}
    onReset={() => { setWays(1); setPattern('alternating'); }}
    staticContent={<Trace accesses={simulate([0, 4, 0, 4, 0, 4], 2)} />}
    staticCaption="Static state: blocks 0 and 4 alternate in a 2-way, two-set cache. Both map to set 0, but both fit, so only compulsory misses remain."
  >
    <div className="interactive-playground-controls mb-4 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-semibold">Associativity = {ways}-way
        <input aria-label="Cache associativity" type="range" min="1" max="4" value={ways} onChange={(event) => setWays(Number(event.target.value))} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">Trace
        <select aria-label="Cache block trace" className="input-field" value={pattern} onChange={(event) => setPattern(event.target.value as typeof pattern)}><option value="alternating">Two competitors: 0, 4</option><option value="three">Three competitors: 0, 4, 8</option></select>
      </label>
    </div>
    <Trace accesses={accesses} />
    <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: two sets, block-sized accesses, LRU order within each set, and no prefetching or overlap. Real caches add more sets, byte offsets, refill queues, and coherence state; the mapping invariant is unchanged.</p>
  </InteractivePlayground>;
}
