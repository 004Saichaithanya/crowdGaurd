import React from 'react';
import { cn } from '../lib/utils';
import { ShieldAlert } from 'lucide-react';

export function AlertsPanel({
  alerts = [],
  onDispatchAlert,
  onIgnoreAlert,
  actionState = {},
  activeCount,
}) {
  const getAlertStyles = (type) => {
    switch(type) {
      case 'critical': return { border: 'border-l-error', text: 'text-error', label: 'CRITICAL BREACH' };
      case 'warning': return { border: 'border-l-tertiary', text: 'text-tertiary', label: 'ANOMALY DETECTED' };
      case 'info': return { border: 'border-l-primary', text: 'text-primary', label: 'SYSTEM INFO' };
      case 'safe': return { border: 'border-l-secondary', text: 'text-secondary', label: 'FLOW WARNING' };
      default: return { border: 'border-l-on-surface-variant', text: 'text-on-surface-variant', label: 'MESSAGE' };
    }
  };
  const formatPeak = (alert) => {
    if (typeof alert.peak_people_count === 'number') return alert.peak_people_count;
    if (typeof alert.people_count === 'number') return alert.people_count;
    return 'N/A';
  };

  return (
    <div className="glass-card flex flex-col h-full border ghost-border overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b ghost-border">
        <h3 className="text-sm font-bold tracking-widest text-white uppercase flex items-center space-x-2">
          <ShieldAlert size={16} className="text-error" />
          <span>Real-Time Alerts</span>
        </h3>
        <span className="bg-surface-container-low px-2 py-1 rounded text-[10px] uppercase font-bold text-on-surface-variant">
          {activeCount ?? alerts.length} Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {alerts.length === 0 && (
          <div className="glass-panel p-5 border ghost-border text-center">
            <p className="text-[10px] font-bold tracking-widest uppercase text-secondary mb-2">No Critical Alerts</p>
            <p className="text-sm text-on-surface-variant">
              A new alert will appear here only when the feed crosses into high density.
            </p>
          </div>
        )}

        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const isDispatching = actionState[alert.id] === 'dispatch';
          const isIgnoring = actionState[alert.id] === 'ignore';
          const isDispatched = alert.status === 'dispatched';
          
          return (
            <div key={alert.id} className={cn("glass-panel p-4 border-l-[3px] shadow-ambient transition-all hover:bg-surface-container-highest", styles.border)}>
              <div className="flex justify-between items-start mb-2">
                <span className={cn("text-[10px] font-bold tracking-widest uppercase", styles.text)}>{styles.label}</span>
                <span className="text-[10px] text-on-surface-variant">{alert.time}</span>
              </div>
              
              <p className="text-sm text-white font-medium mb-3 leading-relaxed">
                {alert.title || alert.message}
              </p>

              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-on-surface-variant">
                <span>{`Response: ${alert.response || 'pending'}`}</span>
                <span className="text-on-surface-variant/40">|</span>
                <span>{`Peak: ${formatPeak(alert)}`}</span>
              </div>

              {alert.action && alert.status === 'active' && (
                <div className="flex space-x-3 mt-4">
                  <button
                    onClick={() => onDispatchAlert?.(alert.id)}
                    disabled={!onDispatchAlert || isDispatched || isDispatching || isIgnoring}
                    className={cn(
                      "px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-wider uppercase transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                      alert.type === 'critical' ? 'bg-error text-white hover:bg-error/80' : 'bg-surface-variant text-white hover:bg-surface-variant/80'
                    )}
                  >
                     {isDispatched ? 'Dispatched' : isDispatching ? 'Dispatching...' : alert.type === 'critical' ? 'Dispatch' : 'View Snapshot'}
                  </button>
                  {alert.type === 'critical' && (
                    <button
                      onClick={() => onIgnoreAlert?.(alert.id)}
                      disabled={!onIgnoreAlert || isDispatching || isIgnoring}
                      className="px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-wider uppercase text-on-surface-variant hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isIgnoring ? 'Ignoring...' : 'Ignore'}
                    </button>
                  )}
                  {isDispatched && (
                    <span className="px-3 py-1.5 rounded-sm text-[10px] font-bold tracking-wider uppercase bg-secondary/15 text-secondary border border-secondary/30">
                      Team Notified
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
}
