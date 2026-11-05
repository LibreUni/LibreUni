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
    <figure className="interactive-playground lu-card-tier3 my-8 overflow-hidden p-5 md:p-6">
      <figcaption className="interactive-playground-screen mb-4 grid gap-4 sm:grid-cols-[1fr_18rem] sm:items-start">
        <div className="min-w-0">
          <div className="label-caps">Interactive exploration</div>
          <h3 className="mt-1 text-lg font-black text-light-text dark:text-dark-text">{title}</h3>
          {description && <p className="mt-1 text-sm text-light-muted dark:text-dark-muted">{description}</p>}
        </div>
        {(status || onReset) && <div className="flex shrink-0 flex-wrap items-center sm:flex-col sm:items-end gap-2 text-right">
          {status && <output className="text-sm font-semibold text-light-muted dark:text-dark-muted min-h-[3rem] flex items-center sm:justify-end">{status}</output>}
          {onReset && <button type="button" onClick={onReset} className="min-h-9 rounded-lg border border-light-border px-3 text-xs font-bold text-light-muted transition-colors hover:border-primary/50 hover:text-primary dark:border-dark-border dark:text-dark-muted">Reset model</button>}
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
