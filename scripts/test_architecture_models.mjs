import test from 'node:test';
import assert from 'node:assert/strict';
import { schedule, program } from '../src/components/playgrounds/pipelineModel.mjs';
import { simulate } from '../src/components/playgrounds/cacheModel.mjs';
import { decode } from '../src/components/playgrounds/representationModel.mjs';

function amat(l1, miss1, l2, miss2, memory) { return l1 + miss1 * (l2 + miss2 * memory); }

test('AMAT composes local miss rates', () => assert.equal(amat(1, 0.05, 8, 0.2, 80), 2.2));
test('production cache model removes two-block conflict after warmup', () => {
  assert.equal(simulate([0,4,0,4,0,4],1).filter(x=>x.hit).length, 0);
  assert.equal(simulate([0,4,0,4,0,4],2).filter(x=>x.hit).length, 4);
});
test('production cache model keeps three competitors thrashing', () => assert.equal(simulate([0,4,8,0,4,8],2).filter(x=>x.hit).length, 0));
test('cache hit refreshes LRU order and snapshots do not alias later state', () => {
  const rows = simulate([0, 2, 0, 4], 2);
  assert.deepEqual(rows[0].resident, [0]);
  assert.deepEqual(rows[2].resident, [0, 2]);
  assert.equal(rows[3].evicted, 2);
  assert.deepEqual(rows[3].resident, [4, 0]);
  assert.throws(() => simulate([0], 0), RangeError);
});
test('production representation model preserves width and signed boundary', () => { assert.deepEqual(decode(127,8), {residue:127,bits:'01111111',signed:127}); assert.deepEqual(decode(128,8), {residue:128,bits:'10000000',signed:-128}); assert.deepEqual(decode(256,8), {residue:0,bits:'00000000',signed:0}); });
test('lesson accumulator bound exceeds signed 19-bit maximum and fits 20 bits', () => {
  assert.equal(9 * 255 * 127, 291465);
  assert.ok(291465 > 2 ** 18 - 1 && 291465 <= 2 ** 19 - 1);
});
test('pipeline retains add through load-use stall and retires it', () => {
  for (const taken of [false, true]) {
    const rows = schedule(taken);
    assert.equal(rows[3][1], program[2], 'IF held during load-use');
    assert.equal(rows[3][2], program[1], 'ID consumer held');
    assert.equal(rows[3][3], 'bubble');
    assert.equal(rows[4][3], program[1], 'add EX at cycle 5');
    assert.equal(rows[5][4], program[1], 'add MEM at cycle 6');
    assert.equal(rows[6][5], program[1], 'add WB at cycle 7');
    for (const row of rows) {
      const occupied = row.slice(1).filter(value => value !== '—' && value !== 'bubble');
      assert.equal(new Set(occupied).size, occupied.length, `no instruction occupies two stages in cycle ${row[0]}`);
    }
    for (const instruction of program.slice(0, 3)) {
      assert.equal(rows.filter(row => row[5] === instruction).length, 1, `${instruction} retires exactly once`);
    }
  }
});
test('branch resolution at end of EX kills only younger work', () => {
  const taken = schedule(true);
  const untaken = schedule(false);
  assert.equal(taken[5][2], program[3], 'fall-through is in ID while branch resolves');
  assert.equal(taken[6][2], 'bubble');
  assert.equal(taken[6][3], 'bubble');
  assert.equal(taken[6][1], 'target');
  assert.equal(taken.filter(row => row[5] === program[3]).length, 0);
  assert.equal(untaken.filter(row => row[5] === program[3]).length, 1);
  assert.equal(taken.at(-1)[5], 'target', 'target progresses through all five stages');
});
