import React, { useEffect, useRef, useState } from 'react';
import { BookOpenText, Check, ChevronDown, Moon, Palette, Sun } from 'lucide-react';
import { DEFAULT_THEME_ID, THEMES, getThemeById, isThemeId, type ThemeId } from '../utils/themes';

const themeIcons = {
  light: Sun,
  dark: Moon,
  scholar: BookOpenText,
} satisfies Record<ThemeId, typeof Sun>;

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    const initialTheme = getThemeById(root.dataset.theme ?? localStorage.getItem('theme'));
    setTheme(initialTheme.id);
  }, []);

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
    root.classList.toggle('dark', nextTheme.prefersDark);
    localStorage.setItem('theme', nextTheme.id);
    setTheme(nextTheme.id);
    setOpen(false);
  };

  const activeTheme = getThemeById(theme);
  const ActiveIcon = themeIcons[isThemeId(theme) ? theme : DEFAULT_THEME_ID] ?? Palette;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-xl border border-light-border bg-light-accent/5 p-2.5 text-light-text shadow-sm transition-all hover:scale-105 hover:bg-light-accent/10 active:scale-95 dark:border-dark-border dark:bg-dark-accent/5 dark:text-dark-text dark:hover:bg-dark-accent/10"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Choose theme. Current theme: ${activeTheme.label}`}
        title="Choose theme"
      >
        <ActiveIcon size={20} />
        <ChevronDown size={14} className={`hidden transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-12 z-[120] w-64 overflow-hidden rounded-2xl border border-light-border bg-light-bg p-2 shadow-2xl shadow-slate-900/10 dark:border-dark-border dark:bg-dark-surface dark:shadow-black/40"
          role="listbox"
          aria-label="Theme choices"
        >
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
                role="option"
                aria-selected={selected}
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
        </div>
      ) : null}
    </div>
  );
}
