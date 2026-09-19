// src/App.jsx
import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { C } from "./theme";
import DailyLogs from "./components/DailyLogs";

export default function App() {
  const [active, setActive] = useState("live");

  const renderPage = () => {
    switch (active) {
      case "daily":
        return <DailyLogs />;
      case "live":
        return <Dashboard/>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", background: C.bg, minHeight: "100vh" }}>
      <Sidebar active={active} onNavigate={setActive} />
      <main style={{ flex: 1, minWidth: 0 }}>{renderPage()}</main>
    </div>
  );
}