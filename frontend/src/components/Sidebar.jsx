import React from 'react';
import { LayoutDashboard, Video, Grid, AlertTriangle, Brain, Activity, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar({
  activeView,
  onViewChange,
  deploymentInfo,
  modelInfo,
  cameras = [],
  activeAlerts = [],
  isConnected = false,
}) {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
    { icon: Video, label: 'Cameras', view: 'cameras' },
    { icon: Grid, label: 'Zones', view: 'zones' },
    { icon: AlertTriangle, label: 'Alerts', view: 'alerts' },
    { icon: Brain, label: 'AI Training', view: 'training' },
  ];

  const bottomItems = [
    { icon: Activity, label: isConnected ? 'System Online' : 'System Offline' },
    { icon: HelpCircle, label: deploymentInfo?.mode ? `${deploymentInfo.mode} mode` : 'Awaiting mode' },
  ];
  const appTitle = deploymentInfo?.mode === 'edge' ? 'CrowdGuard Edge' : 'CrowdGuard';
  const versionLabel = modelInfo?.active_model
    ? `${modelInfo.active_model}${modelInfo?.fallback_used ? ' (fallback)' : ''}`
    : 'Awaiting model';
  const cameraSummary = Array.isArray(cameras) ? `${cameras.length} camera${cameras.length === 1 ? '' : 's'}` : 'No cameras';
  const alertSummary = Array.isArray(activeAlerts) ? `${activeAlerts.length} active alerts` : '0 active alerts';

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r ghost-border flex flex-col pt-6 pb-6 shadow-2xl z-20">
      <div className="px-8 mb-10">
        <h1 className="text-2xl font-display font-medium text-white">{appTitle}</h1>
        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mt-1">{versionLabel}</p>
        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mt-2">{cameraSummary}</p>
        <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mt-1">{alertSummary}</p>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              className={cn(
                "flex items-center w-full space-x-4 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group text-on-surface-variant hover:bg-surface-container-highest",
                activeView === item.view && "bg-surface-container-highest text-primary font-semibold"
              )}
              onClick={() => onViewChange?.(item.view)}
            >
              <Icon size={20} className={cn("", activeView === item.view ? "text-primary" : "text-on-surface-variant group-hover:text-primary transition-colors")} />
              <span>{item.label}</span>
              {activeView === item.view && <div className="ml-auto w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(94,180,255,0.8)]"></div>}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 space-y-2">
        {bottomItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center w-full space-x-4 px-4 py-3 rounded-lg text-sm font-medium text-on-surface-variant bg-surface-container-low/40 border ghost-border"
            >
              <Icon size={20} className="text-on-surface-variant" />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
