import React from 'react';
import { KpiCard } from './KpiCard';
import { VideoFeed } from './VideoFeed';
import { AlertsPanel } from './AlertsPanel';
import { CrowdFlowChart } from './charts/CrowdFlowChart';
import { ZoneOccupancyChart } from './charts/ZoneOccupancyChart';

export function Dashboard({
  isConnected,
  liveData,
  history,
  activeAlerts,
  alertSummary,
  videoUrl,
  cameras,
  deploymentInfo,
  modelInfo,
  dispatchAlert,
  ignoreAlert,
  alertActionState,
}) {
  const occupancyValue = typeof liveData.people_count === 'number' ? liveData.people_count.toLocaleString() : 'N/A';
  const densityValue = liveData.density ? liveData.density.toUpperCase() : 'AWAITING';
  const cameraCount = Array.isArray(cameras) ? cameras.length : 0;
  const latencyValue = typeof liveData.average_latency_ms === 'number' ? `${Math.round(liveData.average_latency_ms)}ms` : 'Awaiting telemetry';
  const deploymentMode = deploymentInfo?.mode ? deploymentInfo.mode.toUpperCase() : 'AWAITING';
  const modelLabel = modelInfo?.active_model || 'Awaiting model';

  // Status computation for UI based on density
  const getDensityHighlight = (density) => {
    if (!density) return { type: 'warning', text: 'PENDING' };
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
          value={occupancyValue}
          accentColor="secondary"
        />
        <KpiCard 
          title="Density Status" 
          value={densityValue}
          highlight={getDensityHighlight(liveData.density)}
          accentColor={liveData.density?.toLowerCase() === 'high' ? 'error' : liveData.density?.toLowerCase() === 'medium' ? 'tertiary' : 'secondary'}
        />
        <KpiCard 
          title="Camera Nodes" 
          value={cameraCount > 0 ? cameraCount.toString() : 'N/A'}
          subtext={cameraCount > 0 ? 'configured' : 'Awaiting inventory'}
          accentColor="on-surface-variant"
        />
        <KpiCard 
          title="AI Alerts (24H)" 
          value={(alertSummary?.total_events ?? liveData.alerts_count).toString()}
          subtext={`${alertSummary?.active_alerts_count ?? activeAlerts.length} active`}
          accentColor="tertiary"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Video & Charts) */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <div className="flex-1 max-h-[480px]">
            <VideoFeed
              videoUrl={videoUrl}
              isConnected={isConnected}
              cameraName={liveData.camera_name || liveData.camera_id}
              deploymentMode={liveData.deployment_mode || deploymentInfo?.mode}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ minHeight: 250 }}>
            <CrowdFlowChart data={history} />
            <ZoneOccupancyChart data={liveData.zones} />
          </div>
        </div>

        {/* Right Column (Alerts) */}
        <div className="lg:col-span-1 h-full">
          <AlertsPanel
            alerts={activeAlerts}
            onDispatchAlert={dispatchAlert}
            onIgnoreAlert={ignoreAlert}
            actionState={alertActionState}
            activeCount={alertSummary?.active_alerts_count ?? activeAlerts.length}
          />
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
          <span className="text-[10px] font-bold tracking-widest uppercase text-white">{`${deploymentMode} | ${modelLabel}`}</span>
        </div>
        <div className="flex items-center space-x-2 border-l ghost-border pl-6">
          <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">{`Latency: ${latencyValue}`}</span>
        </div>
      </div>
    </div>
  );
}
