import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';
import SteppedSlider from '../SteppedSlider';

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
  const colors = ['#2563eb', '#6d28d9', '#be123c'];
  return (
    <svg
      viewBox="0 0 720 180"
      role="img"
      aria-label={`Round-robin schedule with quantum ${quantum}`}
      className="h-auto w-full text-light-text dark:text-dark-text"
    >
      {schedule.segments.map((segment, index) => {
        const width = (segment.end - segment.start) * 50;
        return (
          <g key={`${segment.task}-${index}`}>
            <rect
              x={60 + segment.start * 50}
              y="58"
              width={width}
              height="52"
              fill={colors[segment.task]}
              stroke="currentColor"
            />
            <text
              x={60 + segment.start * 50 + width / 2}
              y="89"
              textAnchor="middle"
              fill="white"
              fontSize="15"
              fontWeight="700"
            >
              P{segment.task + 1}
            </text>
            <text
              x={60 + segment.start * 50}
              y="132"
              textAnchor="middle"
              fill="currentColor"
              fontSize="11"
            >
              {segment.start}
            </text>
          </g>
        );
      })}
      <text x="660" y="132" textAnchor="middle" fill="currentColor" fontSize="11">
        12
      </text>
      <text x="60" y="35" fill="currentColor" fontSize="14">
        CPU timeline
      </text>
    </svg>
  );
}

export default function RoundRobinPlayground() {
  const [quantum, setQuantum] = useState(2);
  const schedule = buildSchedule(quantum);
  return (
    <InteractivePlayground
      title="Change the round-robin time quantum"
      description="Three jobs arrive together with CPU bursts of 6, 4, and 2 time units. Smaller quanta improve early response but add more switches."
      status={`${schedule.segments.length - 1} context switches`}
      staticCaption="Round-robin scheduling trades response latency against context-switch overhead and completion time."
      staticContent={<Timeline quantum={2} />}
      onReset={() => setQuantum(2)}
    >
      <div className="interactive-playground-controls mb-4">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold">
          <span>Time quantum = {quantum}</span>
        </div>
        <SteppedSlider
          ariaLabel="Round robin time quantum"
          min={1}
          max={6}
          step={1}
          value={quantum}
          onChange={setQuantum}
          labels={['1', '2', '3', '4', '5', '6']}
        />
      </div>
      <Timeline quantum={quantum} />
      <p className="text-sm">
        Completion times: {schedule.finish.map((value, index) => `P${index + 1}=${value}`).join(', ')}. Mean turnaround: <strong>{schedule.meanTurnaround.toFixed(1)}</strong> time units. This model omits switch cost; a real comparison must add it.
      </p>
    </InteractivePlayground>
  );
}
