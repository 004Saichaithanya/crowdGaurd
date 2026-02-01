import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://127.0.0.1:5000");

function App() {
  const [count, setCount] = useState(0);
  const [density, setDensity] = useState("LOW");
  const [alert, setAlert] = useState(null);
  const prevDensity = useRef("LOW");

  useEffect(() => {
    socket.on("crowd_update", (data) => {
      setCount(data.people_count);
      setDensity(data.density);

      if (data.density !== prevDensity.current) {
        if (data.density === "MEDIUM") {
          triggerAlert("⚠ Crowd density MEDIUM. Monitor closely.");
        }
        if (data.density === "HIGH") {
          triggerAlert("🚨 HIGH crowd density detected!");
        }
        prevDensity.current = data.density;
      }
    });

    return () => socket.off("crowd_update");
  }, []);

  const triggerAlert = (msg) => {
    setAlert(msg);
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>AI Crowd Monitoring Dashboard</h1>
        <span className="status-dot"></span>
      </header>

      {alert && <div className="alert">{alert}</div>}

      <main className="dashboard">
        <section className="video-card">
          <h2>Live Surveillance</h2>
          <img src="http://127.0.0.1:5000/video" alt="Live Feed" />
        </section>

        <section className="stats">
          <div className="card big">
            <h3>People Count</h3>
            <p className="count">{count}</p>
          </div>

          <div className={`card density ${density.toLowerCase()}`}>
            <h3>Density Level</h3>
            <p>{density}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
