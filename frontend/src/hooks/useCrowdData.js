import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://127.0.0.1:5000';

function normalizeAlert(alert) {
  if (!alert) {
    return null;
  }

  return {
    action: true,
    response: 'pending',
    severity: 'high',
    status: 'active',
    ...alert,
  };
}

export function useCrowdData() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionError, setConnectionError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [defaultCameraId, setDefaultCameraId] = useState(null);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [deploymentInfo, setDeploymentInfo] = useState({
    mode: null,
    preferred_model: null,
    benchmark_enabled: null,
    metrics_window_size: null,
    adaptive_processing: null,
    notes: '',
  });
  const [modelInfo, setModelInfo] = useState({
    deployment_mode: null,
    requested_model: null,
    active_model: null,
    fallback_used: null,
    available_models: [],
  });
  
  // Current Live Data
  const [liveData, setLiveData] = useState({
    camera_id: null,
    camera_name: null,
    people_count: null,
    density: null,
    zones: [],
    alerts_count: null,
    average_latency_ms: null,
    inference_latency_ms: null,
    deployment_mode: null,
  });

  // Historical Data (for charts)
  const [history, setHistory] = useState([]);
  
  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertActionState, setAlertActionState] = useState({});
  const [alertSummary, setAlertSummary] = useState({ active_alerts_count: 0, total_events: 0 });
  const [aiTraining, setAiTraining] = useState({ status: 'idle', progress: 0, message: 'Idle' });
  const [trainingLog, setTrainingLog] = useState([]);
  const [uploadState, setUploadState] = useState({ status: 'idle', message: '', progress: 0 });
  const [cameraUpdateState, setCameraUpdateState] = useState({});

  const apiFetch = async (endpoint, options = {}) => {
    try {
      const resp = await fetch(`${SOCKET_URL}${endpoint}`, { headers: { 'Content-Type': 'application/json' }, ...options });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      console.error('API Error', endpoint, err);
      return null;
    }
  };

  const refreshAlerts = async () => {
    const cameraQuery = activeCameraId ? `?camera_id=${encodeURIComponent(activeCameraId)}` : '';
    const result = await apiFetch(`/api/alerts${cameraQuery}`);
    if (result?.alerts) {
      setAlerts(result.alerts.map(normalizeAlert).filter(Boolean));
      setAlertSummary({
        active_alerts_count: result.active_alerts_count || 0,
        total_events: result.total_events || 0,
      });
    }
  };

  const refreshZones = async () => {
    const endpoint = activeCameraId
      ? `/api/cameras/${encodeURIComponent(activeCameraId)}/zones`
      : '/api/zones';
    const result = await apiFetch(endpoint);
    if (result?.zones) {
      setLiveData(prev => ({
        ...prev,
        camera_id: result.camera_id || prev.camera_id,
        zones: result.zones,
        people_count: result.total_people ?? prev.people_count,
      }));
    }
  };

  const refreshCameras = async () => {
    const result = await apiFetch('/api/cameras');
    if (result?.cameras) {
      setCameras(result.cameras);
      setDefaultCameraId(result.default_camera_id || null);
      setActiveCameraId((prev) => {
        if (prev && result.cameras.some((camera) => camera.camera_id === prev)) {
          return prev;
        }
        return result.default_camera_id || result.cameras[0]?.camera_id || null;
      });
    }
  };

  const refreshTraining = async () => {
    const result = await apiFetch('/api/training');
    if (result) {
      setAiTraining(result);
    }
  };

  const refreshDeployment = async () => {
    const result = await apiFetch('/api/deployment');
    if (result) {
      setDeploymentInfo(result);
    }
  };

  const refreshModelInfo = async () => {
    const result = await apiFetch('/api/model');
    if (result) {
      setModelInfo(result);
    }
  };

  const startTraining = async () => {
    const result = await apiFetch('/api/training', { method: 'POST', body: JSON.stringify({ action: 'start' }) });
    if (result) {
      setAiTraining(prev => ({ ...prev, status: 'running', message: result.message }));
      setTrainingLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result.message}`]);
    }
  };

  const stopTraining = async () => {
    const result = await apiFetch('/api/training', { method: 'POST', body: JSON.stringify({ action: 'stop' }) });
    if (result) {
      setAiTraining(prev => ({ ...prev, status: 'stopping', message: result.message }));
      setTrainingLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result.message}`]);
    }
  };

  const uploadRecordedVideo = async (file, displayName = '') => {
    if (!file) {
      return false;
    }

    const formData = new FormData();
    formData.append('video', file);
    if (displayName) {
      formData.append('display_name', displayName);
    }

    setUploadState({ status: 'uploading', message: 'Uploading recorded video...', progress: 0 });

    try {
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${SOCKET_URL}/api/cameras/upload`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadState({
            status: 'uploading',
            message: `Uploading recorded video... ${percent}%`,
            progress: percent,
          });
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (error) {
              reject(error);
            }
            return;
          }
          try {
            const payload = JSON.parse(xhr.responseText);
            reject(new Error(payload.error || `HTTP ${xhr.status}`));
          } catch (error) {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
      await refreshCameras();
      setActiveCameraId(result.camera_id || null);
      setUploadState({ status: 'completed', message: 'Recorded video uploaded successfully.', progress: 100 });
      return true;
    } catch (err) {
      console.error('Upload Error', err);
      setUploadState({ status: 'error', message: err.message || 'Unable to upload recorded video.', progress: 0 });
      return false;
    }
  };

  const renameCamera = async (cameraId, displayName) => {
    if (!cameraId || !displayName?.trim()) {
      return false;
    }

    setCameraUpdateState((prev) => ({ ...prev, [cameraId]: 'saving' }));
    try {
      const resp = await fetch(`${SOCKET_URL}/api/cameras/${encodeURIComponent(cameraId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      const payload = await resp.json();
      if (!resp.ok) {
        throw new Error(payload.error || `HTTP ${resp.status}`);
      }

      setCameras((prev) => prev.map((camera) => (
        camera.camera_id === cameraId
          ? { ...camera, display_name: payload.camera.display_name }
          : camera
      )));
      setLiveData((prev) => (
        prev.camera_id === cameraId
          ? { ...prev, camera_name: payload.camera.display_name }
          : prev
      ));
      setCameraUpdateState((prev) => ({ ...prev, [cameraId]: 'saved' }));
      return true;
    } catch (err) {
      console.error('Rename Error', err);
      setCameraUpdateState((prev) => ({ ...prev, [cameraId]: 'error' }));
      return false;
    }
  };

  const removeCamera = async (cameraId) => {
    if (!cameraId) {
      return false;
    }

    const result = await apiFetch(`/api/cameras/${encodeURIComponent(cameraId)}`, { method: 'DELETE' });
    if (!result) {
      return false;
    }

    setCameras(result.cameras || []);
    setDefaultCameraId(result.default_camera_id || null);
    setActiveCameraId((prev) => (
      prev === cameraId
        ? result.default_camera_id || result.cameras?.[0]?.camera_id || null
        : prev
    ));

    setHistory([]);
    setLiveData({
      camera_id: result.default_camera_id || null,
      camera_name: null,
      people_count: null,
      density: null,
      zones: [],
      alerts_count: null,
      average_latency_ms: null,
      inference_latency_ms: null,
      deployment_mode: deploymentInfo?.mode || null,
    });
    await refreshAlerts();
    await refreshZones();
    return true;
  };

  const acknowledgeAlert = (id) => {
    setAlerts(prev => prev.filter((alert) => alert.id !== id));
  };

  const performAlertAction = async (id, action) => {
    setAlertActionState(prev => ({ ...prev, [id]: action }));

    const result = await apiFetch(`/api/alerts/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });

    setAlertActionState(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (!result) {
      return false;
    }

    if (action === 'ignore') {
      setAlerts(prev => prev.map((alert) => (
        alert.id === id ? { ...alert, status: 'ignored' } : alert
      )));
      return true;
    }

    if (action === 'dispatch' && result.alert) {
      setAlerts(prev => prev.map((alert) => (
        alert.id === id ? { ...alert, ...normalizeAlert(result.alert) } : alert
      )));
      return true;
    }

    return false;
  };

  const dispatchAlert = (id) => performAlertAction(id, 'dispatch');
  const ignoreAlert = (id) => performAlertAction(id, 'ignore');

  useEffect(() => {
    setHistory([]);
    setLiveData({
      camera_id: activeCameraId,
      camera_name: null,
      people_count: null,
      density: null,
      zones: [],
      alerts_count: null,
      average_latency_ms: null,
      inference_latency_ms: null,
      deployment_mode: deploymentInfo?.mode || null,
    });

    // Initialize Socket connection
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Connection Events
    newSocket.on('connect', () => {
      console.log('Connected to Crowd Surveillance Engine');
      setIsConnected(true);
      setConnectionError('');
      refreshAlerts();
      refreshZones();
      refreshCameras();
      refreshDeployment();
      refreshModelInfo();
      refreshTraining();
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error', error);
      setConnectionError(error?.message || 'Unable to connect to surveillance backend.');
      setIsConnected(false);
    });

    // Main Data Event
    newSocket.on('crowd_update', (data) => {
      // data expected: { people_count: number, density: string }
      if (!data) return;
      if (activeCameraId && data.camera_id !== activeCameraId) return;

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setLiveData({
      setLiveData({
        camera_id: data.camera_id || null,
        camera_name: data.camera_name || null,
        people_count: data.people_count ?? null,
        density: data.density || null,
        zones: data.zones || [],
        alerts_count: data.high_density_events ?? data.alerts_count ?? null,
        average_latency_ms: data.average_latency_ms ?? null,
        inference_latency_ms: data.inference_latency_ms ?? null,
        deployment_mode: data.deployment_mode || null,
      });
      });
      setLastUpdated(now);
      setAlertSummary(prev => ({
        ...prev,
        active_alerts_count: data.alerts_count ?? 0,
        total_events: data.high_density_events ?? prev.total_events,
      }));

      // Update history for charts (keep last 20 data points, throttle to 1 per second)
      setHistory(prev => {
        if (typeof data.people_count !== 'number') {
          return prev;
        }
        const newData = [...prev, { time: timestamp, count: data.people_count }];
        return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
      });

    });

    // Alerts Event
    newSocket.on('new_alert', (alert) => {
      // alert expected: { message: string, severity: 'high' | 'medium' | 'low', type: string }
      if (!alert) return;
      
      const newAlert = {
        id: alert.id || Date.now().toString(),
        time: alert.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...normalizeAlert(alert),
      };

      setAlerts(prev => {
        const alreadyPresent = prev.some((existing) => existing.id === newAlert.id);
        if (alreadyPresent) return prev;
        const next = [newAlert, ...prev].slice(0, 100);
        return next;
      });
    });

    newSocket.on('alert_updated', (updatedAlert) => {
      if (!updatedAlert?.id) return;

      setAlerts(prev => prev.map((alert) => (
        alert.id === updatedAlert.id ? { ...alert, ...normalizeAlert(updatedAlert) } : alert
      )));
    });

    newSocket.on('alerts_snapshot', (snapshot) => {
      if (!snapshot) return;
      setAlerts((snapshot.alerts || []).map(normalizeAlert).filter(Boolean));
      setAlertSummary({
        active_alerts_count: snapshot.active_alerts_count || 0,
        total_events: snapshot.total_events || 0,
      });
    });

    // Training updates from backend
    newSocket.on('training_update', (status) => {
      if (!status) return;
      setAiTraining(status);
      setTrainingLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${status.message}`].slice(0, 100));
    });

    // pre-populate from backend API
    refreshZones();
    refreshAlerts();
    refreshCameras();
    refreshDeployment();
    refreshModelInfo();
    refreshTraining();

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('crowd_update');
      newSocket.off('new_alert');
      newSocket.off('alert_updated');
      newSocket.off('alerts_snapshot');
      newSocket.off('training_update');
      newSocket.close();
    };
  }, [activeCameraId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeAlerts = alerts.filter((alert) => alert.status === 'active');
  const recentAlerts = alerts.filter((alert) => alert.status !== 'ignored');
  const activeCamera = cameras.find((camera) => camera.camera_id === activeCameraId) || null;
  const activeVideoUrl = activeCameraId ? `${SOCKET_URL}/video/${encodeURIComponent(activeCameraId)}` : null;

  return {
    isConnected,
    liveData,
    history,
    alerts,
    activeAlerts,
    recentAlerts,
    alertActionState,
    alertSummary,
    lastUpdated,
    connectionError,
    aiTraining,
    trainingLog,
    uploadState,
    cameraUpdateState,
    deploymentInfo,
    modelInfo,
    socketUrl: SOCKET_URL,
    videoUrl: activeVideoUrl,
    cameras,
    defaultCameraId,
    activeCameraId,
    activeCamera,
    setActiveCameraId,
    refreshAlerts,
    refreshZones,
    refreshCameras,
    refreshDeployment,
    refreshModelInfo,
    refreshTraining,
    startTraining,
    stopTraining,
    uploadRecordedVideo,
    renameCamera,
    removeCamera,
    acknowledgeAlert,
    dispatchAlert,
    ignoreAlert,
  };
}
