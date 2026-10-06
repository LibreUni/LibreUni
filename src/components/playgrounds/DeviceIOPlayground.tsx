import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Mode = 'polling' | 'interrupt' | 'dma';

const labels: Record<Mode, string> = {
  polling: 'Polling + programmed I/O',
  interrupt: 'Interrupt + CPU copy',
  dma: 'DMA + completion interrupt',
};

function model(mode: Mode, bytes: number, latencyMs: number, operationsPerSecond: number) {
  const cpuGHz = 3;
  const cyclesPerMs = cpuGHz * 1_000_000;
  const transferMs = bytes / 100_000_000 * 1000;
  const setupCycles = mode === 'dma' ? 1800 : 500;
  const interruptCycles = mode === 'polling' ? 0 : 1200;
  const copyCycles = mode === 'dma' ? 0 : bytes * 2;
  const setupMs = setupCycles / cyclesPerMs;
  const completionMs = (interruptCycles + copyCycles) / cyclesPerMs;
  const deviceMs = latencyMs + transferMs;
  const busyWaitCycles = mode === 'polling' ? (latencyMs + transferMs) * cyclesPerMs : 0;
  const busyMs = (setupCycles + interruptCycles + copyCycles + busyWaitCycles) / cyclesPerMs;
  const elapsedMs = setupMs + deviceMs + completionMs;
  const offeredCpuLoad = busyMs * operationsPerSecond / 1000;
  const utilization = Math.min(1, offeredCpuLoad);
  return { busyMs, elapsedMs, utilization, offeredCpuLoad, setupCycles, interruptCycles, copyCycles, busyWaitCycles, setupMs, completionMs, deviceMs };
}

function Timeline({ mode, result }: { mode: Mode; result: ReturnType<typeof model> }) {
  const width = 760;
  const left = 95;
  const usable = 620;
  const scale = usable / Math.max(result.elapsedMs, 0.0001);
  const cpuBusyWidth = Math.max(result.busyMs * scale, 2);
  const deviceX = left + result.setupMs * scale;
  const deviceWidth = Math.max(result.deviceMs * scale, 2);
  const setupWidth = Math.max(8, result.setupMs * scale);
  const completionWidth = Math.max(8, result.completionMs * scale);
  return (
    <div className="overflow-x-auto" tabIndex={0} aria-label="Scrollable I/O timing model">
    <svg viewBox={`0 0 ${width} 180`} className="h-auto min-w-[40rem] w-full" role="img" aria-label={`${labels[mode]} timing model`}>
      <text x="12" y="58" fill="currentColor" fontSize="12" fontWeight="700">device</text>
      <rect x={deviceX} y="38" width={deviceWidth} height="34" rx="7" fill="#2563eb" opacity="0.18" />
      <rect x={deviceX} y="38" width={deviceWidth} height="34" rx="7" fill="none" stroke="#2563eb" strokeWidth="2" />
      <text x={deviceX + deviceWidth / 2} y="59" textAnchor="middle" fill="currentColor" fontSize="11">latency + transfer</text>
      <text x="12" y="119" fill="currentColor" fontSize="12" fontWeight="700">CPU</text>
      <rect x={left} y="99" width={usable} height="34" rx="7" fill="#94a3b8" opacity="0.12" />
      {mode === 'polling' ? (
        <rect x={left} y="99" width={cpuBusyWidth} height="34" rx="7" fill="#db2777" opacity="0.8" />
      ) : (
        <>
          <rect x={left} y="99" width={setupWidth} height="34" rx="7" fill="#7c3aed" opacity="0.85" />
          <rect x={left + usable - completionWidth} y="99" width={completionWidth} height="34" rx="7" fill="#db2777" opacity="0.8" />
        </>
      )}
      <text x={left} y="157" fill="currentColor" fontSize="11">0</text>
      <text x={left + usable} y="157" textAnchor="end" fill="currentColor" fontSize="11">{result.elapsedMs.toFixed(3)} ms elapsed</text>
      <text x={left + usable / 2} y="121" textAnchor="middle" fill="currentColor" fontSize="11">{mode === 'polling' ? 'busy waiting and copying' : 'CPU available while device works'}</text>
    </svg>
    </div>
  );
}

