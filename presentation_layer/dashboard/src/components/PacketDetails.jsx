// src/components/PacketDetails.jsx
import React from "react";
import { Boxes } from "lucide-react";
import { Panel, JsonRow } from "./Panel";
import { C } from "../theme";

export function PacketDetails({ selectedAlertId, es, ml, rawEsData }) {
  return (
    <Panel icon={Boxes} title={`PACKET DETAILS (ID: ${selectedAlertId})`}>
      <div style={{ color: C.orange, fontFamily: C.mono, fontSize: 12.5, marginBottom: 4 }}>▾ [Elasticsearch Metadata]</div>
      <JsonRow k="_index" v={es.index} indent={1} />
      <JsonRow k="_id" v={es.id} indent={1} />
      
      {/* On affiche les vrais champs de ton document ES */}
      {rawEsData && (
        <>
          <div style={{ color: "#4ade80", fontFamily: C.mono, fontSize: 12.5, marginTop: 8, marginBottom: 4 }}>▾ [Real-Time Evidence]</div>
          <JsonRow k="severity" v={rawEsData.severity} indent={1} />
          <JsonRow k="mitre_tech" v={rawEsData.mitre_analysis?.technique_id} indent={1} />
          <JsonRow k="protocol" v={rawEsData.evidence?.protocol} indent={1} />
          <JsonRow k="dst_port" v={rawEsData.evidence?.port} indent={1} />
        </>
      )}

      <div style={{ color: C.red, fontFamily: C.mono, fontSize: 12.5, marginTop: 8, marginBottom: 4 }}>▾ [ML Metadata]</div>
      <JsonRow k="confidence" v={ml.confidence} indent={1} />
    </Panel>
  );
}
