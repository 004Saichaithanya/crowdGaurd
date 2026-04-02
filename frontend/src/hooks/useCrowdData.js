import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://127.0.0.1:5000';
const VIDEO_URL = `${SOCKET_URL}/video`;

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
  
  // Current Live Data
  const [liveData, setLiveData] = useState({
    people_count: 0,
    density: 'Low', // 'Low', 'Medium', 'High'
    zones: [0, 0, 0, 0],
  });

  // Historical Data (for charts)
  const [history, setHistory] = useState([]);
  
  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertActionState, setAlertActionState] = useState({});
  const [alertSummary, setAlertSummary] = useState({ active_alerts_count: 0, total_events: 0 });
  const [aiTraining, setAiTraining] = useState({ status: 'idle', progress: 0, message: 'Idle' });
  const [trainingLog, setTrainingLog] = useState([]);

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
    const result = await apiFetch('/api/alerts');
    if (result?.alerts) {
      setAlerts(result.alerts.map(normalizeAlert).filter(Boolean));
      setAlertSummary({
        active_alerts_count: result.active_alerts_count || 0,
        total_events: result.total_events || 0,
      });
    }
  };

  const refreshZones = async () => {
    const result = await apiFetch('/api/zones');
    if (result?.zones) {
      setLiveData(prev => ({ ...prev, zones: result.zones, people_count: result.total_people || prev.people_count }));
    }
  };

  const refreshTraining = async () => {
    const result = await apiFetch('/api/training');
    if (result) {
      setAiTraining(result);
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

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setLiveData({
        people_count: data.people_count || 0,
        density: data.density || 'Low',
        zones: data.zones || [0, 0, 0, 0],
      });
      setLastUpdated(now);
      setAlertSummary(prev => ({
        ...prev,
        active_alerts_count: data.alerts_count || 0,
        total_events: data.high_density_events || prev.total_events,
      }));

      // Update history for charts (keep last 20 data points, throttle to 1 per second)
      setHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].time === timestamp) {
           // Don't add multiple points for the same second
           return prev;
        }
        const newData = [...prev, { time: timestamp, count: data.people_count || 0 }];
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeAlerts = alerts.filter((alert) => alert.status === 'active');
  const recentAlerts = alerts.filter((alert) => alert.status !== 'ignored');

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
    socketUrl: SOCKET_URL,
    videoUrl: VIDEO_URL,
    refreshAlerts,
    refreshZones,
    refreshTraining,
    startTraining,
    stopTraining,
    acknowledgeAlert,
    dispatchAlert,
    ignoreAlert,
  };
}
