import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Highlighter,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ArrowUpRight,
  X,
  Check,
  Sparkles,
} from 'lucide-react';

export type HighlightColor = 'amber' | 'emerald' | 'sky' | 'rose';

export interface LessonHighlight {
  id: string;
  text: string;
  color: HighlightColor;
  note: string;
  createdAt: number;
}

interface PomodoroState {
  phase: 'focus' | 'shortBreak' | 'longBreak';
  focusMinutes: number;
  breakMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  lastUpdatedAt: number;
  completedCycles: number;
}

interface StudyToolsRailProps {
  lessonSlug: string;
  lessonTitle: string;
}

const COLOR_META: Record<
  HighlightColor,
  { label: string; swatchClass: string; badgeClass: string }
> = {
  amber: {
    label: 'Amber',
    swatchClass: 'bg-amber-400 border-amber-600',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30',
  },
  emerald: {
    label: 'Emerald',
    swatchClass: 'bg-emerald-400 border-emerald-600',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30',
  },
  sky: {
    label: 'Sky',
    swatchClass: 'bg-sky-400 border-sky-600',
    badgeClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30',
  },
  rose: {
    label: 'Rose',
    swatchClass: 'bg-rose-400 border-rose-600',
    badgeClass: 'bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/30',
  },
};

const POMODORO_KEY = 'libreuni:pomodoro:v1';

const DEFAULT_POMODORO: PomodoroState = {
  phase: 'focus',
  focusMinutes: 25,
  breakMinutes: 5,
  remainingSeconds: 25 * 60,
  isRunning: false,
  lastUpdatedAt: Date.now(),
  completedCycles: 0,
};

