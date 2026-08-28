// src/components/Dashboard.jsx
// Top-level layout — composes every panel into the 3-row grid from the design.
// This is what you render from App.jsx: <Dashboard />
import React, { useState, useMemo, useEffect } from "react";
import { Header } from "./Header";
import { ThreatIntensityPulse } from "./ThreatIntensityPulse";
import { TargetDistribution } from "./TargetDistribution";
import { AlertStream } from "./AlertStream";
import { PacketDetails } from "./PacketDetails";
import { ReportsManagement } from "./ReportsManagement";
import { SystemStability } from "./SystemStability";
import { LLMReport } from "./LLMReport";
import { C } from "../theme";
import { pulseData, distribution, alerts as mockAlerts, stability, reports } from "../services/mockData";

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]); 
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [fullDetails, setFullDetails] = useState(null);



  useEffect(() => {
    // Connexion au WebSocket de ton API FastAPI (on utilise window.location.hostname pour la portabilité)
    const vmIP = window.location.hostname || "192.168.189.138"; 
    const socket = new WebSocket(`ws://${vmIP}:8000/ws/alerts`);

    socket.onopen = () => {
      console.log("WebSocket Connecté au serveur !" + vmIP);
    };

    socket.onmessage = (event) => {
      console.log("Message WebSocket reçu !", event.data); 
      const newAlert = JSON.parse(event.data);
      // On ajoute la nouvelle alerte au début du tableau (slice pour garder les 20 dernières)
      setAlerts((prev) => [newAlert, ...prev].slice(0, 20));
    };

    socket.onerror = (error) => {
      console.error("Erreur WebSocket :", error);
    };

    return () => socket.close(); // Ferme proprement si on quitte la page
  }, []);

  const handleSelectAlert = async (alert) => {
    setSelectedAlert(alert);
    setFullDetails(null); // Reset l'affichage pendant le chargement

    try {
      const vmIP = window.location.hostname || "192.168.189.138";
      // On interroge l'API FastAPI qu'on vient de créer
      const response = await fetch(`http://${vmIP}:8000/alerts/${alert.es_id}`);
      const data = await response.json();
      setFullDetails(data); // On stocke les données brutes d'Elasticsearch
    } catch (err) {
      console.error("Erreur récupération ES:", err);
    }
  };

  const alertDetails = useMemo(() => {
    if (!selectedAlert) {
      return { es: { index: "N/A" }, ml: { confidence: "0%" }, llmText: "Sélectionnez une alerte..." };
    }
    return {
      // On utilise l'es_id réel provenant de la DB
      es: { 
        index: "security-alerts", 
        type: "_doc", 
        id: selectedAlert.es_id || "Loading..." 
      },
      ml: { 
        modelVersion: "v2.4.1-anom", 
        confidence: selectedAlert.full_details?.ml_confidence || "N/A", 
        featuresFlagged: [selectedAlert.tactic] 
      },
      llmText: fullDetails 
        ? `Analyse de l'IP ${selectedAlert.ip} : ${fullDetails.mitre_analysis?.description.substring(0, 150)}...`
        : `Chargement de l'analyse pour ${selectedAlert.ip}...`
    };
  }, [selectedAlert, fullDetails]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", width: "100%", color: C.text, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: 16 }}>
      <Header />

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 16 }}>
        <ThreatIntensityPulse data={pulseData} />
        <TargetDistribution data={distribution} total={842} />
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
          <PacketDetails
            selectedAlertId={selectedAlert?.id || "N/A"}
            es={alertDetails.es}
            ml={alertDetails.ml}
            rawEsData={fullDetails}
          />
          <ReportsManagement reports={reports} onDownload={(r) => console.log("download", r.name)} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SystemStability data={stability} />
          <LLMReport
            eventId={selectedAlert?.id || "N/A"}
            analysisText={alertDetails.llmText}
            onGenerate={() => console.log("generate report")}
          />
        </div>
      </div>
    </div>
  );
}

