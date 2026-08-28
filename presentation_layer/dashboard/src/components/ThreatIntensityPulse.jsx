// src/components/ThreatIntensityPulse.jsx
import React from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Activity } from "lucide-react";
import { Panel } from "./Panel";
import { C } from "../theme";

// data prop: [{ t, v }] — swap for live websocket data from services/socket.js
export function ThreatIntensityPulse({ data }) {
  return (
    <Panel icon={Activity} title="THREAT INTENSITY PULSE" live style={{ height: 210 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.blue} stopOpacity={0.35} />
              <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide dataKey="t" />
          <YAxis tick={{ fill: C.textDim, fontSize: 11, fontFamily: C.mono }} axisLine={false} tickLine={false} width={30} />
          <Tooltip contentStyle={{ background: C.panelHeader, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: C.mono, fontSize: 12 }} />
          <Area type="monotone" dataKey="v" stroke={C.blue} strokeWidth={2} fill="url(#pulseFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </Panel>
  );
}
