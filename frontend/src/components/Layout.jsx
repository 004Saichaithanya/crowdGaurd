import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

export function Layout({
  children,
  activeView,
  onViewChange,
  deploymentInfo,
  modelInfo,
  cameras,
  activeAlerts,
  isConnected,
}) {
  return (
    <div className="flex bg-[#060e20] min-h-screen font-body text-white">
      <Sidebar
        activeView={activeView}
        onViewChange={onViewChange}
        deploymentInfo={deploymentInfo}
        modelInfo={modelInfo}
        cameras={cameras}
        activeAlerts={activeAlerts}
        isConnected={isConnected}
      />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopNavbar
          activeView={activeView}
          onViewChange={onViewChange}
          deploymentInfo={deploymentInfo}
          modelInfo={modelInfo}
          cameras={cameras}
          activeAlerts={activeAlerts}
          isConnected={isConnected}
        />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
