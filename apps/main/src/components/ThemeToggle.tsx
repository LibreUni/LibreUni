import React, { useEffect, useRef, useState } from 'react';
import { BookOpenText, Check, ChevronDown, Moon, Palette, Square, Sun } from 'lucide-react';
import {
  COLOR_MODES,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME_ID,
  THEMES,
  getThemeById,
  isColorMode,
  isThemeId,
  resolveColorMode,
  type ColorMode,
  type ThemeId,
} from '../utils/themes';

const themeIcons = {
  modern: Palette,
  scholar: BookOpenText,
  monochrome: Square,
} satisfies Record<ThemeId, typeof Sun>;

const modeIcons = { light: Sun, dark: Moon, auto: Palette } satisfies Record<ColorMode, typeof Sun>;

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [mode, setMode] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = getThemeById(root.dataset.theme ?? localStorage.getItem('theme'));
    const initialMode = isColorMode(root.dataset.colorMode ?? localStorage.getItem('color-mode'))
      ? (root.dataset.colorMode ?? localStorage.getItem('color-mode')) as ColorMode
      : DEFAULT_COLOR_MODE;
    setTheme(initialTheme.id);
    setMode(initialMode);
  }, []);

  useEffect(() => {
    if (mode !== 'auto') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => document.documentElement.classList.toggle('dark', mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [mode]);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const applyTheme = (themeId: ThemeId) => {
    const nextTheme = getThemeById(themeId);
    const root = window.document.documentElement;
    root.dataset.theme = nextTheme.id;
    localStorage.setItem('theme', nextTheme.id);
    setTheme(nextTheme.id);
  };

  const applyMode = (modeId: ColorMode) => {
    const root = window.document.documentElement;
    root.dataset.colorMode = modeId;
    root.classList.toggle('dark', resolveColorMode(modeId) === 'dark');
    localStorage.setItem('color-mode', modeId);
    setMode(modeId);
  };

  const activeTheme = getThemeById(theme);
  const ActiveIcon = themeIcons[isThemeId(theme) ? theme : DEFAULT_THEME_ID] ?? Palette;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border border-light-border bg-light-accent/5 p-2.5 text-light-text shadow-sm transition-all hover:scale-105 hover:bg-light-accent/10 active:scale-95 dark:border-dark-border dark:bg-dark-accent/5 dark:text-dark-text dark:hover:bg-dark-accent/10"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Choose theme and appearance. Current theme: ${activeTheme.label}, ${mode} mode`}
        title="Choose theme"
      >
        <ActiveIcon size={20} />
        <ChevronDown size={14} className={`hidden transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-12 z-[120] w-64 overflow-hidden rounded-2xl border border-light-border bg-light-bg p-2 shadow-2xl shadow-slate-900/10 dark:border-dark-border dark:bg-dark-surface dark:shadow-black/40"
          role="dialog"
          aria-label="Theme settings"
        >
          <div className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-wider text-light-muted dark:text-dark-muted">Theme</div>
          {THEMES.map((choice) => {
            const Icon = themeIcons[choice.id];
            const selected = choice.id === theme;

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => applyTheme(choice.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  selected
                    ? 'bg-primary/10 text-primary'
                    : 'text-light-text hover:bg-light-accent/5 dark:text-dark-text dark:hover:bg-dark-accent/10'
                }`}
                aria-pressed={selected}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-bg">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{choice.label}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-light-muted dark:text-dark-muted">
                    {choice.description}
                  </span>
                </span>
                {selected ? <Check size={18} className="shrink-0" /> : null}
              </button>
            );
          })}
          <div className="mx-2 my-2 border-t border-light-border dark:border-dark-border" />
          <div className="px-3 pb-2 text-xs font-black uppercase tracking-wider text-light-muted dark:text-dark-muted">Appearance</div>
          <div className="grid grid-cols-3 gap-1 px-1 pb-1">
            {COLOR_MODES.map((choice) => {
              const Icon = modeIcons[choice.id];
              const selected = choice.id === mode;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => applyMode(choice.id)}
                  className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold transition-colors ${selected ? 'bg-primary/10 text-primary' : 'text-light-text hover:bg-light-accent/5 dark:text-dark-text dark:hover:bg-dark-accent/10'}`}
                  aria-pressed={selected}
                >
                  <Icon size={16} />
                  {choice.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
