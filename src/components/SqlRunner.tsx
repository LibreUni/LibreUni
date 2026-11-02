import { useEffect, useId, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { formatCell } from '../lib/sqlRunnerModel.mjs';

interface SqlRunnerProps {
  title?: string;
  description?: string;
  /** SQL statements that create and seed the in-browser fixture. */
  schema?: string;
  initialQuery?: string;
}

interface QueryResult {
  columns: string[];
  values: unknown[][];
  truncated: boolean;
}

type WorkerReply = { ok: true; result: QueryResult } | { ok: false; error: string };
const TIMEOUT_MS = 10_000;

export default function SqlRunner({
  title = 'Run SQL',
  description,
  schema = '',
  initialQuery = 'SELECT 1 AS ok;',
}: SqlRunnerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready. A fresh fixture is created for each query.');
  const [isRunning, setIsRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldId = useId();

  const stopWorker = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
  };

  useEffect(() => () => stopWorker(), []);

  const runQuery = () => {
    stopWorker();
    setResult(null);
    setError(null);
    setIsRunning(true);
    setStatus('Running query in a temporary SQLite database.');
    try {
      const worker = new Worker(new URL('../lib/sqlRunner.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        stopWorker();
        setIsRunning(false);
        if (!event.data.ok) {
          setError(event.data.error);
          setStatus('The query did not execute.');
          return;
        }
        const next = event.data.result;
        setResult(next);
        const count = next.values.length;
        setStatus(next.truncated
          ? `Showing the first ${count} rows; additional rows were not displayed.`
          : `${count} row${count === 1 ? '' : 's'} returned.`);
      };
      worker.onerror = () => {
        stopWorker();
        setIsRunning(false);
        setError('The SQLite worker could not start. Reload the page and try again.');
        setStatus('The query did not execute.');
      };
      timerRef.current = setTimeout(() => {
        stopWorker();
        setIsRunning(false);
        setError('The query exceeded the 10-second limit. Reduce its scope and try again.');
        setStatus('The query was stopped.');
      }, TIMEOUT_MS);
      worker.postMessage({ schema, query });
    } catch (failure) {
      stopWorker();
      setIsRunning(false);
      setError(failure instanceof Error ? failure.message : String(failure));
      setStatus('The query did not execute.');
    }
  };

  const reset = () => {
    stopWorker();
    setIsRunning(false);
    setQuery(initialQuery);
    setResult(null);
    setError(null);
    setStatus('Starting query restored. The next run uses a fresh fixture.');
  };

  return (
    <section className="assessment-shell my-12" aria-label={title}>
      <div className="print-static-assessment hidden">
        <div className="print-static-label">{title}</div>
        {description && <p>{description}</p>}
        <pre className="print-static-code"><code>{initialQuery.trim()}</code></pre>
        <p className="print-static-explanation">The screen version executes this query against the fixture in SQLite. Predict the output before checking it in an engine.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps m-0">{title}</p>
        <span className="text-xs font-semibold text-light-muted dark:text-dark-muted">SQLite in the browser</span>
      </div>
      {description && <p className="mb-4 text-sm leading-relaxed text-light-muted dark:text-dark-muted">{description}</p>}
      <p className="text-xs text-light-muted dark:text-dark-muted">Read-only queries; a fresh fixture is loaded each run. Results are limited to 100 rows.</p>
      <label className="mb-2 block text-sm font-semibold text-light-text dark:text-dark-text" htmlFor={fieldId}>SQL query</label>
      <textarea
        id={fieldId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        rows={8}
        spellCheck={false}
        className="input-field min-h-[12rem] w-full resize-y font-mono text-sm"
        aria-describedby={`${fieldId}-status`}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={runQuery} disabled={isRunning} className="assessment-action-primary">
          <Play size={15} /> {isRunning ? 'Running…' : 'Run query'}
        </button>
        <button type="button" onClick={reset} className="assessment-action-secondary">
          <RotateCcw size={14} /> Reset query
        </button>
      </div>
      <p id={`${fieldId}-status`} role="status" aria-live="polite" className="mt-3 text-xs font-semibold text-light-muted dark:text-dark-muted">{status}</p>
      {error && <div className="feedback-diagnostic mt-4 text-sm" role="alert"><strong>Query error.</strong> {error}</div>}
      {result && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-light-border dark:border-dark-border" role="region" aria-label="Query results" tabIndex={0}>
          {result.columns.length === 0 ? (
            <p className="m-0 p-4 text-sm text-light-muted dark:text-dark-muted">No columns were returned.</p>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <caption className="sr-only">Results for the submitted SQLite query</caption>
              <thead>
                <tr className="border-b border-light-border bg-light-bg dark:border-dark-border dark:bg-dark-bg/40">
                  {result.columns.map((column, index) => <th key={index} scope="col" className="px-3 py-2 text-left font-mono font-bold">{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {result.values.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-light-border/60 last:border-0 dark:border-dark-border/60">
                    {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2 font-mono">{formatCell(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
