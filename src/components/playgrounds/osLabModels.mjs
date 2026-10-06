/**
 * Small deterministic lab oracles. These model contracts, not xv6 itself;
 * kernel submissions still require the pinned-kernel workflow and tests.
 */

export function weightedCharge(delta, weight) {
  if (!Number.isInteger(delta) || delta < 0) throw new RangeError('delta');
  if (![1, 2, 4, 8].includes(weight)) throw new RangeError('weight');
  return Math.max(1, Math.floor(delta / weight));
}

export function selectWvt(runnable, floor = 0) {
  if (!Array.isArray(runnable) || runnable.some(p => !Number.isInteger(p.pid) || !Number.isInteger(p.vruntime))) {
    throw new TypeError('runnable processes must have integer pid and vruntime');
  }
  if (runnable.length === 0) return null;
  return runnable.reduce((best, p) =>
    p.vruntime < best.vruntime || (p.vruntime === best.vruntime && p.pid < best.pid) ? p : best
  );
}

export function placeChild(parentVruntime, schedulerFloor) {
  if (!Number.isInteger(parentVruntime) || !Number.isInteger(schedulerFloor)) throw new TypeError('integer runtime');
  return Math.max(parentVruntime, schedulerFloor);
}

const transitions = {
  FREE: { POST: 'POSTED' },
  POSTED: { ACCEPT: 'INFLIGHT' },
  INFLIGHT: { COMPLETE: 'COMPLETE', FAIL: 'COMPLETE' },
  COMPLETE: { REAP: 'REAPED' },
  REAPED: {}
};

export function requestTransition(request, event) {
  if (!request || !transitions[request.state]) return { ok: false, reason: 'invalid-state' };
  const next = transitions[request.state][event];
  if (!next) return { ok: false, reason: 'invalid-transition' };
  if (event === 'COMPLETE' || event === 'FAIL') {
    if (!Number.isInteger(request.id) || request.id < 0) return { ok: false, reason: 'invalid-id' };
    if (request.completionId !== undefined && request.completionId !== request.id) return { ok: false, reason: 'wrong-id' };
    if (request.completed) return { ok: false, reason: 'duplicate-completion' };
  }
  return { ok: true, request: { ...request, state: next, completed: event === 'COMPLETE' || event === 'FAIL' } };
}

export function renameEntry(state, source, destination, { capacity = true } = {}) {
  if (!state || !source || !destination) return { ok: false, reason: 'invalid-input', state };
  const before = structuredClone(state);
  const src = state[source];
  const dst = state[destination];
  if (!src) return { ok: false, reason: 'missing-source', state: before };
  if (dst && dst.inode === src.inode) return { ok: true, reason: 'same-inode-noop', state: before };
  if (!capacity) return { ok: false, reason: 'enospc', state: before };
  const next = { ...before, [destination]: { ...src } };
  delete next[source];
  return { ok: true, reason: 'renamed', state: next };
}
