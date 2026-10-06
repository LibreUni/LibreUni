import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const bursts = [6, 4, 2];

function buildSchedule(quantum: number) {
  const remaining = [...bursts];
  const finish = Array(bursts.length).fill(0);
  const segments: Array<{ task: number; start: number; end: number }> = [];
  let time = 0;
  while (remaining.some((value) => value > 0)) {
    remaining.forEach((value, task) => {
      if (value <= 0) return;
      const duration = Math.min(quantum, remaining[task]);
      segments.push({ task, start: time, end: time + duration });
      time += duration;
      remaining[task] -= duration;
      if (remaining[task] === 0) finish[task] = time;
    });
  }
  return { segments, finish, meanTurnaround: finish.reduce((sum, value) => sum + value, 0) / finish.length };
}

function Timeline({ quantum }: { quantum: number }) {
  const schedule = buildSchedule(quantum);
  const colors = ['#3b82f6', '#8b5cf6', '#e11d48'];
  return <svg viewBox="0 0 720 180" role="img" aria-label={`Round-robin schedule with quantum ${quantum}`} className="h-auto w-full text-light-text dark:text-dark-text">
    {schedule.segments.map((segment, index) => { const width = (segment.end - segment.start) * 50; return <g key={`${segment.task}-${index}`}><rect x={60 + segment.start * 50} y="58" width={width} height="52" fill={colors[segment.task]} opacity="0.78" stroke="currentColor" /><text x={60 + segment.start * 50 + width / 2} y="89" textAnchor="middle" fill="white" fontSize="15" fontWeight="700">P{segment.task + 1}</text><text x={60 + segment.start * 50} y="132" textAnchor="middle" fill="currentColor" fontSize="11">{segment.start}</text></g>; })}
    <text x="660" y="132" textAnchor="middle" fill="currentColor" fontSize="11">12</text>
    <text x="60" y="35" fill="currentColor" fontSize="14">CPU timeline</text>
  </svg>;
}

export default function RoundRobinPlayground() {
  const [quantum, setQuantum] = useState(2);
  const schedule = buildSchedule(quantum);
  return <InteractivePlayground
    title="Change the round-robin time quantum"
    description="Three jobs arrive together with CPU bursts of 6, 4, and 2 time units. Smaller quanta improve early response but add more switches."
    status={`${schedule.segments.length - 1} context switches`}
    staticCaption="Round-robin scheduling trades response latency against context-switch overhead and completion time."
    staticContent={<Timeline quantum={2} />}
  >
    <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Time quantum = {quantum}<input aria-label="Round robin time quantum" type="range" min="1" max="6" value={quantum} onChange={(event) => setQuantum(Number(event.target.value))} /></label>
    <Timeline quantum={quantum} />
    <p className="text-sm">Completion times: {schedule.finish.map((value, index) => `P${index + 1}=${value}`).join(', ')}. Mean turnaround: <strong>{schedule.meanTurnaround.toFixed(1)}</strong> time units. This model omits switch cost; a real comparison must add it.</p>
  </InteractivePlayground>;
}
