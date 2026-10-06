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
  for (const name of ['SchedulerPlayground', 'PageReplacementPlayground', 'PageTablePlayground', 'CrashConsistencyPlayground']) {
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
