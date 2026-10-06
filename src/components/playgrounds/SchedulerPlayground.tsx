import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Algorithm = 'FCFS' | 'SJF' | 'RR';
type Job = { id: string; arrival: number; burst: number };
type Segment = { id: string; start: number; end: number; kind: 'run' | 'switch' | 'idle' };

const workloads: Record<string, Job[]> = {
  convoy: [
    { id: 'A', arrival: 0, burst: 8 },
    { id: 'B', arrival: 0, burst: 2 },
    { id: 'C', arrival: 1, burst: 1 },
    { id: 'D', arrival: 2, burst: 2 },
  ],
  interactive: [
    { id: 'A', arrival: 0, burst: 3 },
    { id: 'B', arrival: 1, burst: 4 },
    { id: 'C', arrival: 2, burst: 2 },
    { id: 'D', arrival: 4, burst: 3 },
  ],
  staggered: [
    { id: 'A', arrival: 0, burst: 5 },
    { id: 'B', arrival: 3, burst: 2 },
    { id: 'C', arrival: 5, burst: 6 },
    { id: 'D', arrival: 6, burst: 1 },
  ],
};

export function scheduleJobs(jobs: Job[], algorithm: Algorithm, quantum: number, switchCost: number) {
  const remaining = Object.fromEntries(jobs.map((job) => [job.id, job.burst]));
  const firstRun: Record<string, number> = {};
  const completion: Record<string, number> = {};
  const ready: Job[] = [];
  const segments: Segment[] = [];
  let time = 0;
  let completed = 0;
  let previous: string | null = null;

  const enqueueArrivals = (excludedId?: string) => {
    for (const job of jobs) {
      if (job.arrival <= time && remaining[job.id] > 0 && !ready.some((candidate) => candidate.id === job.id) && job.id !== excludedId) {
        ready.push(job);
      }
    }
  };

  while (completed < jobs.length) {
    enqueueArrivals();
    if (ready.length === 0) {
      const nextArrival = Math.min(...jobs.filter((job) => remaining[job.id] > 0).map((job) => job.arrival));
      segments.push({ id: 'idle', start: time, end: nextArrival, kind: 'idle' });
      time = nextArrival;
      previous = null;
      enqueueArrivals();
    }

    if (algorithm === 'SJF') ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.id.localeCompare(b.id));
    const job = ready.shift()!;

    if (previous !== null && previous !== job.id && switchCost > 0) {
      segments.push({ id: 'CS', start: time, end: time + switchCost, kind: 'switch' });
      time += switchCost;
      enqueueArrivals(job.id);
    }

    if (firstRun[job.id] === undefined) firstRun[job.id] = time;
    const duration = algorithm === 'RR' ? Math.min(quantum, remaining[job.id]) : remaining[job.id];
    segments.push({ id: job.id, start: time, end: time + duration, kind: 'run' });
    time += duration;
    remaining[job.id] -= duration;
    previous = job.id;
    enqueueArrivals(job.id);

    if (remaining[job.id] === 0) {
      completion[job.id] = time;
      completed += 1;
      previous = job.id;
    } else {
      ready.push(job);
    }
  }

  const response = jobs.map((job) => firstRun[job.id] - job.arrival);
  const turnaround = jobs.map((job) => completion[job.id] - job.arrival);
  const waiting = turnaround.map((value, index) => value - jobs[index].burst);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const busy = jobs.reduce((sum, job) => sum + job.burst, 0);
  const end = segments.at(-1)?.end ?? 0;

  return {
    segments,
    response,
    turnaround,
    waiting,
    meanResponse: mean(response),
    meanTurnaround: mean(turnaround),
    meanWaiting: mean(waiting),
    utilization: end === 0 ? 0 : busy / end,
    end,
  };
}

const colors: Record<string, string> = { A: '#2563eb', B: '#7c3aed', C: '#db2777', D: '#059669' };

function Timeline({ result }: { result: ReturnType<typeof scheduleJobs> }) {
  const width = 820;
  const left = 42;
  const usable = 744;
  const scale = usable / Math.max(result.end, 1);
  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable CPU schedule timeline">
    <svg viewBox={`0 0 ${width} 170`} className="h-auto min-w-[40rem] w-full" role="img" aria-label="CPU schedule timeline">
      <line x1={left} y1="116" x2={left + usable} y2="116" stroke="currentColor" opacity="0.25" />
      {result.segments.map((segment, index) => {
        const x = left + segment.start * scale;
        const segmentWidth = Math.max((segment.end - segment.start) * scale, 1);
        const fill = segment.kind === 'run' ? colors[segment.id] : segment.kind === 'switch' ? '#f59e0b' : '#94a3b8';
        return (
          <g key={`${segment.id}-${segment.start}-${index}`}>
            <rect x={x} y="48" width={segmentWidth} height="58" rx="4" fill={fill} opacity={segment.kind === 'run' ? 0.88 : 0.42} />
            {segmentWidth > 22 && <text x={x + segmentWidth / 2} y="82" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">{segment.id}</text>}
            <text x={x} y="135" textAnchor="middle" fill="currentColor" fontSize="11">{segment.start}</text>
          </g>
        );
      })}
      <text x={left + usable} y="135" textAnchor="middle" fill="currentColor" fontSize="11">{result.end}</text>
      <text x={left} y="25" fill="currentColor" fontSize="13" fontWeight="700">CPU timeline · amber = context switch</text>
    </svg>
    </div>
  );
}

