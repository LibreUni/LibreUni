import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { executeQuery } from './sqlRunnerModel.mjs';

// A fresh in-memory database for each run makes reset deterministic and
// isolates learner statements from the fixture. The parent terminates this
// worker after a time limit, including for non-terminating recursive queries.
self.onmessage = async (event: MessageEvent<{ schema: string; query: string }>) => {
  let database: any;
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    database = new SQL.Database();
    database.run('PRAGMA foreign_keys = ON');
    if (event.data.schema.trim()) database.run(event.data.schema);
    const result = executeQuery(database, event.data.query);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  } finally {
    database?.close();
  }
};
