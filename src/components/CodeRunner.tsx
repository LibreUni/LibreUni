import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Terminal, Copy, Check, Loader2, Image as ImageIcon, Code2 } from 'lucide-react';
import { highlightCode } from './SyntaxHighlighter';

interface CodeRunnerProps {
  code?: string;
  output?: string;
  title?: string;
  description?: string;
  language?: 'python' | 'javascript' | 'typescript' | 'c' | 'cpp' | 'git' | 'bash' | 'rust';
}

declare global {
  interface Window {
    loadPyodide: any;
    pyodideInstance: any;
  }
}

export default function CodeRunner({ code, output: initialOutput, title = "Interactive Lab", description, language }: CodeRunnerProps) {
  const defaultCode = code || '';
  const hasDescription = Boolean(description?.trim());
  const [currentCode, setCurrentCode] = useState(defaultCode);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [plotImage, setPlotImage] = useState<string | null>(null);
  const [lastRunCode, setLastRunCode] = useState<string | null>(null);
  
  const pyodideRef = useRef<any>(null);

  const displayLanguage = language || 'python';
  const isBusy = isRunning || isInitializing;
  const outputIsStale = lastRunCode !== null && currentCode !== lastRunCode;

  useEffect(() => {
    setCurrentCode(defaultCode);
    setLastRunCode(null);
  }, [defaultCode]);

  const updateLoading = (message: string, progress: number) => {
    setLoadingMessage(message);
    setLoadingProgress(progress);
  };

  const clearLoading = () => {
    setLoadingMessage('');
    setLoadingProgress(0);
  };

  const loadRequiredPackages = async (pyodide: any) => {
    // Load standard scientific libs if mentioned in code
    const libsToLoad: string[] = [];
    if (currentCode.includes('numpy')) libsToLoad.push('numpy');
    if (currentCode.includes('pandas')) libsToLoad.push('pandas');
    if (currentCode.includes('matplotlib')) libsToLoad.push('matplotlib');
    if (currentCode.includes('sympy')) libsToLoad.push('sympy');
    if (currentCode.includes('sklearn')) libsToLoad.push('scikit-learn');
    if (currentCode.includes('scipy')) libsToLoad.push('scipy');
    if (currentCode.includes('PIL') || currentCode.includes('pillow')) libsToLoad.push('pillow');

    if (libsToLoad.length > 0) {
      updateLoading(`Loading packages: ${libsToLoad.join(', ')}`, 46);
      await pyodide.loadPackage(libsToLoad);
    }

    // Some visualization helpers are pure Python and are best installed with micropip.
    if (currentCode.includes('seaborn') || currentCode.includes('load_dataset') || currentCode.includes('networkx')) {
      updateLoading("Installing browser Python packages", 68);
      await pyodide.loadPackage("micropip");
      await pyodide.runPythonAsync(`
import micropip
${currentCode.includes('seaborn') || currentCode.includes('load_dataset') ? "await micropip.install('seaborn')" : ""}
${currentCode.includes('networkx') ? "await micropip.install('networkx')" : ""}
await micropip.install('pyodide-http')
import pyodide_http
pyodide_http.patch_all()
      `);
    }
  };

  const initPyodide = async () => {
    if (window.pyodideInstance) {
      pyodideRef.current = window.pyodideInstance;
      return window.pyodideInstance;
    }

    setIsInitializing(true);
    updateLoading("Preparing Python runtime", 18);
    
    try {
      if (!(window as any).loadPyodide) {
        updateLoading("Fetching Python runtime...", 10);
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load Pyodide script'));
          document.head.appendChild(s);
        });
      }

      const pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/"
      });

      window.pyodideInstance = pyodide;
      pyodideRef.current = pyodide;
      setIsInitializing(false);
      return pyodide;
    } catch (err) {
      setConsoleOutput([`Error: ${err}`]);
      setShowTerminal(true);
      setIsInitializing(false);
      throw err;
    }
  };

  const runCode = async () => {
    if (isRunning) return;
    setLastRunCode(currentCode);

    // JavaScript/TypeScript execution
    if (language === 'javascript' || language === 'typescript') {
      setIsRunning(true);
      setShowTerminal(true);
      setPlotImage(null);
      setConsoleOutput([]);
      updateLoading("Running JavaScript", 60);

      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args) => {
        logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
      };
      console.error = console.log;
      console.warn = console.log;

      try {
        // For TypeScript, we'd ideally transpile, but for simple snippets we can try to just run it
        // and catch syntax errors. Most examples will be valid JS anyway.
        const fn = new Function(currentCode);
        fn();
        
        setConsoleOutput([
          ...logs,
          "",
          "Process exited successfully"
        ]);
      } catch (err: any) {
        setConsoleOutput([...logs, "", `Error: ${err.message}`]);
      } finally {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        setIsRunning(false);
        clearLoading();
      }
      return;
    }

    // ponytail: language prop drives execution; no content sniffing
    const isLegacy = language === 'c' || language === 'cpp' || language === 'git' || language === 'bash' || language === 'rust';

    if (isLegacy) {
      setShowTerminal(true);
      setPlotImage(null);
      setIsRunning(true);
      const out = (initialOutput || "Process exited successfully.").replace(/\\n/g, '\n');
      const lines = out.split('\n');
      setConsoleOutput([
        ...lines,
        "", 
        "Process exited with status 0"
      ]);
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    setShowTerminal(true);
    setPlotImage(null);
    setConsoleOutput([]);
    updateLoading("Running code", 30);
    const usesPythonVisuals = /matplotlib|seaborn|pyplot|plt\.|networkx|libreuni_visual|savefig|\.svg|\.png|\.jpg|\.jpeg/i.test(currentCode);

    try {
      const pyodide = pyodideRef.current || await initPyodide();
      await loadRequiredPackages(pyodide);

      if (usesPythonVisuals) {
        updateLoading("Preparing visualization support", 74);
        await pyodide.loadPackage(['matplotlib']);
      }
      
      // Setup stdout capture
      let outputLogs: string[] = [];
      pyodide.setStdout({
        batched: (str: string) => {
          outputLogs.push(str);
        }
      });

      await pyodide.runPythonAsync(`
import os
for _path in [
    "/tmp/libreuni-visual.svg",
    "/tmp/libreuni-visual.png",
    "/tmp/libreuni-visual.jpg",
    "/tmp/libreuni-visual.jpeg",
]:
    try:
        os.remove(_path)
    except FileNotFoundError:
        pass
      `);

      // Handle Python visual output, including Matplotlib/Seaborn/NetworkX diagrams.
      if (usesPythonVisuals) {
        await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.close('all')
        `);
      }

      await pyodide.runPythonAsync(currentCode);
      
      // Capture a generated visual if the code produced one. Authors can either
      // draw with matplotlib or write /tmp/libreuni-visual.{svg,png,jpg}.
      if (usesPythonVisuals) {
        updateLoading("Rendering visual output", 88);
        const plotB64 = await pyodide.runPythonAsync(`
import os
import io
import base64
_visual = ""
for _path, _mime in [
    ("/tmp/libreuni-visual.svg", "image/svg+xml"),
    ("/tmp/libreuni-visual.png", "image/png"),
    ("/tmp/libreuni-visual.jpg", "image/jpeg"),
    ("/tmp/libreuni-visual.jpeg", "image/jpeg"),
]:
    if os.path.exists(_path):
        with open(_path, "rb") as _file:
            _visual = "data:" + _mime + ";base64," + base64.b64encode(_file.read()).decode("utf-8")
        break
if not _visual and "libreuni_visual" in globals():
    _candidate = libreuni_visual
    if isinstance(_candidate, bytes):
        _visual = "data:image/png;base64," + base64.b64encode(_candidate).decode("utf-8")
    elif isinstance(_candidate, str):
        _visual = _candidate if _candidate.startswith("data:") else "data:image/svg+xml;base64," + base64.b64encode(_candidate.encode("utf-8")).decode("utf-8")
if not _visual and plt.get_fignums():
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=144)
    buf.seek(0)
    _visual = "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")
_visual
        `);
        if (plotB64) {
          setPlotImage(plotB64);
        }
      }

      setConsoleOutput(prev => [
          ...prev,
          ...outputLogs,
          "", 
          "Process exited successfully"
      ]);
    } catch (err: any) {
      setConsoleOutput(prev => [...prev, "", `Error: ${err.message}`]);
    } finally {
      setIsRunning(false);
      setIsInitializing(false);
      clearLoading();
    }
  };

  const resetCode = () => {
    setCurrentCode(defaultCode);
    setConsoleOutput([]);
    setShowTerminal(false);
    setPlotImage(null);
    setLastRunCode(null);
    clearLoading();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="code-runner lu-card-tier3 not-prose my-8" aria-label={title} data-component="CodeRunner">
      <div className="print-static-lab hidden">
        <div className="print-static-label">{title}</div>
        <pre className="print-static-code"><code>{defaultCode}</code></pre>
        {initialOutput && (
          <>
            <div className="print-static-subhead">Expected output</div>
            <pre className="print-static-output"><code>{initialOutput.replace(/\\n/g, '\n')}</code></pre>
          </>
        )}
      </div>

      {/* Unified Lab Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-light-border bg-light-surface/90 px-4 py-3 dark:border-dark-border dark:bg-dark-surface/90">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
            <Code2 size={13} />
            {displayLanguage}
          </span>
          <h3 className="m-0 truncate text-sm font-bold text-light-text dark:text-dark-text">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy code"
            title="Copy code"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-light-border bg-light-bg px-2.5 py-1.5 text-xs font-semibold text-light-muted transition-colors hover:border-primary/40 hover:text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-muted dark:hover:text-dark-text"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={resetCode}
            aria-label="Reset code"
            title="Reset code"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-light-border bg-light-bg px-2.5 py-1.5 text-xs font-semibold text-light-muted transition-colors hover:border-primary/40 hover:text-light-text dark:border-dark-border dark:bg-dark-bg dark:text-dark-muted dark:hover:text-dark-text"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={runCode}
            disabled={isBusy}
            aria-label="Run code"
            className="assessment-action-primary min-h-9 px-3.5 py-1.5 text-xs"
          >
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{isBusy ? 'Running…' : 'Run code'}</span>
          </button>
        </div>
      </div>

      {hasDescription && (
        <div className="border-b border-light-border bg-light-bg/60 px-4 py-2.5 text-xs leading-relaxed text-light-muted dark:border-dark-border dark:bg-dark-bg/40 dark:text-dark-muted">
          {description}
        </div>
      )}

      {loadingMessage && (
        <div className="border-b border-light-border bg-primary/5 px-4 py-2.5 dark:border-dark-border" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between gap-4 text-xs font-bold text-primary">
            <span>{loadingMessage}</span>
            <span>{Math.max(10, Math.min(96, loadingProgress))}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.max(10, Math.min(96, loadingProgress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Auto-Sized Code Editor */}
      <div className="relative max-h-[26rem] min-h-[7.5rem] overflow-auto bg-light-bg dark:bg-dark-bg">
        <div className="relative min-h-full" style={{ minWidth: 'max-content', width: '100%' }}>
          <textarea
            value={currentCode}
            onChange={(e) => setCurrentCode(e.target.value)}
            aria-label={`${title} code editor`}
            className="absolute inset-0 z-10 h-full w-full resize-none overflow-hidden whitespace-pre bg-transparent py-4 pl-[3.25rem] pr-4 font-mono text-[13.5px] leading-6 text-transparent caret-primary selection:bg-primary/25 focus:outline-none"
            spellCheck="false"
            style={{ fontVariantLigatures: 'none', caretColor: 'var(--primary)' }}
          />
          <div className="hl-default pointer-events-none py-4 px-4 font-mono text-[13.5px] leading-6">
            {currentCode.split('\n').map((line, i) => (
              <div key={i} className="flex min-h-[24px] gap-4">
                <span className="inline-block w-5 select-none text-right font-mono text-xs text-light-muted opacity-45 dark:text-dark-muted">
                  {i + 1}
                </span>
                <span
                  dangerouslySetInnerHTML={{ __html: highlightCode(line) || '&nbsp;' }}
                  className="whitespace-pre"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Persistent Stacked Output Console */}
      {(showTerminal || isBusy) && (
        <div className="border-t border-light-border bg-slate-950 text-slate-100 dark:border-dark-border">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-2 font-mono text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-primary" />
              <span className="font-bold uppercase tracking-wider text-slate-300">
                {displayLanguage} output
              </span>
              {outputIsStale && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                  modified since last run
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[22rem] overflow-auto px-4 py-3 font-mono text-xs leading-6 [font-variant-numeric:tabular-nums]">
            {consoleOutput.length === 0 && !plotImage && isBusy && (
              <div className="text-slate-400">Running program…</div>
            )}
            {consoleOutput.map((line, i) => {
              const isError = line.startsWith('Error');
              const isExit = line.startsWith('Process exited');
              return (
                <div
                  key={i}
                  className={`grid min-h-[22px] grid-cols-[2rem_minmax(0,1fr)] gap-3 ${
                    isError ? 'text-rose-300' : isExit ? 'text-slate-400' : 'text-emerald-200'
                  }`}
                >
                  <span className="select-none text-right text-[10px] text-slate-600">
                    {line ? i + 1 : ''}
                  </span>
                  <span className="whitespace-pre-wrap break-words">{line || ' '}</span>
                </div>
              );
            })}

            {plotImage && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <ImageIcon size={12} />
                  Generated Figure
                </div>
                <img
                  src={plotImage}
                  alt="Generated visual output"
                  className="h-auto w-full rounded"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
