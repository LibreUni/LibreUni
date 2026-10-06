import type { ReactNode } from 'react';

export interface InteractivePlaygroundFrameProps {
  title: string;
  description?: string;
  children: ReactNode;
  staticContent: ReactNode;
  staticCaption: string;
  status?: string;
  onReset?: () => void;
}

/**
 * Shared chrome for interactive visualizations. Feature state and rendering
 * belong to the named playground component that composes this frame.
 */
export default function InteractivePlayground({
  title,
  description,
  children,
  staticContent,
  staticCaption,
  status,
  onReset,
}: InteractivePlaygroundFrameProps) {
  return (
    <figure className="interactive-playground my-12 overflow-hidden rounded-[2rem] border border-light-border bg-light-surface p-5 shadow-xl dark:border-dark-border dark:bg-dark-surface md:p-7">
      <figcaption className="interactive-playground-screen mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="label-caps">Interactive exploration</div>
          <h3 className="mt-1 text-lg font-black text-light-text dark:text-dark-text">{title}</h3>
          {description && <p className="mt-1 max-w-2xl text-sm text-light-muted dark:text-dark-muted">{description}</p>}
        </div>
        {(status || onReset) && <div className="flex flex-wrap items-center gap-3">
          {status && <output className="text-sm font-semibold text-light-muted dark:text-dark-muted">{status}</output>}
          {onReset && <button type="button" onClick={onReset} className="min-h-11 rounded-lg border border-light-border px-3 text-xs font-bold text-light-muted transition-colors hover:border-primary/50 hover:text-primary dark:border-dark-border dark:text-dark-muted">Reset model</button>}
        </div>}
      </figcaption>
      <div className="interactive-playground-screen">
        {children}
      </div>
      <div className="interactive-playground-print">
        <div className="label-caps">{title}</div>
        {staticContent}
        <p className="mb-0 mt-2 text-sm text-slate-600">{staticCaption}</p>
      </div>
    </figure>
  );
}
