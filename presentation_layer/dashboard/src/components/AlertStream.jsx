// src/components/AlertStream.jsx
import React, { useState } from "react";
import { ScrollText, Pause, Download } from "lucide-react";
import { Panel, ScoreBadge } from "./Panel";
import { C, btnStyle, td } from "../theme";

export function AlertStream({ alerts, onExport, selectedAlertId, onSelectAlert }) {
  const [paused, setPaused] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <Panel
      icon={ScrollText}
      title="REAL-TIME ALERT STREAM"
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnStyle} onClick={() => setPaused((p) => !p)}>
            <Pause size={12} /> {paused ? "Resume" : "Pause"}
          </button>
          <button style={btnStyle} onClick={onExport}><Download size={12} /> Export</button>
        </div>
      }
    >
      {/* CONTENEUR DE SCROLL : On ajoute une bordure de test pour voir si le bloc existe */}
      <div style={{ 
        height: "400px",          // On force une hauteur fixe
        overflowY: "auto",        // Active le scroll vertical
        border: `1px solid ${C.borderSoft}`, 
        borderRadius: "4px",
        backgroundColor: "rgba(0,0,0,0.1)"
      }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: C.mono, fontSize: 12.5 }}>
          <thead style={{ 
            position: "sticky", 
            top: 0, 
            zIndex: 10, 
            backgroundColor: C.panelHeader 
          }}>
            <tr style={{ color: C.textDim, textAlign: "left" }}>
              {["ID", "Time", "Source IP", "Honeypot", "Status", "Event Type", "ML Score", "MITRE Tactic"].map((h) => (
                <th key={h} style={{ fontWeight: 500, padding: "12px 10px", borderBottom: `2px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* --- TEST : SI VIDE ON AFFICHE UN MESSAGE --- */}
            {alerts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "50px", color: C.textMute }}>
                  Aucun événement reçu...
                </td>
              </tr>
            ) : (
              alerts.map((a) => {
                const isSelected = a.id === selectedAlertId;
                const isHovered = a.id === hoveredRow;
                return (
                  <tr
                    key={a.id}
                    style={{
                      borderBottom: `1px solid ${C.borderSoft}`,
                      cursor: "pointer",
                      backgroundColor: isSelected ? C.border : (isHovered ? C.panelHeader : "transparent"),
                    }}
                    onClick={() => onSelectAlert && onSelectAlert(a)}
                    onMouseEnter={() => setHoveredRow(a.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={td}>{a.id}</td>
                    <td style={{ ...td, color: C.textMute }}>{a.time}</td>
                    <td style={{ ...td, color: "#93c5fd" }}>{a.ip}</td>
                    <td style={{ ...td, color: "#93c5fd" }}>{a.pot}</td>
                    <td style={{ ...td, color: a.status === "ATTACK" ? C.red : C.green, fontWeight: 700 }}>
                      {a.status || "ATTACK"}
                    </td>
                    <td style={td}>{a.event}</td>
                    <td style={td}><ScoreBadge score={a.score} /></td>
                    <td style={{ ...td, color: C.textMute }}>{a.tactic}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
