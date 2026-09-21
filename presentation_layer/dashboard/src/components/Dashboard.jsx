import React, { useState, useEffect, useRef, useMemo } from "react";
import { Header } from "./Header";
import { ThreatIntensityPulse } from "./ThreatIntensityPulse";
import { TargetDistribution } from "./TargetDistribution";
import { AlertStream } from "./AlertStream";
import { PacketDetails } from "./PacketDetails";
import { ReportsManagement } from "./ReportsManagement";
import { SystemStability } from "./SystemStability";
import { LLMReport } from "./LLMReport";
import { C } from "../theme";
import { stability as mockStability, reports } from "../services/mockData"; // stability devient mockStability

export default function Dashboard({ alerts = [] }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [fullDetails, setFullDetails] = useState(null);

  // --- ÉTATS POUR LE FILTRAGE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [honeypotFilter, setHoneypotFilter] = useState("all");

  // --- LOGIQUE PULSE ---
  const [pulseData, setPulseData] = useState([]);
  const intensityRef = useRef(0);

  // --- LOGIQUE DISTRIBUTION ---
  const [counts, setCounts] = useState({ cowrie: 0, dionaea: 0, honeytrap: 0 });
  const COLOR_MAP = { cowrie: "#4d8dfa", dionaea: "#f43f5e", honeytrap: "#fbbf24" };

  // --- LOGIQUE STABILITY (Dynamique) ---
  const [stabilityData, setStabilityData] = useState([]);
  const latencyRef = useRef(20); // Latence de base : 20ms

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws/alerts");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // 1. Pulse Impact
      const impact = data.status === "ATTACK" ? (data.score * 100 || 50) : 5;
      intensityRef.current += impact;

      // 2. Distribution Impact
      const potName = (data.pot || data.honeypot || "").toLowerCase();
      if (potName in counts) {
        setCounts(prev => ({ ...prev, [potName]: prev[potName] + 1 }));
      }

      // 3. Stability Impact (La latence augmente avec chaque log)
      // Plus le score est élevé, plus la latence augmente (simulation de charge)
      const latencyIncrease = data.status === "ATTACK" ? 5 : 1;
      latencyRef.current += latencyIncrease;
    };

    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString([], { hour12: false });
      
      // Mise à jour Pulse
      setPulseData(prev => {
        const newData = [...prev, { t: now, v: intensityRef.current }];
        return newData.slice(-30);
      });
      intensityRef.current = Math.max(0, intensityRef.current - 20);

      // Mise à jour Stability
      setStabilityData(prev => {
        // Uptime : fluctue légèrement entre 99% et 100%
        const simulatedUptime = 99 + Math.random(); 
        
        const newData = [...prev, { 
          t: now, 
          uptime: simulatedUptime, 
          latency: latencyRef.current 
        }];
        return newData.slice(-30);
      });

      // La latence redescend lentement vers la base (20ms)
      latencyRef.current = Math.max(20, latencyRef.current - 2);
    }, 1000);

    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, []);

  // ... (useMemo pour dynamicDistribution et alertDetails reste identique)
  const dynamicDistribution = useMemo(() => {
    const total = counts.cowrie + counts.dionaea + counts.honeytrap;
    if (total === 0) return [];
    return Object.keys(counts).map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: Math.round((counts[key] / total) * 100),
      color: COLOR_MAP[key]
    }));
  }, [counts]);

  const totalHits = counts.cowrie + counts.dionaea + counts.honeytrap;

  // ... (handleSelectAlert et alertDetails restent inchangés)
  const handleSelectAlert = async (alert) => {
    setSelectedAlert(alert);
    setFullDetails(null);
    try {
      const vmIP = window.location.hostname || "192.168.189.138";
      const endpoint = alert.log_source ? `events/${alert.log_source}/${alert.es_id}` : `alerts/${alert.es_id}`;
      const response = await fetch(`http://${vmIP}:8000/${endpoint}`);
      const data = await response.json();
      setFullDetails(data);
    } catch (err) { console.error(err); }
  };

  const alertDetails = useMemo(() => {
    if (!selectedAlert) return { es: { index: "N/A" }, ml: { confidence: "0%" }, llmText: "Sélectionnez une alerte..." };
    return {
      es: { index: selectedAlert.full_details?.es_index || "security-alerts", type: "_doc", id: selectedAlert.es_id || "Loading..." },
      ml: { modelVersion: "v2.4.1-anom", confidence: selectedAlert.full_details?.ml_confidence || "N/A", featuresFlagged: [selectedAlert.tactic] },
      llmText: fullDetails ? `Analyse de l'IP ${selectedAlert.ip} : ${fullDetails.mitre_analysis?.description.substring(0, 150)}...` : `Chargement...`
    };
  }, [selectedAlert, fullDetails]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", color: C.text, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: 16 }}>
      <Header />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }}>
        <ThreatIntensityPulse data={pulseData} />
        <TargetDistribution data={dynamicDistribution} total={totalHits} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <AlertStream 
          alerts={alerts} 
          selectedAlertId={selectedAlert?.id}
          onSelectAlert={handleSelectAlert}
          onExport={() => console.log("export")} 
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <PacketDetails selectedAlertId={selectedAlert?.id || "N/A"} es={alertDetails.es} ml={alertDetails.ml} rawEsData={fullDetails} />
          <ReportsManagement reports={reports} onDownload={(r) => console.log("download", r.name)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* ON PASSE LES DONNÉES DYNAMIQUES ICI */}
          <SystemStability data={stabilityData} />
          <LLMReport eventId={selectedAlert?.id || "N/A"} analysisText={alertDetails.llmText} onGenerate={() => console.log("generate report")} />
        </div>
      </div>
    </div>
  );
}