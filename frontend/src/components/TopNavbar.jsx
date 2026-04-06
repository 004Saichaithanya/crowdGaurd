import React from 'react';
import { Bell, Cpu, Radio, User } from 'lucide-react';

const VIEW_TITLES = {
  dashboard: 'Analytics',
  cameras: 'Cameras',
  zones: 'Zones',
  alerts: 'Alerts',
  training: 'AI Training',
};

export function TopNavbar({
  activeView = 'dashboard',
  onViewChange,
  deploymentInfo,
  modelInfo,
  cameras = [],
  activeAlerts = [],
  isConnected = false,
}) {
  const activeCameraCount = Array.isArray(cameras) ? cameras.length : 0;
  const alertCount = Array.isArray(activeAlerts) ? activeAlerts.length : 0;
  const activeModel = modelInfo?.active_model || 'Awaiting model';
  const deploymentMode = deploymentInfo?.mode || 'awaiting';

  return (
    <header className="h-20 w-full flex items-center justify-between px-8 bg-background border-b ghost-border backdrop-blur-md sticky top-0 z-10 transition-all">
      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_12px_rgba(107,254,156,0.6)] ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></div>
          <span className={`text-xs font-bold tracking-widest uppercase ${isConnected ? 'text-secondary' : 'text-error'}`}>{VIEW_TITLES[activeView] || 'Live Feed'}</span>
        </div>
        
        <nav className="flex space-x-6">
          <span className="text-sm font-medium text-on-surface-variant">{`Mode: ${deploymentMode}`}</span>
          <span className="text-sm font-medium text-on-surface-variant">{`Cameras: ${activeCameraCount}`}</span>
          <span className="text-sm font-medium text-on-surface-variant">{`Alerts: ${alertCount}`}</span>
        </nav>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border ghost-border bg-surface-container-low text-sm text-white">
          <Cpu size={16} className="text-primary" />
          <span>{activeModel}</span>
        </div>

        <button
          className="relative text-on-surface-variant hover:text-white transition-colors p-2 rounded-lg hover:bg-surface-container-low"
          aria-label="Active alerts"
          onClick={() => onViewChange?.('alerts')}
          type="button"
        >
          <Bell size={20} />
          {alertCount > 0 && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border border-background"></div>}
        </button>

        <div className="flex items-center space-x-2 pl-4 border-l ghost-border">
          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center border ghost-border">
            {isConnected ? <Radio size={16} className="text-secondary"/> : <User size={16} className="text-primary"/>}
          </div>
          <span className="text-xs font-bold text-on-surface tracking-wider">{isConnected ? 'Backend Online' : 'Backend Offline'}</span>
        </div>
      </div>
    </header>
  );
}
