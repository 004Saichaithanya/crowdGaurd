import React from 'react';
import { cn } from '../lib/utils';
import { ShieldAlert } from 'lucide-react';

export function AlertsPanel({ alerts = [] }) {
  // Use mock alerts if empty for presentation purposes
  const displayAlerts = alerts.length > 0 ? alerts : [
    { id: 1, type: 'critical', time: '2m ago', title: 'Maximum capacity reached in North Concourse.', action: true },
    { id: 2, type: 'warning', time: '14m ago', title: 'Unusual stationary object identified in Gate 12 loading bay.', action: true, image: true },
    { id: 3, type: 'info', time: '1h ago', title: 'Zone 03 facial recognition database updated (8.4k entries).', action: false },
    { id: 4, type: 'safe', time: '2h ago', title: 'Slight congestion forming at Escalator B entrance.', action: false }
  ];

  const getAlertStyles = (type) => {
    switch(type) {
      case 'critical': return { border: 'border-l-error', text: 'text-error', label: 'CRITICAL BREACH' };
      case 'warning': return { border: 'border-l-tertiary', text: 'text-tertiary', label: 'ANOMALY DETECTED' };
      case 'info': return { border: 'border-l-primary', text: 'text-primary', label: 'SYSTEM INFO' };
      case 'safe': return { border: 'border-l-secondary', text: 'text-secondary', label: 'FLOW WARNING' };
      default: return { border: 'border-l-on-surface-variant', text: 'text-on-surface-variant', label: 'MESSAGE' };
    }
  };

  return (
    <div className="glass-card flex flex-col h-full border ghost-border overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b ghost-border">
        <h3 className="text-sm font-bold tracking-widest text-white uppercase flex items-center space-x-2">
          <ShieldAlert size={16} className="text-error" />
          <span>Real-Time Alerts</span>
        </h3>
        <span className="bg-surface-container-low px-2 py-1 rounded text-[10px] uppercase font-bold text-on-surface-variant">
          8 Active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayAlerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          
          return (
            <div key={alert.id} className={cn("glass-panel p-4 border-l-[3px] shadow-ambient transition-all hover:bg-surface-container-highest", styles.border)}>
              <div className="flex justify-between items-start mb-2">
                <span className={cn("text-[10px] font-bold tracking-widest uppercase", styles.text)}>{styles.label}</span>
                <span className="text-[10px] text-on-surface-variant">{alert.time}</span>
              </div>
              
              <p className="text-sm text-white font-medium mb-3 leading-relaxed">
                {alert.title || alert.message}
              </p>

              {alert.action && (
                <div className="flex space-x-3 mt-4">
                  <button className={cn("px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-wider uppercase transition-colors", alert.type === 'critical' ? 'bg-error text-white hover:bg-error/80' : 'bg-surface-variant text-white hover:bg-surface-variant/80')}>
                     {alert.type === 'critical' ? 'Dispatch' : 'View Snapshot'}
                  </button>
                  {alert.type === 'critical' && (
                    <button className="px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-wider uppercase text-on-surface-variant hover:text-white transition-colors">
                      Ignore
                    </button>
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
