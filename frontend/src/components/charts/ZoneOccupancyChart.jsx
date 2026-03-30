import React from 'react';
import { cn } from '../../lib/utils';

export function ZoneOccupancyChart() {
  const zones = [
    { name: 'ZONE 1', value: 45, color: 'bg-secondary' }, // green
    { name: 'ZONE 2', value: 78, color: 'bg-tertiary' },  // yellow
    { name: 'ZONE 3', value: 22, color: 'bg-secondary' }, // green
    { name: 'ZONE 4', value: 92, color: 'bg-error' },     // red
  ];

  return (
    <div className="glass-card p-6 h-full flex flex-col border ghost-border group">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-bold tracking-[0.15em] text-on-surface-variant uppercase">Zone Occupancy Heat</h3>
        <button className="text-on-surface-variant hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H14M4 18H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div className="flex-1 space-y-6">
        {zones.map((zone, idx) => (
          <div key={idx} className="flex items-center space-x-4">
            <span className="text-[10px] w-12 font-bold tracking-widest text-on-surface-variant uppercase">{zone.name}</span>
            <div className="flex-1 h-3 bg-surface-container-lowest rounded-sm overflow-hidden border border-[rgba(64,72,93,0.3)]">
              <div 
                className={cn("h-full rounded-sm transition-all duration-1000 ease-out", zone.color)}
                style={{ width: `${zone.value}%`, boxShadow: zone.value > 80 ? '0 0 10px rgba(255,113,108,0.5)' : 'none' }}
              ></div>
            </div>
            <span className="text-xs font-bold text-white w-8 text-right">{zone.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
