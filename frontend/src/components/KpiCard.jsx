import React from 'react';
import { cn } from '../lib/utils';

export function KpiCard({ title, value, subtext, highlight, accentColor = 'primary' }) {
  
  // Dynamic border highlight based on accent color
  const accentClasses = {
    primary: "border-l-primary",
    secondary: "border-l-secondary",
    error: "border-l-error text-error",
    tertiary: "border-l-tertiary",
  };

  const getHighlightClass = () => {
    if (!highlight) return "";
    if (highlight.type === 'critical') return "bg-error text-white shadow-[0_0_15px_rgba(255,113,108,0.5)]";
    if (highlight.type === 'safe') return "bg-secondary text-on-primary";
    if (highlight.type === 'warning') return "bg-tertiary text-on-primary";
    return "";
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden border ghost-border">
      
      {/* Decorative accent line */}
      <div className={cn("absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full opacity-50 shadow-ambient transition-all group-hover:opacity-100", accentClasses[accentColor])}></div>
      
      <div className="pl-4 flex justify-between items-start mb-6">
        <h3 className="text-xs font-bold tracking-[0.15em] text-on-surface-variant uppercase">{title}</h3>
        {highlight && (
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider", getHighlightClass())}>
            {highlight.text}
          </span>
        )}
      </div>
      
      <div className="pl-4 flex items-end space-x-3">
        <p className={cn("font-display text-5xl font-semibold leading-none", accentColor === 'error' ? 'text-error animate-pulse' : 'text-white')}>
          {value}
        </p>
        {subtext && (
          <p className="text-sm font-medium text-secondary pb-1">{subtext}</p>
        )}
      </div>
    </div>
  );
}
