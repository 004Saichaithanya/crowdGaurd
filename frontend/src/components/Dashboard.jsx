import React from 'react';
import { useCrowdData } from '../hooks/useCrowdData';
import { KpiCard } from './KpiCard';
import { VideoFeed } from './VideoFeed';
import { AlertsPanel } from './AlertsPanel';
import { CrowdFlowChart } from './charts/CrowdFlowChart';
import { ZoneOccupancyChart } from './charts/ZoneOccupancyChart';

export function Dashboard() {
  const { isConnected, liveData, history, alerts } = useCrowdData();

  // Status computation for UI based on density
  const getDensityHighlight = (density) => {
    switch (density.toLowerCase()) {
      case 'high': return { type: 'critical', text: 'CRITICAL' };
      case 'medium': return { type: 'warning', text: 'WARNING' };
      default: return { type: 'safe', text: 'STABLE' };
    }
  };

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Total Occupancy" 
          value={liveData.people_count.toLocaleString()}
          subtext="+12%" 
          accentColor="secondary"
        />
        <KpiCard 
          title="Density Status" 
          value={liveData.density.toUpperCase()}
          highlight={getDensityHighlight(liveData.density)}
          accentColor={liveData.density.toLowerCase() === 'high' ? 'error' : liveData.density.toLowerCase() === 'medium' ? 'tertiary' : 'secondary'}
        />
        <KpiCard 
          title="Network Nodes" 
          value="42" 
          subtext="/ 48" 
          accentColor="on-surface-variant"
        />
        <KpiCard 
          title="AI Alerts (24H)" 
          value="18" 
          subtext="Action Needed" 
          accentColor="tertiary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[600px]">
        
        {/* Left Column (Video & Charts) */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="flex-1 min-h-[400px]">
            <VideoFeed />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
            <CrowdFlowChart data={history} />
            <ZoneOccupancyChart />
          </div>
        </div>

        {/* Right Column (Alerts) */}
        <div className="lg:col-span-1 h-full">
          <AlertsPanel alerts={alerts} />
        </div>

      </div>

      {/* Status Bar */}
      <div className="flex justify-end space-x-6 items-center px-4 py-3 bg-surface-container-highest/50 backdrop-blur rounded-lg border ghost-border absolute bottom-8 right-8 shadow-ambient">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-secondary' : 'bg-error'}`}></div>
          <span className="text-[10px] font-bold tracking-widest uppercase text-white">
            {isConnected ? 'Network_Stable' : 'Network_Offline'}
          </span>
        </div>
        <div className="flex items-center space-x-2 border-l ghost-border pl-6">
          <span className="text-[10px] font-bold tracking-widest uppercase text-white">Sync_Complete</span>
        </div>
        <div className="flex items-center space-x-2 border-l ghost-border pl-6">
          <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">Latency: 14ms</span>
        </div>
      </div>
    </div>
  );
}
