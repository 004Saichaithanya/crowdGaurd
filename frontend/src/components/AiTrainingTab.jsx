import React from 'react';

export function AiTrainingTab({ aiTraining, trainingLog, startTraining, stopTraining, refreshTraining }) {
  const statusLabel = aiTraining?.status || 'idle';
  const progressValue = typeof aiTraining?.progress === 'number' ? aiTraining.progress : null;
  const progressLabel = progressValue === null ? 'Awaiting telemetry' : `${progressValue}%`;
  const progressWidth = progressValue === null ? 0 : Math.min(Math.max(progressValue, 0), 100);
  const messageLabel = aiTraining?.message || 'No training status available from the backend.';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="glass-card border ghost-border p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant font-bold">AI Model Training</p>
          <h2 className="text-3xl font-display text-white">Continuous Optimization</h2>
          <p className="text-sm text-on-surface-variant mt-1">Schedule training cycles from the console and monitor model performance metrics.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={refreshTraining} className="px-3 py-2 rounded-lg border ghost-border text-sm text-on-surface-variant hover:text-white">Refresh Status</button>
          <button onClick={startTraining} className="px-3 py-2 rounded-lg bg-secondary text-black text-sm font-bold">Start Training</button>
          <button onClick={stopTraining} className="px-3 py-2 rounded-lg bg-error text-white text-sm font-bold">Stop Training</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card border ghost-border p-6">
          <h3 className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-bold mb-3">Training State</h3>
          <p><strong>Status:</strong> <span className={statusLabel === 'running' ? 'text-secondary' : statusLabel === 'completed' ? 'text-primary' : 'text-on-surface-variant'}>{statusLabel}</span></p>
          <p><strong>Progress:</strong> {progressLabel}</p>
          <p><strong>Message:</strong> {messageLabel}</p>
          <div className="h-4 bg-surface-container-low mt-4 rounded overflow-hidden">
            <div className="h-full bg-secondary transition-all" style={{ width: `${progressWidth}%` }}></div>
          </div>
        </div>

        <div className="xl:col-span-2 glass-card border ghost-border p-6">
          <h3 className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-bold mb-3">Training Activity Log</h3>
          <div className="max-h-[350px] overflow-y-auto space-y-2">
            {trainingLog.length === 0 ? (
              <p className="text-on-surface-variant">No activity logged yet. Start training to see live updates.</p>
            ) : (
              trainingLog.map((entry, idx) => (
                <div key={idx} className="text-sm text-white border-b border-surface-variant pb-1">{entry}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
