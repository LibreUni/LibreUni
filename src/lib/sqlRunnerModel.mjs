/** SQLite-backed query execution shared by the worker and model tests. */

export const MAX_ROWS = 100;

/** Run exactly one read-only query against a fresh, already-seeded database. */
export function executeQuery(database, query, maxRows = MAX_ROWS) {
  // SQLite enforces this even for a WITH clause whose final operation is a
  // write. Restrict the entry point as well, so a learner cannot disable the
  // pragma or attach a different database through the exercise interface.
  database.run('PRAGMA query_only = ON');
  if (query.length > 20_000) throw new Error('The query exceeds the 20,000-character limit.');
  const start = query.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, '');
  if (!/^(?:select|with|explain)\b/i.test(start)) {
    throw new Error('Enter a read-only SELECT, WITH, or EXPLAIN statement.');
  }

  // sql.js automatically finalizes an iterator's previous statement when it
  // advances. First count statements without stepping them, then prepare the
  // sole statement anew for execution.
  const iterator = database.iterateStatements(query);
  const first = iterator.next();
  if (first.done) throw new Error('Enter a query first.');
  const next = iterator.next();
  if (!next.done) {
    next.value.free();
    throw new Error('Run one statement at a time.');
  }
  const statement = database.prepare(query);
  try {
    const columns = statement.getColumnNames();
    const values = [];
    while (values.length < maxRows && statement.step()) values.push(statement.get());
    const truncated = values.length === maxRows && statement.step();
    return { columns, values, truncated };
  } finally {
    statement.free();
  }
}

export function formatCell(value) {
  if (value === null) return 'NULL';
  if (value instanceof Uint8Array) return `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  return String(value);
}
