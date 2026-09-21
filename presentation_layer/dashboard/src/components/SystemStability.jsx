import React from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { Panel } from "./Panel";
import { C } from "../theme";

export function SystemStability({ data }) {
  // Sécurité si pas de données
  if (!data || data.length === 0) {
    return (
      <Panel icon={TrendingUp} title="SYSTEM STABILITY" style={{ height: 230 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textDim, fontFamily: C.mono }}>
          Initializing stability monitors...
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      icon={TrendingUp}
      title="SYSTEM STABILITY"
      style={{ height: 230 }}
      right={
        <div style={{ display: "flex", gap: 12, fontFamily: C.mono, fontSize: 11, color: C.textMute }}>
          <span><span style={{ color: C.blue }}>●</span> Latency</span>
          <span><span style={{ color: C.green }}>●</span> Uptime</span>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis hide dataKey="t" />
          {/* MODIFICATION : On laisse le domaine en 'auto' pour que la latence soit visible */}
          <YAxis hide domain={[0, 'auto']} />
          <Line type="monotone" dataKey="uptime" stroke={C.green} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="latency" stroke={C.blue} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}