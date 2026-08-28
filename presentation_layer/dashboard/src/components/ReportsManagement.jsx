// src/components/ReportsManagement.jsx
import React from "react";
import { FileText, Download } from "lucide-react";
import { Panel } from "./Panel";
import { C } from "../theme";

// reports prop: [{ name, meta }]
export function ReportsManagement({ reports, onDownload }) {
  return (
    <Panel icon={FileText} title="REPORTS MANAGEMENT">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reports.map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${C.borderSoft}`, borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.red}1f`, display: "flex", alignItems: "center", justifyContent: "center", color: C.red, fontSize: 9, fontFamily: C.mono, fontWeight: 700 }}>PDF</div>
              <div>
                <div style={{ fontSize: 13 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.textDim, fontFamily: C.mono }}>{r.meta}</div>
              </div>
            </div>
            <Download size={14} color={C.textDim} style={{ cursor: "pointer" }} onClick={() => onDownload?.(r)} />
          </div>
        ))}
      </div>
    </Panel>
  );
}