function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function clearDomHighlights(container: Element) {
  const marks = container.querySelectorAll('mark.lu-user-highlight');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

function applyDomHighlights(container: Element, highlights: LessonHighlight[]) {
  clearDomHighlights(container);
  if (!highlights.length) return;

  for (const item of highlights) {
    const target = item.text.trim();
    if (target.length < 2) continue;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (
          parent.closest(
            'script, style, textarea, input, button, code, pre, .katex, .not-prose, mark.lu-user-highlight'
          )
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode: Node | null = walker.nextNode();
    while (currentNode) {
      const value = currentNode.nodeValue || '';
      const idx = value.indexOf(target);
      if (idx !== -1 && currentNode.parentNode) {
        const range = document.createRange();
        range.setStart(currentNode, idx);
        range.setEnd(currentNode, idx + target.length);
        const mark = document.createElement('mark');
        mark.className = `lu-user-highlight lu-user-highlight-${item.color}`;
        mark.dataset.highlightId = item.id;
        mark.dataset.highlightColor = item.color;
        if (item.note) {
          mark.title = item.note;
        }
        range.surroundContents(mark);
        break;
      }
      currentNode = walker.nextNode();
    }
  }
}

export default function StudyToolsRail({ lessonSlug, lessonTitle }: StudyToolsRailProps) {
  const storageKey = `libreuni:highlights:v1:${lessonSlug}`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'highlighter' | 'clock'>('highlighter');
  const [highlightMode, setHighlightMode] = useState(false);
  const [activeColor, setActiveColor] = useState<HighlightColor>('amber');
  const [highlights, setHighlights] = useState<LessonHighlight[]>([]);
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [clockString, setClockString] = useState<string>('');
  const [pomodoro, setPomodoro] = useState<PomodoroState>(DEFAULT_POMODORO);
  const initializedRef = useRef(false);

  // Load saved highlights and Pomodoro state
  useEffect(() => {
    try {
      const rawHighlights = localStorage.getItem(storageKey);
      if (rawHighlights) {
        const parsed = JSON.parse(rawHighlights);
        if (Array.isArray(parsed)) {
          setHighlights(parsed);
        }
      }
    } catch {}

    try {
      const rawPomo = localStorage.getItem(POMODORO_KEY);
      if (rawPomo) {
        const parsed = JSON.parse(rawPomo) as PomodoroState;
        if (parsed && typeof parsed.remainingSeconds === 'number') {
          if (parsed.isRunning && parsed.lastUpdatedAt) {
            const elapsed = Math.floor((Date.now() - parsed.lastUpdatedAt) / 1000);
            const nextRemaining = Math.max(0, parsed.remainingSeconds - elapsed);
            setPomodoro({
              ...parsed,
              remainingSeconds: nextRemaining,
              isRunning: nextRemaining > 0,
              lastUpdatedAt: Date.now(),
            });
          } else {
            setPomodoro(parsed);
          }
        }
      }
    } catch {}

    const updateClock = () => {
      const now = new Date();
      setClockString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateClock();
    const clockInterval = window.setInterval(updateClock, 10000);
    initializedRef.current = true;
    return () => window.clearInterval(clockInterval);
  }, [storageKey]);

  // Apply highlights to lesson article DOM
  useEffect(() => {
    if (!initializedRef.current) return;
    const article = document.querySelector('#lesson-container article.prose');
    if (article) {
      applyDomHighlights(article, highlights);
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(highlights));
    } catch {}
  }, [highlights, storageKey]);

  // Persist and tick Pomodoro timer
  useEffect(() => {
    if (!initializedRef.current) return;
    try {
      localStorage.setItem(
        POMODORO_KEY,
        JSON.stringify({ ...pomodoro, lastUpdatedAt: Date.now() })
      );
    } catch {}

    if (!pomodoro.isRunning) return;

    const timer = window.setInterval(() => {
      setPomodoro((prev) => {
        if (!prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          const completedFocus = prev.phase === 'focus';
          const nextCycles = completedFocus ? prev.completedCycles + 1 : prev.completedCycles;
          const nextPhase: PomodoroState['phase'] = completedFocus
            ? nextCycles % 4 === 0
              ? 'longBreak'
              : 'shortBreak'
            : 'focus';
          const nextMinutes =
            nextPhase === 'focus'
              ? prev.focusMinutes
              : nextPhase === 'longBreak'
                ? Math.max(15, prev.breakMinutes * 3)
                : prev.breakMinutes;
          return {
            ...prev,
            phase: nextPhase,
            remainingSeconds: nextMinutes * 60,
            isRunning: false,
            lastUpdatedAt: Date.now(),
            completedCycles: nextCycles,
          };
        }
        return {
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1,
          lastUpdatedAt: Date.now(),
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pomodoro]);

  const createHighlightFromSelection = useCallback(() => {
    const selection = window.getSelection();
    const rawText = selection?.toString().trim() || '';
    if (rawText.length < 3) {
      setStatusNotice('Select at least 3 characters of lesson text first.');
      return false;
    }

    const article = document.querySelector('#lesson-container article.prose');
    if (
      !article ||
      !selection?.anchorNode ||
      !article.contains(selection.anchorNode)
    ) {
      setStatusNotice('Select prose text inside the lesson body to highlight.');
      return false;
    }

    const clipped = rawText.slice(0, 280);
    setHighlights((prev) => {
      if (prev.some((h) => h.text === clipped)) return prev;
      return [
        ...prev,
        {
          id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: clipped,
          color: activeColor,
          note: '',
          createdAt: Date.now(),
        },
      ];
    });
    selection.removeAllRanges();
    setStatusNotice('Highlight saved to browser storage.');
    return true;
  }, [activeColor]);

  // Auto-highlight when highlightMode is enabled and user finishes selecting text in article
  useEffect(() => {
    if (!highlightMode) return;
    const handleMouseUp = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('.study-tools-rail, .not-prose, pre, code')) return;
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      if (text.length >= 3) {
        createHighlightFromSelection();
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [highlightMode, createHighlightFromSelection]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const removeHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((item) => item.id !== id));
  };

  const updateNote = (id: string, note: string) => {
    setHighlights((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note } : item))
    );
  };

  const jumpToHighlight = (id: string) => {
    const mark = document.querySelector<HTMLElement>(
      `mark.lu-user-highlight[data-highlight-id="${id}"]`
    );
    if (mark) {
      mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mark.classList.add('ring-2', 'ring-primary');
      window.setTimeout(() => mark.classList.remove('ring-2', 'ring-primary'), 1600);
    }
  };

  const switchPomodoroPhase = (phase: PomodoroState['phase']) => {
    const minutes =
      phase === 'focus'
        ? pomodoro.focusMinutes
        : phase === 'longBreak'
          ? Math.max(15, pomodoro.breakMinutes * 3)
          : pomodoro.breakMinutes;
    setPomodoro((prev) => ({
      ...prev,
      phase,
      remainingSeconds: minutes * 60,
      isRunning: false,
      lastUpdatedAt: Date.now(),
    }));
  };

  const applyPreset = (focusMinutes: number, breakMinutes: number) => {
    setPomodoro((prev) => ({
      ...prev,
      focusMinutes,
      breakMinutes,
      phase: 'focus',
      remainingSeconds: focusMinutes * 60,
      isRunning: false,
      lastUpdatedAt: Date.now(),
    }));
  };

  const totalPhaseSeconds =
    (pomodoro.phase === 'focus'
      ? pomodoro.focusMinutes
      : pomodoro.phase === 'longBreak'
        ? Math.max(15, pomodoro.breakMinutes * 3)
        : pomodoro.breakMinutes) * 60;
  const progressPct = Math.min(
    100,
    Math.max(0, ((totalPhaseSeconds - pomodoro.remainingSeconds) / Math.max(1, totalPhaseSeconds)) * 100)
  );

  return (
    <div
      aria-label="Study tools"
      className="study-tools-rail not-prose relative flex items-center gap-2 print:hidden"
    >
      {/* Inline / Rail Study Tools Launcher */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('highlighter');
            setIsOpen((prev) => (activeTab === 'highlighter' ? !prev : true));
          }}
          aria-expanded={isOpen && activeTab === 'highlighter'}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
            isOpen && activeTab === 'highlighter'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-light-border bg-light-surface text-light-text hover:border-primary/40 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
          }`}
        >
          <Highlighter size={15} aria-hidden="true" />
          <span>Highlighter</span>
          {highlights.length > 0 && (
            <span
              className={`ml-0.5 rounded-full border px-1.5 py-0.5 font-mono text-[11px] font-black ${
                isOpen && activeTab === 'highlighter'
                  ? 'border-primary-foreground/35 text-primary-foreground'
                  : 'border-primary/30 text-primary'
              }`}
            >
              {highlights.length}
            </span>
          )}
          <span className="sr-only"> — Open lesson highlighter</span>
        </button>

        <button
          type="button"
          data-testid="study-tools-launcher"
          onClick={() => {
            setActiveTab('clock');
            setIsOpen((prev) => (activeTab === 'clock' ? !prev : true));
          }}
          aria-expanded={isOpen && activeTab === 'clock'}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-bold tabular-nums transition-colors ${
            isOpen && activeTab === 'clock'
              ? 'border-primary bg-primary text-primary-foreground'
              : pomodoro.isRunning
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-light-border bg-light-surface text-light-text hover:border-primary/40 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
          }`}
        >
          <Clock size={15} aria-hidden="true" />
          <span>
            {pomodoro.isRunning
              ? formatTime(pomodoro.remainingSeconds)
              : clockString || 'Pomodoro'}
          </span>
          <span className="sr-only"> — Open study clock and Pomodoro timer</span>
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-label={`Study tools for ${lessonTitle}`}
          className="fixed right-4 top-20 z-50 flex max-h-[min(36rem,calc(100vh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-light-border bg-light-bg shadow-2xl dark:border-dark-border dark:bg-dark-surface"
        >
          <div className="flex items-center justify-between gap-2 border-b border-light-border bg-light-surface px-4 py-3 dark:border-dark-border dark:bg-dark-bg/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('highlighter')}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                  activeTab === 'highlighter'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text'
                }`}
              >
                <Highlighter size={14} />
                <span>Highlights ({highlights.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clock')}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                  activeTab === 'clock'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text'
                }`}
              >
                <Clock size={14} />
                <span>Pomodoro</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close study tools"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-light-border text-light-muted transition-colors hover:text-light-text dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text"
            >
              <X size={16} />
            </button>
          </div>

          {activeTab === 'highlighter' ? (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="rounded-xl border border-light-border bg-light-surface/70 p-3 dark:border-dark-border dark:bg-dark-bg/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-light-text dark:text-dark-text">
                    Highlight color
                  </span>
                  <button
                    type="button"
                    aria-pressed={highlightMode}
                    onClick={() => {
                      setHighlightMode((v) => !v);
                      setStatusNotice(
                        !highlightMode
                          ? 'Auto-highlight enabled: select any lesson text to highlight.'
                          : 'Auto-highlight paused.'
                      );
                    }}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                      highlightMode
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-light-border bg-light-bg text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>{highlightMode ? 'Auto mode: ON' : 'Auto mode: OFF'}</span>
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  {(Object.keys(COLOR_META) as HighlightColor[]).map((colorKey) => {
                    const meta = COLOR_META[colorKey];
                    const selected = activeColor === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() => setActiveColor(colorKey)}
                        aria-label={`${meta.label} highlight color`}
                        aria-pressed={selected}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 transition-transform ${
                          meta.swatchClass
                        } ${selected ? 'scale-105 ring-2 ring-primary' : 'opacity-80 hover:opacity-100'}`}
                      >
                        {selected && <Check size={15} className="text-slate-950" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={createHighlightFromSelection}
                    className="assessment-action-primary min-h-11 px-3 py-2 text-xs"
                  >
                    Highlight selection
                  </button>
                </div>

                {statusNotice && (
                  <p className="mt-2.5 text-xs font-medium text-light-muted dark:text-dark-muted">
                    {statusNotice}
                  </p>
                )}
              </div>

              {highlights.length === 0 ? (
                <p className="py-4 text-center text-xs leading-relaxed text-light-muted dark:text-dark-muted">
                  Select any sentence in the lesson and click <strong>Highlight selection</strong> (or turn on Auto mode) to save local highlights and margin notes.
                </p>
              ) : (
                <ul className="space-y-3">
                  {highlights.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-light-border bg-light-surface/50 p-3 dark:border-dark-border dark:bg-dark-bg/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium leading-relaxed ${
                            COLOR_META[item.color].badgeClass
                          }`}
                        >
                          “{item.text}”
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => jumpToHighlight(item.id)}
                            aria-label="Jump to highlighted text"
                            title="Jump to highlighted text"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-light-border text-light-muted hover:text-primary dark:border-dark-border dark:text-dark-muted"
                          >
                            <ArrowUpRight size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHighlight(item.id)}
                            aria-label="Remove highlight"
                            title="Remove highlight"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-light-border text-light-muted hover:text-rose-600 dark:border-dark-border dark:text-dark-muted dark:hover:text-rose-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={item.note}
                        onChange={(e) => updateNote(item.id, e.target.value)}
                        placeholder="Add a study note…"
                        aria-label={`Study note for highlight: ${item.text.slice(0, 30)}`}
                        className="mt-2 min-h-11 w-full rounded-lg border border-light-border bg-light-bg px-3 py-2 text-xs text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between rounded-xl border border-light-border bg-light-surface/70 px-4 py-3 dark:border-dark-border dark:bg-dark-bg/50">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-light-muted dark:text-dark-muted">
                    Local clock
                  </div>
                  <div className="mt-0.5 font-mono text-lg font-black text-light-text dark:text-dark-text">
                    {clockString || '--:--'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-light-muted dark:text-dark-muted">
                    Focus cycles
                  </div>
                  <div className="mt-0.5 font-mono text-lg font-black text-primary">
                    {pomodoro.completedCycles}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-light-border bg-light-surface/50 p-4 text-center dark:border-dark-border dark:bg-dark-bg/40">
                <div className="flex justify-center gap-2">
                  {(
                    [
                      { id: 'focus', label: 'Focus' },
                      { id: 'shortBreak', label: 'Short Break' },
                      { id: 'longBreak', label: 'Long Break' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => switchPomodoroPhase(tab.id)}
                      className={`min-h-11 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                        pomodoro.phase === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-light-border bg-light-bg text-light-muted hover:text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-muted'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div
                  data-testid="pomodoro-time-display"
                  className="my-4 font-mono text-4xl font-black tracking-tight text-light-text tabular-nums dark:text-dark-text"
                  role="timer"
                  aria-live="off"
                >
                  {formatTime(pomodoro.remainingSeconds)}
                </div>

                <div className="mb-4 h-2 overflow-hidden rounded-full bg-light-border dark:bg-dark-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPomodoro((prev) => ({
                        ...prev,
                        isRunning: !prev.isRunning,
                        lastUpdatedAt: Date.now(),
                      }))
                    }
                    className="assessment-action-primary min-h-11 px-5 py-2.5 text-xs"
                  >
                    {pomodoro.isRunning ? <Pause size={15} /> : <Play size={15} />}
                    <span>{pomodoro.isRunning ? 'Pause' : 'Start timer'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => switchPomodoroPhase(pomodoro.phase)}
                    aria-label="Reset Pomodoro timer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-light-border bg-light-bg px-3.5 py-2.5 text-xs font-bold text-light-muted hover:text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-muted dark:hover:text-dark-text"
                  >
                    <RotateCcw size={14} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-light-border bg-light-surface/40 p-3 dark:border-dark-border dark:bg-dark-bg/30">
                <div className="mb-2 text-xs font-bold text-light-text dark:text-dark-text">
                  Cadence presets (Focus / Break)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { focus: 25, brk: 5, label: '25 / 5m' },
                    { focus: 50, brk: 10, label: '50 / 10m' },
                    { focus: 15, brk: 3, label: '15 / 3m' },
                  ].map((preset) => {
                    const isCurrent =
                      pomodoro.focusMinutes === preset.focus &&
                      pomodoro.breakMinutes === preset.brk;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPreset(preset.focus, preset.brk)}
                        className={`min-h-11 rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors ${
                          isCurrent
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-light-border bg-light-bg text-light-text hover:border-primary/50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
