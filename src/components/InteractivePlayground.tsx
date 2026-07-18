import type { ReactNode } from 'react';

export interface InteractivePlaygroundFrameProps {
  title: string;
  description?: string;
  children: ReactNode;
  staticContent: ReactNode;
  staticCaption: string;
  status?: string;
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
}: InteractivePlaygroundFrameProps) {
  return (
    <figure className="interactive-playground my-12 overflow-hidden rounded-[2rem] border border-light-border bg-light-surface p-5 shadow-xl dark:border-dark-border dark:bg-dark-surface md:p-7">
      <div className="interactive-playground-screen">
        <figcaption className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-caps">Interactive exploration</div>
            <h3 className="mt-1 text-lg font-black text-light-text dark:text-dark-text">{title}</h3>
            {description && <p className="mt-1 max-w-2xl text-sm text-light-muted dark:text-dark-muted">{description}</p>}
          </div>
          {status && <div className="text-sm font-semibold text-light-muted dark:text-dark-muted" aria-live="polite">{status}</div>}
        </figcaption>
        {children}
      </div>
      <div className="interactive-playground-print">
        <div className="label-caps">{title}</div>
        {staticContent}
        <figcaption className="mt-2 text-sm text-slate-600">{staticCaption}</figcaption>
      </div>
    </figure>
  );
}
