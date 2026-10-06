import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Policy = 'FCFS' | 'SSTF' | 'SCAN';

const workloads: Record<string, number[]> = {
  mixed: [98, 183, 37, 122, 14, 124, 65, 67],
  clustered: [42, 47, 53, 58, 145, 149, 151, 158],
  adversarial: [10, 190, 20, 180, 30, 170, 40, 160],
};

function route(requests: number[], head: number, policy: Policy) {
  if (policy === 'FCFS') return [head, ...requests];
  if (policy === 'SCAN') {
    const upper = requests.filter((request) => request >= head).sort((a, b) => a - b);
    const lower = requests.filter((request) => request < head).sort((a, b) => b - a);
    const endpoint = lower.length && upper.at(-1) !== 199 ? [199] : [];
    return [head, ...upper, ...endpoint, ...lower];
  }
  const pending = [...requests];
  const result = [head];
  while (pending.length) {
    const current = result.at(-1)!;
    let best = 0;
    for (let index = 1; index < pending.length; index += 1) {
      if (Math.abs(pending[index] - current) < Math.abs(pending[best] - current)) best = index;
    }
    result.push(pending.splice(best, 1)[0]);
  }
  return result;
}

function distance(path: number[]) {
  return path.slice(1).reduce((sum, value, index) => sum + Math.abs(value - path[index]), 0);
}

function Plot({ path, requests, policy }: { path: number[]; requests: number[]; policy: Policy }) {
  const width = 760;
  const height = 250;
  const left = 45;
  const top = 32;
  const usableWidth = 680;
  const usableHeight = 175;
  const x = (track: number) => left + (track / 199) * usableWidth;
  const y = (index: number) => top + (index / Math.max(path.length - 1, 1)) * usableHeight;
  const points = path.map((track, index) => `${x(track)},${y(index)}`).join(' ');
  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable disk-head route">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[40rem] w-full" role="img" aria-label={`Disk head route with ${path.length - 1} movements`}>
      {[0, 50, 100, 150, 199].map((track) => <g key={track}><line x1={x(track)} y1={top - 8} x2={x(track)} y2={top + usableHeight + 8} stroke="currentColor" opacity="0.12" /><text x={x(track)} y="232" textAnchor="middle" fill="currentColor" fontSize="11">{track}</text></g>)}
      {requests.map((track, index) => <circle key={`${track}-${index}`} cx={x(track)} cy={top - 12} r="5" fill="#db2777" opacity="0.85" />)}
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinejoin="round" />
      {path.map((track, index) => {
        const turn = policy === 'SCAN' && index > 0 && track === 199 && !requests.includes(199);
        return <g key={`${track}-${index}`}><circle cx={x(track)} cy={y(index)} r={index === 0 ? 7 : 5} fill={turn ? '#f59e0b' : index === 0 ? '#f59e0b' : '#2563eb'} /><text x={x(track) + (turn ? -8 : 8)} y={y(index) - 7} textAnchor={turn ? 'end' : 'start'} fill="currentColor" fontSize="10">{index === 0 ? 'head' : turn ? 'turn' : index}</text></g>;
      })}
      <text x={left} y="16" fill="currentColor" fontSize="12" fontWeight="700">request order ↓ · cylinder position →</text>
    </svg>
    </div>
  );
}

export default function DiskSchedulingPlayground() {
  const [policy, setPolicy] = useState<Policy>('SSTF');
  const [workload, setWorkload] = useState('mixed');
  const [head, setHead] = useState(53);
  const requests = workloads[workload];
  const path = useMemo(() => route(requests, head, policy), [requests, head, policy]);
  const movement = distance(path);
  const staticPath = route(workloads.mixed, 53, 'SSTF');

  return (
    <InteractivePlayground
      title="Move the disk head under competing queue policies"
      description="Change the initial head position, request distribution, and policy. The path makes throughput improvements and starvation risk visible instead of reducing the choice to a slogan."
      status={`${movement} cylinders of head movement`}
      onReset={() => { setPolicy('SSTF'); setWorkload('mixed'); setHead(53); }}
      staticContent={<Plot path={staticPath} requests={workloads.mixed} policy="SSTF" />}
      staticCaption={`Static state: SSTF starts at cylinder 53 and travels ${distance(staticPath)} cylinders. It minimizes the next seek greedily but can postpone distant requests indefinitely.`}
    >
      <div className="interactive-playground-controls mb-4 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Policy
          <select aria-label="Disk scheduling policy" className="input-field" value={policy} onChange={(event) => setPolicy(event.target.value as Policy)}>
            <option value="FCFS">First-come, first-served</option><option value="SSTF">Shortest seek time first</option><option value="SCAN">SCAN, initially upward</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Request distribution
          <select aria-label="Disk request distribution" className="input-field" value={workload} onChange={(event) => setWorkload(event.target.value)}>
            <option value="mixed">Textbook mixed queue</option><option value="clustered">Two clusters</option><option value="adversarial">Alternating extremes</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold md:col-span-2">Initial head cylinder = {head}
          <input aria-label="Initial disk head cylinder" type="range" min="0" max="199" value={head} onChange={(event) => setHead(Number(event.target.value))} />
        </label>
      </div>
      <Plot path={path} requests={requests} policy={policy} />
      <p className="mb-0 mt-3 text-sm leading-relaxed">Head path: <span className="font-mono">{path.join(' → ')}</span>{policy === 'SCAN' ? ' (199 is the sweep endpoint, not an extra request)' : ''}. This model isolates seek distance on a magnetic disk; SSDs have no mechanical head, and real storage stacks also merge requests, respect deadlines, and account for caches and device-internal scheduling.</p>
    </InteractivePlayground>
  );
}
