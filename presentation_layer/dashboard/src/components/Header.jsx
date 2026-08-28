// src/components/Header.jsx
import React from "react";
import { Shield, Search, ChevronDown } from "lucide-react";
import { C, btnStyle } from "../theme";

export function Header() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 18px", background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 10, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Shield size={20} color={C.blue} />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: 0.3 }}>
          SentinelAI <span style={{ color: C.textDim, fontWeight: 500 }}>- Network Intrusion Monitoring</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px", width: 220,
        }}>
          <Search size={13} color={C.textDim} />
          <span style={{ fontFamily: C.mono, fontSize: 12.5, color: C.textDim }}>IP Source...</span>
        </div>
        <button style={btnStyle}>All Honeypots <ChevronDown size={13} /></button>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 7, padding: "7px 12px",
          fontFamily: C.mono, fontSize: 12, color: C.textMute,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          WebSocket: Connected
        </div>
      </div>
    </div>
  );
}
