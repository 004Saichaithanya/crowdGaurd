import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://127.0.0.1:5000';

export function useCrowdData() {
  const [isConnected, setIsConnected] = useState(false);
  
  // Current Live Data
  const [liveData, setLiveData] = useState({
    people_count: 0,
    density: 'Low', // 'Low', 'Medium', 'High'
  });

  // Historical Data (for charts)
  const [history, setHistory] = useState([]);
  
  // Alerts
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Initialize Socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });

    // Connection Events
    newSocket.on('connect', () => {
      console.log('Connected to Crowd Surveillance Engine');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    // Main Data Event
    newSocket.on('crowd_update', (data) => {
      // data expected: { people_count: number, density: string }
      if (!data) return;

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      setLiveData({
        people_count: data.people_count || 0,
        density: data.density || 'Low',
      });

      // Update history for charts (keep last 20 data points)
      setHistory(prev => {
        const newData = [...prev, { time: timestamp, count: data.people_count || 0 }];
        return newData.length > 20 ? newData.slice(newData.length - 20) : newData;
      });
    });

    // Alerts Event
    newSocket.on('new_alert', (alert) => {
      // alert expected: { message: string, severity: 'high' | 'medium' | 'low', type: string }
      if (!alert) return;
      
      const newAlert = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...alert,
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 50)); // Keep last 50 alerts
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('crowd_update');
      newSocket.off('new_alert');
      newSocket.close();
    };
  }, []);

  return { isConnected, liveData, history, alerts };
}
