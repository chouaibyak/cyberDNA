import React, { useState, useMemo } from "react";
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

export default function Dashboard({
  alerts = [],
  pulseData = [],
  counts = { cowrie: 0, dionaea: 0, honeytrap: 0 },
  stabilityData = [],
}) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [fullDetails, setFullDetails] = useState(null);

  // --- ÉTATS POUR LE FILTRAGE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [honeypotFilter, setHoneypotFilter] = useState("all");

  const COLOR_MAP = { cowrie: "#4d8dfa", dionaea: "#f43f5e", honeytrap: "#fbbf24" };

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
