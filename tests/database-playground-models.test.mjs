import test from 'node:test';
import assert from 'node:assert/strict';
import { attributeClosure, queryPlanCosts, quorumState, lostUpdateState, recoveryState } from '../src/components/playgrounds/databaseModels.mjs';

test('attribute closure fires only enabled dependencies to a fixed point', () => {
  assert.deepEqual(attributeClosure(['A', 'D'], [[['A'], ['B']], [['B'], ['C']], [['C', 'D'], ['E']]]), ['A', 'D', 'B', 'C', 'E']);
  assert.deepEqual(attributeClosure(['A'], [[['A'], ['B']], [['B'], ['C']], [['C', 'D'], ['E']]]), ['A', 'B', 'C']);
});

test('query cost model changes index advantage with selectivity', () => {
  const selective = queryPlanCosts(1000, 5);
  assert.equal(selective.matchingPages, 50);
  assert.equal(selective.costs['index-hash'], 153);
  assert.ok(selective.costs['index-hash'] < selective.costs['scan-hash']);
  const unselective = queryPlanCosts(1000, 100);
  assert.ok(unselective.costs['scan-hash'] < unselective.costs['index-hash']);
});

test('quorum intersection does not imply availability', () => {
  assert.deepEqual(quorumState(3, 2, 2, 1), { reachable: 2, intersects: true, readAvailable: true, writeAvailable: true });
  assert.deepEqual(quorumState(3, 2, 2, 2), { reachable: 1, intersects: true, readAvailable: false, writeAvailable: false });
  assert.equal(quorumState(3, 1, 1, 0).intersects, false);
});

test('schedule and recovery baselines expose lost and committed states', () => {
  assert.deepEqual(lostUpdateState(6), { database: 1, lost: true });
  assert.deepEqual(recoveryState(4), { committed: false, t1UpdateLogged: true, t2UpdateLogged: true });
  assert.deepEqual(recoveryState(5), { committed: true, t1UpdateLogged: true, t2UpdateLogged: true });
});
