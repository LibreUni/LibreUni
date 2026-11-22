import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { placeChild, renameEntry, requestTransition, selectWvt, weightedCharge } from '../src/components/playgrounds/osLabModels.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// The playgrounds keep their deterministic models beside the visual treatment.
// Bundle those exports for a model-only test; this does not start React or a browser.
const temp = mkdtempSync(join(tmpdir(), 'libreuni-os-models-'));
const modules = {};
try {
  for (const name of [
    'SchedulerPlayground',
    'PageReplacementPlayground',
    'PageTablePlayground',
    'CrashConsistencyPlayground',
    'ConditionVariablePlayground',
    'IsolationBoundaryPlayground',
    'DeviceIOPlayground',
    'InterleavingPlayground',
    'LockScalabilityPlayground',
    'DiskSchedulingPlayground',
    'SystemCallPathPlayground',
    'AmdahlPlayground',
    'EpsilonDeltaPlayground',
    'TangentPlayground',
    'RiemannPlayground',
  ]) {
    const outfile = join(temp, `${name}.mjs`);
    buildSync({ entryPoints: [join(repositoryRoot, 'src/components/playgrounds', `${name}.tsx`)], bundle: true, format: 'esm', platform: 'node', outfile });
    modules[name] = await import(outfile);
  }

  const scheduler = modules.SchedulerPlayground.scheduleJobs;
  const jobs = [{ id: 'A', arrival: 0, burst: 8 }, { id: 'B', arrival: 0, burst: 2 }, { id: 'C', arrival: 1, burst: 1 }, { id: 'D', arrival: 2, burst: 2 }];
  const rr = scheduler(jobs, 'RR', 2, 0);
  assert.deepEqual(rr.response, [0, 2, 3, 3]);
  assert.deepEqual(rr.turnaround, [13, 4, 4, 5]);
  const costly = scheduler(jobs, 'RR', 1, 2);
  assert.equal(costly.utilization, 13 / (13 + 8 * 2));
  assert.equal(scheduler([{ id: 'A', arrival: 3, burst: 2 }], 'FCFS', 2, 0).response[0], 0);

  const replace = modules.PageReplacementPlayground.simulate;
  const belady = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
  assert.equal(replace(belady, 3, 'FIFO').at(-1).faults, 9);
  assert.equal(replace(belady, 4, 'FIFO').at(-1).faults, 10);
  assert.ok(replace(belady, 4, 'LRU').at(-1).faults <= replace(belady, 3, 'LRU').at(-1).faults);

  const outcome = modules.PageTablePlayground.outcome;
  assert.equal(outcome('A', 0x4a3, 'read').physical, 0x2a3);
  assert.equal(outcome('A', 0x4a3, 'read').kind, 'TLB hit');
  assert.equal(outcome('A', 0x4a3, 'execute').kind, 'protection fault');
  assert.equal(outcome('A', 0x8a3, 'read').kind, 'page fault');
  assert.equal(outcome('B', 0x4a3, 'read').physical, 0x9a3);

  const { diskAtCrash, recover } = modules.CrashConsistencyPlayground;
  for (const protocol of ['unsafe', 'ordered', 'journal', 'cow']) {
    const events = { unsafe: 3, ordered: 3, journal: 6, cow: 3 }[protocol];
    const before = recover(protocol, diskAtCrash(protocol, 0));
    assert.equal(before.state.referenced, false, `${protocol}: pre-state must remain unreferenced`);
    const after = recover(protocol, diskAtCrash(protocol, events));
    assert.equal(after.state.data, true, `${protocol}: complete update must expose data`);
    assert.equal(after.state.referenced, true, `${protocol}: complete update must expose reference`);
  }
  assert.match(recover('unsafe', diskAtCrash('unsafe', 1)).verdict, /Inconsistent/);
  assert.match(recover('journal', diskAtCrash('journal', 1)).verdict, /ignored/);
  assert.match(recover('cow', diskAtCrash('cow', 1)).verdict, /Old root/);

  // Condition variable protocol: correct trace finishes cleanly, lost wakeup
  // leaves consumer sleeping beside buffered data, and if-check violates safety.
  const cvTraces = modules.ConditionVariablePlayground.traces;
  assert.equal(cvTraces.correct.states.at(-1).consumerA, 'done');
  assert.equal(cvTraces.correct.states.at(-1).buffer.length, 0);
  assert.equal(cvTraces.lost.states.at(-1).consumerA, 'sleeping');
  assert.deepEqual(cvTraces.lost.states.at(-1).buffer, ['X']);
  assert.equal(cvTraces.ifcheck.states.at(-1).consumerB, 'running');
  assert.equal(cvTraces.ifcheck.states.at(-1).buffer.length, 0);

  // Isolation boundary blast radius: tenant compromise stays local, shared
  // kernel/VMM compromise affects sibling tenant, substrate affects all layers.
  const { blastRadius } = modules.IsolationBoundaryPlayground;
  assert.deepEqual(blastRadius('container', 0).map(c => c.affected), [true, false, false, false]);
  assert.deepEqual(blastRadius('container', 1).map(c => c.affected), [true, true, true, false]);
  assert.deepEqual(blastRadius('vm', 2).map(c => c.affected), [true, true, true, true]);

  // Device I/O timing: polling busy-waits during device latency, interrupt
  // avoids busy-wait but pays copy cycles, DMA removes byte-copy cycles.
  const ioModel = modules.DeviceIOPlayground.model;
  assert.ok(ioModel('polling', 4096, 1, 100).busyWaitCycles > 0);
  assert.equal(ioModel('interrupt', 4096, 1, 100).busyWaitCycles, 0);
  assert.equal(ioModel('interrupt', 4096, 1, 100).copyCycles, 8192);
  assert.equal(ioModel('dma', 65536, 1, 100).copyCycles, 0);
  assert.ok(ioModel('dma', 65536, 1, 100).busyMs < ioModel('interrupt', 65536, 1, 100).busyMs);

  // Interleaving schedules: unsafe interleaving loses one increment, while
  // serialized critical sections and atomic fetch-add both reach 2.
  const { schedules: interleavingSchedules, run: runInterleaving } = modules.InterleavingPlayground;
  assert.equal(runInterleaving(interleavingSchedules.lost.operations, 6).counter, 1);
  assert.equal(runInterleaving(interleavingSchedules.serial.operations, 6).counter, 2);
  assert.equal(runInterleaving(interleavingSchedules.atomic.operations, 2).counter, 2);

  // Lock scalability: global lock is bounded by 1/f, sharding improves over
  // global lock, and read-heavy RCU scales beyond 8-way sharding at 16 cores.
  const lockSpeedup = modules.LockScalabilityPlayground.speedup;
  assert.equal(lockSpeedup('global', 1, 0.1, 0.9), 1);
  assert.ok(lockSpeedup('global', 64, 0.1, 0.9) < 10);
  assert.ok(lockSpeedup('sharded', 16, 0.1, 0.9) > lockSpeedup('global', 16, 0.1, 0.9));
  assert.ok(lockSpeedup('rcu', 16, 0.1, 0.9) > lockSpeedup('global', 16, 0.1, 0.9));
  assert.ok(lockSpeedup('rcu', 64, 0.3, 0.98) > lockSpeedup('sharded', 64, 0.3, 0.98));

  // Disk scheduling: SSTF reduces seek distance relative to FCFS on mixed
  // queue, and SCAN sweeps to 199 before reversing.
  const { workloads: diskWorkloads, route: diskRoute, distance: diskDistance } = modules.DiskSchedulingPlayground;
  assert.equal(diskDistance(diskRoute(diskWorkloads.mixed, 53, 'FCFS')), 640);
  assert.equal(diskDistance(diskRoute(diskWorkloads.mixed, 53, 'SSTF')), 236);
  const scanPath = diskRoute(diskWorkloads.mixed, 53, 'SCAN');
  assert.ok(scanPath.includes(199));
  assert.equal(diskDistance(scanPath), 331);

  // System call path: starts in user mode, crosses hardware trap into kernel,
  // and returns via hardware sret.
  const syscallStages = modules.SystemCallPathPlayground.stages;
  assert.equal(syscallStages[0].mode, 'user');
  assert.equal(syscallStages[2].mode, 'hardware');
  assert.equal(syscallStages[4].mode, 'kernel');
  assert.equal(syscallStages.at(-1).mode, 'hardware');

  // Architecture Amdahl and Calculus playgrounds:
  assert.equal(modules.AmdahlPlayground.speedup(0.9, 1), 1);
  assert.ok(modules.AmdahlPlayground.speedup(0.9, 64) < 10);
  assert.equal(modules.EpsilonDeltaPlayground.deltaWindow(0.45), 0.15);
  assert.ok(Math.abs(modules.TangentPlayground.tangentSlope(0) - (-0.5)) < 1e-12);
  assert.ok(modules.RiemannPlayground.leftRiemannSum(32) > modules.RiemannPlayground.leftRiemannSum(4));

  // Scheduler lab contract: weight affects debt, ties are deterministic, and
  // child placement cannot restart below the global service frontier.
  assert.equal(weightedCharge(9, 4), 2);
  assert.equal(weightedCharge(0, 8), 1);
  assert.equal(selectWvt([{ pid: 8, vruntime: 4 }, { pid: 3, vruntime: 4 }, { pid: 2, vruntime: 7 }]).pid, 3);
  assert.equal(placeChild(12, 20), 20);
  assert.notEqual(placeChild(12, 20), 0); // kills zero-initialized-child mutant

  // Driver lab contract: completions are identity-checked and cannot be
  // applied twice or reaped before completion.
  let request = { id: 4, state: 'FREE', completed: false };
  request = requestTransition(request, 'POST').request;
  request = requestTransition(request, 'ACCEPT').request;
  assert.equal(requestTransition({ ...request, completionId: 5 }, 'COMPLETE').reason, 'wrong-id');
  request = requestTransition({ ...request, completionId: 4 }, 'COMPLETE').request;
  assert.equal(requestTransition(request, 'COMPLETE').reason, 'invalid-transition');
  assert.equal(requestTransition(request, 'REAP').request.state, 'REAPED');

  // Filesystem lab contract: same-inode replacement is a no-op and ENOSPC
  // preserves the complete namespace, killing clear-first mutants.
  const namespace = { '/a/old': { inode: 20, bytes: 'x' }, '/b/new': { inode: 20, bytes: 'x' } };
  const same = renameEntry(namespace, '/a/old', '/b/new');
  assert.equal(same.reason, 'same-inode-noop');
  assert.deepEqual(same.state, namespace);
  const full = { '/a/old': { inode: 20 }, '/b/new': { inode: 44 } };
  const failed = renameEntry(full, '/a/old', '/b/new', { capacity: false });
  assert.equal(failed.reason, 'enospc');
  assert.deepEqual(failed.state, full);
  console.log('OS deterministic models: passed');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
