import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { executeQuery, formatCell } from '../src/lib/sqlRunnerModel.mjs';

const SQL = await initSqlJs();
function fixture() {
  const database = new SQL.Database();
  database.run("CREATE TABLE offering(id INTEGER, code TEXT); INSERT INTO offering VALUES (1, 'DB101'), (2, 'DB201')");
  return database;
}

test('executes SQL including comments, literals, CTEs, and explain', () => {
  const database = fixture();
  try {
    assert.deepEqual(executeQuery(database, "/* one */ -- two\nSELECT 'update;--' AS value").values, [['update;--']]);
    assert.deepEqual(executeQuery(database, 'WITH x AS (SELECT 42 AS n) SELECT n FROM x').values, [[42]]);
    assert.ok(executeQuery(database, 'EXPLAIN QUERY PLAN SELECT * FROM offering').values.length > 0);
    assert.deepEqual(executeQuery(database, 'SELECT code FROM offering WHERE id = 0').values, []);
  } finally { database.close(); }
});

test('rejects additional statements and mutations including WITH DELETE', () => {
  const database = fixture();
  try {
    assert.throws(() => executeQuery(database, 'SELECT 1; SELECT 2'), /one statement/);
    assert.throws(() => executeQuery(database, 'PRAGMA query_only = OFF'), /read-only/);
    assert.throws(() => executeQuery(database, 'WITH x AS (SELECT 1) DELETE FROM offering'), /readonly/i);
    assert.throws(() => executeQuery(database, 'SELECT 1; DELETE FROM offering'), /one statement/);
    assert.deepEqual(executeQuery(database, 'SELECT COUNT(*) FROM offering').values, [[2]]);
  } finally { database.close(); }
});

test('bounds result rows and identifies truncation', () => {
  const database = fixture();
  try {
    const three = executeQuery(database, 'WITH RECURSIVE x(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM x WHERE n<3) SELECT n FROM x', 2);
    assert.deepEqual(three.values, [[1], [2]]);
    assert.equal(three.truncated, true);
    assert.equal(executeQuery(database, 'SELECT * FROM offering', 2).truncated, false);
  } finally { database.close(); }
});

test('preserves NULL, numeric precision and blobs in displayed values', () => {
  assert.equal(formatCell(null), 'NULL');
  assert.equal(formatCell(3.1415926535), '3.1415926535');
  assert.equal(formatCell(new Uint8Array([0, 255])), '0x00ff');
  assert.equal(formatCell('Ada'), 'Ada');
});
