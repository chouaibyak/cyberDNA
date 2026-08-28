// src/components/Panel.jsx
// Shared card shell used by every panel on the dashboard (header row + body).
import React from "react";
import { C } from "../theme";

export function Panel({ icon: Icon, title, live, right, children, style }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
      display: "flex", flexDirection: "column", overflow: "hidden", ...style,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", borderBottom: `1px solid ${C.borderSoft}`,
        background: C.panelHeader,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", fontSize: 12.5, fontWeight: 600, letterSpacing: 0.5 }}>
          <Icon size={14} color={C.textMute} />
          <span style={{ fontFamily: C.mono }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {right}
          {live && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.red, fontSize: 11, fontFamily: C.mono, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: C.red, boxShadow: `0 0 8px ${C.red}` }} />
              LIVE
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: 16, flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

export const scoreColor = (s) => (s >= 0.8 ? C.red : s >= 0.4 ? C.orange : C.green);

export function ScoreBadge({ score }) {
  const col = scoreColor(score);
  return (
    <span style={{
      fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: col,
      background: `${col}1f`, border: `1px solid ${col}55`,
      borderRadius: 4, padding: "2px 8px",
    }}>{score.toFixed(2)}</span>
  );
}

export function JsonRow({ k, v, indent = 0 }) {
  return (
    <div style={{ paddingLeft: indent * 16, fontFamily: C.mono, fontSize: 12.5, lineHeight: 1.9 }}>
      <span style={{ color: "#7dd3fc" }}>{k}</span>
      <span style={{ color: C.textDim }}>: </span>
      <span style={{ color: "#e2e8f0" }}>{v}</span>
    </div>
  );
}
