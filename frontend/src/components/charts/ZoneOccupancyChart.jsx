import React from 'react';
import { cn } from '../../lib/utils';

export function ZoneOccupancyChart({ data }) {
  // data is an array of 4 integers [northWest, northEast, southWest, southEast]
  const counts = data || [0, 0, 0, 0];
  const maxCapacity = 20; // assumed max per zone for percentage
  const getPercentage = (count) => Math.min(100, Math.round((count / maxCapacity) * 100));
  const getColor = (pct) => pct > 80 ? 'bg-error' : pct > 50 ? 'bg-tertiary' : 'bg-secondary';
  
  const zones = counts.map((count, i) => ({
    name: `ZONE ${i + 1}`,
    value: getPercentage(count),
    color: getColor(getPercentage(count)),
  }));

  return (
    <div className="glass-card p-6 h-full flex flex-col border ghost-border group">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xs font-bold tracking-[0.15em] text-on-surface-variant uppercase">Zone Occupancy Heat</h3>
        <div className="text-on-surface-variant transition-colors" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H14M4 18H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div className="flex-1 space-y-6">
        {zoneData.map((zone, idx) => (
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
