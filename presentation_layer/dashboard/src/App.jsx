// src/App.jsx
import React, { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { C } from "./theme";
import DailyLogs from "./components/DailyLogs";

export default function App() {
  const [active, setActive] = useState("live");
  const [liveAlerts, setLiveAlerts] = useState([]);

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
      } catch (error) {
        console.error("Message WebSocket invalide :", error);
      }
    };

    socket.onerror = (error) => {
      console.error("Erreur WebSocket :", error);
    };

    return () => socket.close();
  }, []);

  const renderPage = () => {
    switch (active) {
      case "daily":
        return <DailyLogs onBack={() => setActive("live")} />;
      case "live":
        return <Dashboard alerts={liveAlerts} />;
      default:
        return <Dashboard alerts={liveAlerts} />;
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", background: C.bg, minHeight: "100vh" }}>
      <Sidebar active={active} onNavigate={setActive} />
      <main style={{ flex: 1, minWidth: 0 }}>{renderPage()}</main>
    </div>
  );
}