function ResultTable({ jobs, result }: { jobs: Job[]; result: ReturnType<typeof scheduleJobs> }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable scheduling metrics">
      <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
        <thead><tr className="border-b border-light-border dark:border-dark-border"><th className="p-2">Job</th><th className="p-2">Arrival</th><th className="p-2">Burst</th><th className="p-2">Response</th><th className="p-2">Waiting</th><th className="p-2">Turnaround</th></tr></thead>
        <tbody>{jobs.map((job, index) => <tr key={job.id} className="border-b border-light-border/60 dark:border-dark-border/60"><th className="p-2" style={{ color: colors[job.id] }}>{job.id}</th><td className="p-2">{job.arrival}</td><td className="p-2">{job.burst}</td><td className="p-2">{result.response[index]}</td><td className="p-2">{result.waiting[index]}</td><td className="p-2">{result.turnaround[index]}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function SchedulerPlayground() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('RR');
  const [workload, setWorkload] = useState('convoy');
  const [quantum, setQuantum] = useState(2);
  const [switchCost, setSwitchCost] = useState(0);
  const jobs = workloads[workload];
  const result = useMemo(() => scheduleJobs(jobs, algorithm, quantum, switchCost), [jobs, algorithm, quantum, switchCost]);
  const staticResult = scheduleJobs(workloads.convoy, 'RR', 2, 0);

  return (
    <InteractivePlayground
      title="Schedule the same jobs under competing policies"
      description="Change the policy, workload, round-robin quantum, and context-switch cost. Compare response, waiting, turnaround, and useful CPU time rather than declaring one scheduler universally best."
      status={`${algorithm} · mean response ${result.meanResponse.toFixed(1)} · ${(result.utilization * 100).toFixed(0)}% useful CPU`}
      onReset={() => { setAlgorithm('RR'); setWorkload('convoy'); setQuantum(2); setSwitchCost(0); }}
      staticContent={<><Timeline result={staticResult} /><ResultTable jobs={workloads.convoy} result={staticResult} /></>}
      staticCaption="Static state: convoy workload, round robin, quantum 2, zero switch cost. Response improves over FCFS, but real systems must account for switch overhead and workload uncertainty."
    >
      <div className="interactive-playground-controls mb-4 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Policy
          <select aria-label="Scheduling policy" className="input-field" value={algorithm} onChange={(event) => setAlgorithm(event.target.value as Algorithm)}>
            <option value="FCFS">First-come, first-served</option>
            <option value="SJF">Shortest job first (non-preemptive)</option>
            <option value="RR">Round robin</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Workload
          <select aria-label="Scheduler workload" className="input-field" value={workload} onChange={(event) => setWorkload(event.target.value)}>
            <option value="convoy">Convoy: one long job arrives first</option>
            <option value="interactive">Interactive: similar short bursts</option>
            <option value="staggered">Staggered: CPU sometimes waits</option>
          </select>
        </label>
        <label className={`grid gap-2 text-sm font-semibold ${algorithm !== 'RR' ? 'opacity-45' : ''}`}>Quantum = {quantum}
          <input aria-label="Round robin quantum" type="range" min="1" max="8" value={quantum} disabled={algorithm !== 'RR'} onChange={(event) => setQuantum(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Context-switch cost = {switchCost}
          <input aria-label="Context switch cost" type="range" min="0" max="2" step="0.5" value={switchCost} onChange={(event) => setSwitchCost(Number(event.target.value))} />
        </label>
      </div>

      <Timeline result={result} />
      <ResultTable jobs={jobs} result={result} />
      <p className="mb-0 mt-4 text-sm leading-relaxed">
        Means: response <strong>{result.meanResponse.toFixed(1)}</strong>, waiting <strong>{result.meanWaiting.toFixed(1)}</strong>, turnaround <strong>{result.meanTurnaround.toFixed(1)}</strong>. Model assumptions: one CPU, known bursts for SJF, no I/O re-entry, selection committed before any switch interval, and switch cost charged only when the CPU changes jobs.
      </p>
    </InteractivePlayground>
  );
}
