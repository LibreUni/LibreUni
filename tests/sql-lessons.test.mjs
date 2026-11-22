import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';
import { executeQuery } from '../src/lib/sqlRunnerModel.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SQL = await initSqlJs();

function findLessonsWithSqlRunner() {
  const dir = path.join(ROOT, 'src/content/lessons');
  const results = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.mdx')) {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('<SqlRunner')) results.push({ file: full, text });
      }
    }
  };
  walk(dir);
  return results.sort((a, b) => a.file.localeCompare(b.file));
}

test('every lesson <SqlRunner> schema, initialQuery, and presets execute cleanly in SQLite', () => {
  const lessons = findLessonsWithSqlRunner();
  assert.ok(lessons.length >= 2, 'Expected at least 2 lessons using <SqlRunner>');

  for (const { file, text } of lessons) {
    const rel = path.relative(ROOT, file);
    const matches = [...text.matchAll(/<SqlRunner\b([\s\S]*?)\/>/g)];
    assert.ok(matches.length >= 1, `Expected parseable <SqlRunner /> tag in ${rel}`);

    for (const m of matches) {
      const props = m[1];
      const schemaMatch = props.match(/schema=\{`([\s\S]*?)`\}/) || props.match(/schema="([\s\S]*?)"/);
      assert.ok(schemaMatch, `Missing schema prop on <SqlRunner> in ${rel}`);

      const initMatch =
        props.match(/initialQuery=\{`([\s\S]*?)`\}/) || props.match(/initialQuery="([\s\S]*?)"/);
      const db = new SQL.Database();
      try {
        db.run(schemaMatch[1]);
        if (initMatch) {
          const res = executeQuery(db, initMatch[1]);
          assert.ok(res.columns.length > 0, `initialQuery returned 0 columns in ${rel}`);
        }
        for (const pm of props.matchAll(/query:\s*`([\s\S]*?)`/g)) {
          const res = executeQuery(db, pm[1]);
          assert.ok(Array.isArray(res.values), `preset query failed in ${rel}`);
        }
      } finally {
        db.close();
      }
    }
  }
});

test('sql-lab Task 1 query output matches its documented Markdown oracle table', () => {
  const sqlLabPath = path.join(ROOT, 'src/content/lessons/database-systems/sql-lab.mdx');
  const text = fs.readFileSync(sqlLabPath, 'utf8');
  const schemaMatch = text.match(/<SqlRunner[\s\S]*?schema=\{`([\s\S]*?)`\}/);
  assert.ok(schemaMatch, 'sql-lab.mdx should include <SqlRunner schema={...}>');

  // Parse oracle table immediately preceding the Task 1 discussion ("Only S101 remains")
  const anchorIdx = text.indexOf('Only S101 remains.');
  assert.ok(anchorIdx > 0, 'Expected Task 1 oracle table section in sql-lab.mdx');
  const section = text.slice(Math.max(0, anchorIdx - 600), anchorIdx);
  const tableLines = section
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && !/^\|\s*[-: ]+\|/.test(l));

  // Verify the table does NOT put a banner row with empty trailing cells above the real headers
  const headerCells = tableLines[0].slice(1, -1).split('|').map((c) => c.trim().replace(/`/g, ''));
  assert.ok(
    headerCells.every((c) => c.length > 0),
    `sql-lab.mdx Task 1 oracle table header has empty cell(s): ${tableLines[0]}`
  );
  assert.deepEqual(headerCells, ['pool_id', 'service_code', 'active_allocations', 'is_full']);

  const oracleRows = tableLines.slice(1).map((line) =>
    line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim())
  );

  // Extract Task 1 starting query (`initialQuery` on SqlRunner or SQL fence if updated to include all 4 columns)
  const db = new SQL.Database();
  try {
    db.run(schemaMatch[1]);
    // Run the full 4-column Task 1 query described in sql-lab Task 1
    const res = executeQuery(
      db,
      `SELECT p.pool_id, p.service_code, COUNT(a.client_id) AS active_allocations,
              CASE WHEN COUNT(a.client_id) >= p.capacity THEN 'true' ELSE 'false' END AS is_full_text,
              COUNT(a.client_id) >= p.capacity AS is_full_bool
       FROM service_pool AS p
       LEFT JOIN allocation AS a
         ON a.pool_id = p.pool_id AND a.status = 'active'
       WHERE p.region = 'us-east-1'
       GROUP BY p.pool_id, p.service_code, p.capacity
       ORDER BY p.pool_id`
    );
    // Notice SQLite renders `>=` as 0/1 while CASE renders 'false'/'true'.
    // Ensure documented oracle values match what SQLite produces (0/1 or matching SQLite query).
    const sqlInitMatch = text.match(/initialQuery=\{`([\s\S]*?)`\}/);
    const task1SqlMatches = [...text.matchAll(/```sql\s*\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
    const isFullQuery = task1SqlMatches.find((q) => q.includes('is_full')) || sqlInitMatch?.[1] || '';

    if (isFullQuery.includes('is_full')) {
      const actual = executeQuery(db, isFullQuery);
      const actualRows = actual.values.map((row) => row.map((v) => String(v)));
      assert.deepEqual(
        actualRows,
        oracleRows,
        `Task 1 SQL output in SQLite (${JSON.stringify(actualRows)}) disagrees with documented oracle (${JSON.stringify(oracleRows)})`
      );
    } else {
      // Fall back to direct check that oracle row values are consistent with SQLite boolean/0-1 output
      const expectedSqliteRows = res.values.map(([id, code, active, _txt, b]) => [
        String(id),
        String(code),
        String(active),
        String(b),
      ]);
      // In SQLite `>=` produces `0`, not `false`; only valid if the lesson explicitly uses CASE or documents `0`
      assert.deepEqual(oracleRows, expectedSqliteRows);
    }
  } finally {
    db.close();
  }
});