export default function DeviceIOPlayground() {
  const [mode, setMode] = useState<Mode>('interrupt');
  const [sizeExponent, setSizeExponent] = useState(12);
  const [latencyTenths, setLatencyTenths] = useState(10);
  const [operationsPerSecond, setOperationsPerSecond] = useState(100);
  const bytes = 2 ** sizeExponent;
  const latencyMs = latencyTenths / 10;
  const result = useMemo(() => model(mode, bytes, latencyMs, operationsPerSecond), [mode, bytes, latencyMs, operationsPerSecond]);
  const staticResult = model('interrupt', 4096, 1, 100);

  return (
    <InteractivePlayground
      title="Choose polling, interrupts, or DMA from workload evidence"
      description="Change transfer size, device latency, and operation rate. The timeline separates elapsed device time from CPU occupancy and exposes when setup overhead or busy waiting dominates."
      status={`${(result.utilization * 100).toFixed(1)}% modeled CPU occupancy${result.offeredCpuLoad > 1 ? ' · offered load exceeds one CPU' : ''}`}
      onReset={() => { setMode('interrupt'); setSizeExponent(12); setLatencyTenths(10); setOperationsPerSecond(100); }}
      staticContent={<Timeline mode="interrupt" result={staticResult} />}
      staticCaption="Static state: 4 KiB transfers, 1 ms device latency, 100 operations/s, interrupt-driven CPU copying. The CPU is free during device latency but pays setup, interrupt, and copy work."
    >
      <div className="interactive-playground-controls mb-4 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">I/O mechanism
          <select aria-label="I/O mechanism" className="input-field" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="polling">Polling + programmed I/O</option><option value="interrupt">Interrupt + CPU copy</option><option value="dma">DMA + completion interrupt</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Transfer size = {bytes >= 1024 ? `${bytes / 1024} KiB` : `${bytes} B`}
          <input aria-label="I/O transfer size exponent" type="range" min="6" max="20" value={sizeExponent} onChange={(event) => setSizeExponent(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Device latency = {latencyMs.toFixed(1)} ms
          <input aria-label="Device latency" type="range" min="1" max="100" value={latencyTenths} onChange={(event) => setLatencyTenths(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Operation rate = {operationsPerSecond}/s
          <input aria-label="I/O operations per second" type="range" min="10" max="2000" step="10" value={operationsPerSecond} onChange={(event) => setOperationsPerSecond(Number(event.target.value))} />
        </label>
      </div>
      <Timeline mode={mode} result={result} />
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border border-light-border p-3 dark:border-dark-border"><div className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">CPU busy / operation</div><strong>{result.busyMs.toFixed(4)} ms</strong></div>
        <div className="rounded-lg border border-light-border p-3 dark:border-dark-border"><div className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">Elapsed / operation</div><strong>{result.elapsedMs.toFixed(4)} ms</strong></div>
        <div className="rounded-lg border border-light-border p-3 dark:border-dark-border"><div className="text-xs font-black uppercase tracking-wide text-light-muted dark:text-dark-muted">CPU occupancy</div><strong>{(result.utilization * 100).toFixed(1)}%</strong></div>
      </div>
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Explicit model: 3 GHz CPU, 500 setup cycles for programmed I/O, 1,800 for DMA, 1,200 per interrupt, two CPU cycles per CPU-copied byte, and 100 MB/s device transfer. Polling occupies the CPU during both device latency and transfer. Very short CPU phases receive an eight-pixel minimum marker, so their drawn width is not a timing claim. Occupancy is capped at 100%; a larger offered load means the requested rate is unsustainable on one CPU. These are teaching assumptions—not hardware claims.</p>
    </InteractivePlayground>
  );
}
