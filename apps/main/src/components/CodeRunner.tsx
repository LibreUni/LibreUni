import { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Terminal, Copy, Check, Cpu, Loader2, Image as ImageIcon } from 'lucide-react';
import { highlightCode } from './SyntaxHighlighter';

interface CodeRunnerProps {
  code?: string;
  output?: string;
  title?: string;
  language?: 'python' | 'javascript' | 'typescript' | 'c' | 'cpp' | 'git' | 'bash';
}

declare global {
  interface Window {
    loadPyodide: any;
    pyodideInstance: any;
  }
}

export default function CodeRunner({ code, output: initialOutput, title = "Interactive Lab", language }: CodeRunnerProps) {
  const defaultCode = code || '';
  const [currentCode, setCurrentCode] = useState(defaultCode);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [plotImage, setPlotImage] = useState<string | null>(null);
  
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    setCurrentCode(defaultCode);
  }, [defaultCode]);

  const initPyodide = async () => {
    if (window.pyodideInstance) {
      pyodideRef.current = window.pyodideInstance;
      return window.pyodideInstance;
    }

    setIsInitializing(true);
    setConsoleOutput(["Initializing Pyodide (Python in Browser)..."]);
    
    try {
      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
      });
      
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
        setConsoleOutput(prev => [...prev, `Loading packages: ${libsToLoad.join(', ')}...`]);
        await pyodide.loadPackage(libsToLoad);
      }

      // Some visualization helpers are pure Python and are best installed with micropip.
      if (currentCode.includes('seaborn') || currentCode.includes('load_dataset') || currentCode.includes('networkx')) {
        setConsoleOutput(prev => [...prev, "Installing browser Python packages..."]);
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

      window.pyodideInstance = pyodide;
      pyodideRef.current = pyodide;
      setIsInitializing(false);
      return pyodide;
    } catch (err) {
      setConsoleOutput(prev => [...prev, `Error: ${err}`]);
      setIsInitializing(false);
      throw err;
    }
  };

  const runCode = async () => {
    if (isRunning) return;

    // JavaScript/TypeScript execution
    if (language === 'javascript' || language === 'typescript') {
      setIsRunning(true);
      setShowTerminal(true);
      setPlotImage(null);
      setConsoleOutput(["Running JavaScript..."]);

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
      }
      return;
    }

    // legacy blocks (C, Git, Bash) should use predefined output
    const isLegacy = language === 'c' || language === 'cpp' || language === 'git' || language === 'bash' ||
                    currentCode.includes('#include') || 
                    currentCode.includes('int main') || 
                    currentCode.includes('printf(') ||
                    currentCode.includes('iostream') ||
                    currentCode.includes('std::') ||
                    currentCode.includes('void ') ||
                    currentCode.includes('Simulation of a workflow') ||
                    /^\s*(git|echo|mkdir|cd|cp|mv|ls|gcc|g\+\+|nasm|chmod|chown)\s+/m.test(currentCode);

    if (isLegacy) {
      setShowTerminal(true);
      setPlotImage(null);
      const out = (initialOutput || "Process exited successfully.").replace(/\\n/g, '\n');
      const lines = out.split('\n');
      setConsoleOutput([
        ...lines,
        "", 
        "Process exited with status 0"
      ]);
      return;
    }

    setIsRunning(true);
    setShowTerminal(true);
    setPlotImage(null);
    setConsoleOutput(["Running..."]);
    const usesPythonVisuals = /matplotlib|seaborn|pyplot|plt\.|networkx|libreuni_visual|savefig|\.svg|\.png|\.jpg|\.jpeg/i.test(currentCode);

    try {
      const pyodide = pyodideRef.current || await initPyodide();
      if (usesPythonVisuals) {
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
    }
  };

  const resetCode = () => {
    setCurrentCode(defaultCode);
    setConsoleOutput([]);
    setShowTerminal(false);
    setPlotImage(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-runner my-12 group">
      <div className="bg-white dark:bg-dark-surface rounded-3xl overflow-hidden border border-light-border dark:border-dark-border shadow-xl transition-all duration-500 group-hover:border-primary/30">
        <div className="bg-light-bg dark:bg-dark-bg/20 px-8 py-5 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Cpu size={20} className="text-primary" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[9px] font-black text-primary uppercase tracking-[0.25em] mb-1.5 leading-tight">Runtime Environment</div>
              <h3 className="text-lg font-black text-light-text dark:text-dark-text uppercase tracking-tighter leading-tight">{title}</h3>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
               onClick={runCode}
               aria-label="Run code"
               disabled={isRunning || isInitializing}
               className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
            >
              {isRunning || isInitializing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
              {isInitializing ? "Initializing..." : isRunning ? "Running..." : "Run"}
            </button>
            <button
              onClick={copyCode}
              aria-label="Copy code"
              title="Copy Code"
              className="p-2.5 hover:bg-white dark:hover:bg-dark-bg rounded-lg transition-all text-light-muted dark:text-dark-muted hover:text-primary border border-transparent hover:border-light-border dark:hover:border-dark-border"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={resetCode}
              aria-label="Reset code"
              title="Reset Code"
              className="p-2.5 hover:bg-white dark:hover:bg-dark-bg rounded-lg transition-all text-light-muted dark:text-dark-muted hover:text-rose-500 border border-transparent hover:border-light-border dark:hover:border-dark-border"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row min-h-[400px]">
          <div className="relative flex-1 border-r border-light-border dark:border-dark-border group/editor bg-white dark:bg-dark-surface/50 overflow-auto">
            <div className="relative min-h-full" style={{ minWidth: 'max-content', width: '100%' }}>
                <textarea
                  value={currentCode}
                  onChange={(e) => setCurrentCode(e.target.value)}
                  aria-label={`${title} code editor`}
                  className="absolute inset-0 w-full h-full pt-[30px] pb-[30px] pr-[30px] pl-[64px] font-mono text-[14.5px] leading-[24px] bg-transparent text-transparent caret-primary resize-none focus:outline-none z-10 selection:bg-primary/30 overflow-hidden whitespace-pre"
                  spellCheck="false"
                  style={{ fontVariantLigatures: 'none', caretColor: 'var(--primary)' }}
                />
                <div className="p-[30px] font-mono text-[14.5px] leading-[24px] pointer-events-none hl-default">
                  {currentCode.split('\n').map((line, i) => (
                      <div key={i} className="flex gap-[20px] group/line min-h-[24px]">
                          <span className="text-light-muted dark:text-dark-muted select-none text-right w-[14px] opacity-25 inline-block font-mono text-xs">{i + 1}</span>
                          <span dangerouslySetInnerHTML={{ __html: highlightCode(line) || '&nbsp;' }} className="whitespace-pre" />
                      </div>
                  ))}
                </div>
            </div>
          </div>

          <div className={`flex-1 flex flex-col bg-light-surface dark:bg-[#0d0d17] p-8 border-t md:border-t-0 border-light-border dark:border-dark-border transition-all duration-300 ${showTerminal ? 'opacity-100' : 'opacity-100 md:opacity-0 pointer-events-none'}`}>
             <div className="flex items-center gap-3 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-[10px] font-black text-light-muted dark:text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Terminal size={12} />
                    Terminal Output
                </span>
             </div>
             
             <div className="flex-1 font-mono text-sm overflow-auto">
                {consoleOutput.map((line, i) => (
                  <div key={i} className={`min-h-[20px] mb-1 whitespace-pre-wrap ${line.startsWith('Error') ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400/90'}`}>
                    {line}
                  </div>
                ))}
                
                {plotImage && (
                  <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-4 group/plot">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                            <ImageIcon size={12} />
                            Generated Visual
                        </div>
                    </div>
                    <img src={plotImage} alt="Python generated visual output" className="w-full h-auto rounded-lg shadow-2xl transition-transform group-hover:scale-[1.02]" />
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
