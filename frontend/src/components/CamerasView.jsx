import React, { useState } from 'react';
import { Activity, Clock3, Radio, ShieldAlert, Wifi } from 'lucide-react';
import { VideoFeed } from './VideoFeed';
import { CrowdFlowChart } from './charts/CrowdFlowChart';
import { ZoneOccupancyChart } from './charts/ZoneOccupancyChart';
import { AlertsPanel } from './AlertsPanel';

function formatLastUpdated(lastUpdated) {
  if (!lastUpdated) {
    return 'Waiting for live telemetry';
  }

  return new Date(lastUpdated).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function CameraTelemetryCard({ icon, label, value, tone = 'text-white' }) {
  const Icon = icon;

  return (
    <div className="glass-panel border ghost-border p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-surface-container-highest flex items-center justify-center border ghost-border">
        {Icon && <Icon size={18} className="text-primary" />}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-bold">{label}</p>
        <p className={`text-xl font-display ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

export function CamerasView({
  isConnected,
  liveData,
  history,
  cameras,
  activeCamera,
  activeCameraId,
  setActiveCameraId,
  activeAlerts,
  dispatchAlert,
  ignoreAlert,
  alertActionState,
  alertSummary,
  lastUpdated,
  connectionError,
  videoUrl,
  socketUrl,
  uploadRecordedVideo,
  uploadState,
  cameraUpdateState,
  renameCamera,
  removeCamera,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [removingCameraId, setRemovingCameraId] = useState(null);
  const [editingCameraId, setEditingCameraId] = useState(null);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const hasCameraNodes = Array.isArray(cameras) && cameras.length > 0;
  const peopleInFrame = typeof liveData.people_count === 'number' ? `${liveData.people_count}` : 'Awaiting';
  const densityState = liveData.density || 'Awaiting';
  const cameraName = liveData.camera_name || activeCamera?.display_name || activeCameraId || 'No camera selected';
  const activeZoneIndex = Array.isArray(liveData.zones) && liveData.zones.length > 0
    ? liveData.zones.indexOf(Math.max(...liveData.zones)) + 1
    : null;
  const latencyValue = typeof liveData.average_latency_ms === 'number' ? `${Math.round(liveData.average_latency_ms)} ms` : 'Awaiting telemetry';
  const refreshMode = liveData.deployment_mode ? `${liveData.deployment_mode} profile` : 'Awaiting profile';
  const densityTone = liveData.density?.toLowerCase() === 'high'
    ? 'text-error'
    : liveData.density?.toLowerCase() === 'medium'
      ? 'text-tertiary'
      : 'text-secondary';

  const handleUpload = async () => {
    const success = await uploadRecordedVideo?.(selectedFile, displayName);
    if (success) {
      setSelectedFile(null);
      setDisplayName('');
    }
  };

  const handleRemoveCamera = async (event, cameraId) => {
    event.stopPropagation();
    if (!cameraId || !removeCamera) {
      return;
    }

    setRemovingCameraId(cameraId);
    await removeCamera(cameraId);
    setRemovingCameraId(null);
  };

  const startRename = (event, camera) => {
    event.stopPropagation();
    setEditingCameraId(camera.camera_id);
    setEditingDisplayName(camera.display_name || '');
  };

  const saveRename = async (event, cameraId) => {
    event.stopPropagation();
    const success = await renameCamera?.(cameraId, editingDisplayName);
    if (success) {
      setEditingCameraId(null);
      setEditingDisplayName('');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <section className="glass-card border ghost-border p-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
        <div className="space-y-3">
          <p className="text-[11px] tracking-[0.22em] uppercase text-primary font-bold">Camera Operations</p>
          <h2 className="text-3xl font-display text-white">Live crowd surveillance is running from the backend stream.</h2>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            This panel follows the real-time MJPEG feed and Socket.IO telemetry from the Python service so operators can watch live occupancy, density shifts, and zone pressure without leaving the Cameras tab.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[280px]">
          <CameraTelemetryCard
            icon={Wifi}
            label="Backend Link"
            value={isConnected ? 'Connected' : 'Offline'}
            tone={isConnected ? 'text-secondary' : 'text-error'}
          />
          <CameraTelemetryCard
            icon={Clock3}
            label="Last Packet"
            value={formatLastUpdated(lastUpdated)}
          />
          <CameraTelemetryCard
            icon={Activity}
            label="People In Frame"
            value={peopleInFrame}
          />
          <CameraTelemetryCard
            icon={ShieldAlert}
            label="Density State"
            value={densityState}
            tone={densityTone}
          />
        </div>
      </section>

      <section className="glass-card border ghost-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-bold">Camera Nodes</p>
            <h3 className="text-lg font-display text-white">Available feeds</h3>
          </div>
          <span className="text-xs uppercase tracking-[0.15em] text-on-surface-variant">{`${cameras.length} configured`}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Optional camera display name"
              className="bg-surface-container-low border ghost-border text-sm text-white rounded-lg px-4 py-3 focus:outline-none focus:border-primary/50"
            />
            <input
              type="file"
              accept=".mp4,.avi,.mov,.mkv"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="bg-surface-container-low border ghost-border text-sm text-white rounded-lg px-4 py-3 file:mr-4 file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-black file:font-bold"
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || uploadState?.status === 'uploading'}
            className="px-5 py-3 rounded-lg bg-primary text-black text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploadState?.status === 'uploading' ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>

        {uploadState?.message && (
              <div className={`rounded-xl border p-4 mb-6 text-sm ${uploadState.status === 'error' ? 'border-error text-error' : 'ghost-border text-on-surface-variant'}`}>
            {uploadState.message}
            {uploadState?.status === 'uploading' && (
              <div className="mt-3 h-2 w-full rounded-full bg-surface-container-highest overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-300"
                  style={{ width: `${uploadState.progress || 0}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!hasCameraNodes ? (
          <div className="rounded-xl border ghost-border bg-surface-container-low p-5 text-on-surface-variant">
            No camera nodes are configured yet. Upload a recorded video to create the first camera node.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cameras.map((camera) => {
              const isActive = camera.camera_id === activeCameraId;
              return (
                <div
                  key={camera.camera_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveCameraId?.(camera.camera_id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveCameraId?.(camera.camera_id);
                    }
                  }}
                  className={`text-left rounded-xl border p-4 transition-colors ${isActive ? 'border-primary bg-primary/10' : 'ghost-border bg-surface-container-low hover:bg-surface-container-highest'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-on-surface-variant font-bold">{camera.camera_id}</p>
                      {editingCameraId === camera.camera_id ? (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingDisplayName}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => setEditingDisplayName(event.target.value)}
                            className="bg-surface-container-highest border ghost-border text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50"
                          />
                          <button
                            type="button"
                            onClick={(event) => saveRename(event, camera.camera_id)}
                            disabled={cameraUpdateState?.[camera.camera_id] === 'saving' || !editingDisplayName.trim()}
                            className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-black disabled:opacity-60"
                          >
                            {cameraUpdateState?.[camera.camera_id] === 'saving' ? 'Saving' : 'Save'}
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-base text-white font-semibold mt-1">{camera.display_name}</h4>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => startRename(event, camera)}
                        className="rounded-lg border ghost-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                      >
                        Edit
                      </button>
                      {camera.managed && (
                        <button
                          type="button"
                          onClick={(event) => handleRemoveCamera(event, camera.camera_id)}
                          disabled={removingCameraId === camera.camera_id}
                          className="rounded-lg border border-error/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-error disabled:opacity-60"
                        >
                          {removingCameraId === camera.camera_id ? 'Removing' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2 break-all">{camera.source}</p>
                  <p className="text-[11px] text-on-surface-variant mt-3">{`Density: ${camera.density || 'Awaiting'}`}</p>
                  {cameraUpdateState?.[camera.camera_id] === 'error' && (
                    <p className="text-[11px] text-error mt-2">Unable to save the updated camera name.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="glass-card border ghost-border overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b ghost-border">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-bold">Camera Node</p>
                <h3 className="text-xl font-display text-white">{cameraName}</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ghost-border ${isConnected ? 'bg-secondary/10' : 'bg-error/10'}`}>
                  <Radio size={14} className={isConnected ? 'text-secondary' : 'text-error'} />
                  <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${isConnected ? 'text-secondary' : 'text-error'}`}>
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-bold">Feed URL</p>
                  <p className="text-xs text-white">{videoUrl}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {hasCameraNodes && videoUrl ? (
                <VideoFeed
                  videoUrl={videoUrl}
                  isConnected={isConnected}
                  cameraName={cameraName}
                  deploymentMode={liveData.deployment_mode}
                />
              ) : (
                <div className="rounded-xl border ghost-border bg-surface-container-low p-8 text-center text-on-surface-variant">
                  Select a camera node or upload a recorded video to start monitoring.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CrowdFlowChart data={history} />
            <ZoneOccupancyChart zones={liveData.zones} total={liveData.people_count} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card border ghost-border p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-bold">Stream Status</p>
                <h3 className="text-lg font-display text-white">Realtime diagnostics</h3>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></div>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-on-surface-variant">Socket endpoint</span>
                <span className="text-white text-right break-all">{socketUrl}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-on-surface-variant">Telemetry refresh</span>
                <span className="text-white text-right">{refreshMode}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-on-surface-variant">Average latency</span>
                <span className="text-white text-right">{latencyValue}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-on-surface-variant">Most active zone</span>
                <span className="text-white text-right">
                  {activeZoneIndex ? `Zone ${activeZoneIndex}` : 'Awaiting telemetry'}
                </span>
              </div>
              <div className="rounded-xl bg-surface-container-low p-4 border ghost-border">
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant font-bold mb-2">Operator note</p>
                <p className="text-sm text-white">
                  {connectionError || 'Backend heartbeat detected. Camera telemetry is flowing into the dashboard.'}
                </p>
              </div>
            </div>
          </div>

          <div className="h-[520px]">
            <AlertsPanel
              alerts={activeAlerts}
              onDispatchAlert={dispatchAlert}
              onIgnoreAlert={ignoreAlert}
              actionState={alertActionState}
              activeCount={alertSummary?.active_alerts_count ?? activeAlerts.length}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
