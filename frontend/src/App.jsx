import React from 'react';
import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CamerasView } from './components/CamerasView';
import { ZonesTab } from './components/ZonesTab';
import { AlertsTab } from './components/AlertsTab';
import { AiTrainingTab } from './components/AiTrainingTab';
import { useCrowdData } from './hooks/useCrowdData';

function PlaceholderView({ title, body }) {
  return (
    <div className="glass-card border ghost-border p-10 max-w-3xl">
      <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold mb-3">{title}</p>
      <p className="text-lg text-white">{body}</p>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const crowdData = useCrowdData();

  const renderView = () => {
    if (activeView === 'dashboard') {
      return <Dashboard {...crowdData} />;
    }

    if (activeView === 'cameras') {
      return <CamerasView {...crowdData} />;
    }

    if (activeView === 'zones') {
      return <ZonesTab liveData={crowdData.liveData} refreshZones={crowdData.refreshZones} />;
    }

    if (activeView === 'alerts') {
      return (
        <AlertsTab
          alerts={crowdData.recentAlerts}
          activeAlerts={crowdData.activeAlerts}
          dispatchAlert={crowdData.dispatchAlert}
          ignoreAlert={crowdData.ignoreAlert}
          alertActionState={crowdData.alertActionState}
          refreshAlerts={crowdData.refreshAlerts}
        />
      );
    }

    if (activeView === 'training') {
      return <AiTrainingTab
        aiTraining={crowdData.aiTraining}
        trainingLog={crowdData.trainingLog}
        startTraining={crowdData.startTraining}
        stopTraining={crowdData.stopTraining}
        refreshTraining={crowdData.refreshTraining}
      />;
    }

    return <PlaceholderView title="Unknown View" body="Please use the sidebar to select a valid tab." />;
  };

  return (
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      deploymentInfo={crowdData.deploymentInfo}
      modelInfo={crowdData.modelInfo}
      cameras={crowdData.cameras}
      activeAlerts={crowdData.activeAlerts}
      isConnected={crowdData.isConnected}
    >
      {renderView()}
    </Layout>
  );
}
