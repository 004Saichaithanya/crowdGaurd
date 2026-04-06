import React from 'react';
import { AlertTriangle } from 'lucide-react';

function getAlertTone(alert) {
  if (alert.status === 'active') return 'text-error';
  if (alert.status === 'resolved') return 'text-secondary';
  if (alert.response === 'dispatched') return 'text-primary';
  return 'text-tertiary';
}

export function AlertsTab({ alerts, activeAlerts, dispatchAlert, ignoreAlert, alertActionState, refreshAlerts }) {
  const formatPeak = (alert) => {
    if (typeof alert.peak_people_count === 'number') return alert.peak_people_count;
    if (typeof alert.people_count === 'number') return alert.people_count;
    return 'N/A';
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between p-5 glass-panel border ghost-border">
        <div>
          <h2 className="text-2xl font-display font-semibold">Alerts Center</h2>
          <p className="text-sm text-on-surface-variant">Real-time events and remediation actions for crowd density and camera zone anomalies.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant">{activeAlerts.length} active</span>
          <button onClick={refreshAlerts} className="px-4 py-2 rounded-lg bg-primary text-black text-xs font-bold">Refresh</button>
        </div>
      </div>

      <div className="glass-card border ghost-border p-6">
        {alerts.length === 0 ? (
          <div className="text-on-surface-variant">No alerts are currently available for display.</div>
        ) : (
          <ul className="space-y-4">
            {alerts.map((alert) => (
              <li key={alert.id} className="p-4 border rounded-lg bg-surface-container-low">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle size={14} className={getAlertTone(alert)} />
                      <span className="uppercase tracking-[0.1em] text-on-surface-variant">{alert.type || alert.severity || 'alert'}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-on-surface-variant/70">{alert.status}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{alert.title || alert.message}</h3>
                    <p className="text-xs text-on-surface-variant mt-1">{alert.message}</p>
                    <p className="text-[11px] text-on-surface-variant mt-2">
                      {`Response: ${alert.response || 'pending'} | Peak people: ${formatPeak(alert)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] uppercase text-on-surface-variant mb-2">{alert.time}</span>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => dispatchAlert(alert.id)}
                        disabled={alert.status !== 'active' || alert.response === 'dispatched' || alertActionState[alert.id] === 'dispatch'}
                        className="text-xs px-2 py-1 rounded bg-error text-white font-bold disabled:opacity-60"
                      >
                        {alert.response === 'dispatched' ? 'Dispatched' : alertActionState[alert.id] === 'dispatch' ? 'Dispatching...' : 'Dispatch'}
                      </button>
                      <button
                        onClick={() => ignoreAlert(alert.id)}
                        disabled={alert.status !== 'active' || alertActionState[alert.id] === 'ignore'}
                        className="text-xs px-2 py-1 rounded bg-secondary text-black font-bold disabled:opacity-60"
                      >
                        {alertActionState[alert.id] === 'ignore' ? 'Ignoring...' : 'Ignore'}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
