import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'glass' | 'light';
}

export function Card({ children, className, variant = 'default' }: CardProps) {
  const variants = {
    default: 'bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border',
    light: 'bg-white border-slate-100 shadow-sm',
    dark: 'bg-slate-900 border-slate-700 text-white',
    glass: 'bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-light-border dark:border-dark-border'
  };

  return (
    <div className={cn(
      "rounded-3xl border shadow-sm transition-all duration-300",
      variants[variant],
      className
    )}>
      {children}
    </div>
  );
}
