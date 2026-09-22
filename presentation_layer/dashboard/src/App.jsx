// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { C } from "./theme";
import DailyLogs from "./components/DailyLogs";

export default function App() {
  const [active, setActive] = useState("live");
  const [liveAlerts, setLiveAlerts] = useState([]);
  // Ces données vivent au niveau de l'application afin de survivre au
  // démontage de Dashboard pendant la navigation vers Daily Logs.
  const [pulseData, setPulseData] = useState([]);
  const [counts, setCounts] = useState({ cowrie: 0, dionaea: 0, honeytrap: 0 });
  const [stabilityData, setStabilityData] = useState([]);
  const intensityRef = useRef(0);
  const latencyRef = useRef(20);

  useEffect(() => {
    const vmIP = window.location.hostname || "192.168.189.138";
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${vmIP}:8000/ws/alerts`);

    socket.onmessage = (event) => {
      try {
        const newAlert = JSON.parse(event.data);
        // App reste montée pendant la navigation : le flux est conservé et
        // continue à recevoir les événements même sur la page Daily Logs.
        setLiveAlerts((previous) => [newAlert, ...previous].slice(0, 50));

        const impact = newAlert.status === "ATTACK"
          ? (Number(newAlert.score) * 100 || 50)
          : 5;
        intensityRef.current += impact;

        const potName = (newAlert.pot || newAlert.honeypot || "").toLowerCase();
        if (["cowrie", "dionaea", "honeytrap"].includes(potName)) {
          setCounts((previous) => ({
            ...previous,
            [potName]: previous[potName] + 1,
          }));
        }

        latencyRef.current += newAlert.status === "ATTACK" ? 5 : 1;
      } catch (error) {
        console.error("Message WebSocket invalide :", error);
      }
    };

    socket.onerror = (error) => {
      console.error("Erreur WebSocket :", error);
    };

    const interval = window.setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour12: false });

      setPulseData((previous) => [
        ...previous,
        { t: now, v: intensityRef.current },
      ].slice(-30));
      intensityRef.current = Math.max(0, intensityRef.current - 20);

      setStabilityData((previous) => [
        ...previous,
        {
          t: now,
          uptime: 99 + Math.random(),
          latency: latencyRef.current,
        },
      ].slice(-30));
      latencyRef.current = Math.max(20, latencyRef.current - 2);
    }, 1000);

    return () => {
      socket.close();
      window.clearInterval(interval);
    };
  }, []);

  const renderPage = () => {
    switch (active) {
      case "daily":
        return <DailyLogs onBack={() => setActive("live")} />;
      case "live":
        return (
          <Dashboard
            alerts={liveAlerts}
            pulseData={pulseData}
            counts={counts}
            stabilityData={stabilityData}
          />
        );
      default:
        return (
          <Dashboard
            alerts={liveAlerts}
            pulseData={pulseData}
            counts={counts}
            stabilityData={stabilityData}
          />
        );
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", background: C.bg, minHeight: "100vh" }}>
      <Sidebar active={active} onNavigate={setActive} />
      <main style={{ flex: 1, minWidth: 0 }}>{renderPage()}</main>
    </div>
  );
}
