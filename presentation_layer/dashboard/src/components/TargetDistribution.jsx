// src/components/TargetDistribution.jsx
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { Panel } from "./Panel";
import { C } from "../theme";

// data prop: [{ name, value, color }], total prop: number shown in the donut center
export function TargetDistribution({ data, total }) {
  return (
    <Panel icon={PieIcon} title="TARGET DISTRIBUTION" live style={{ height: 210 }}>
      <div style={{ display: "flex", alignItems: "center", height: "100%", gap: 20 }}>
        <div style={{ width: 140, height: 140, position: "relative", flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={2} stroke="none">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{total}</div>
            <div style={{ fontSize: 10, color: C.textDim, fontFamily: C.mono }}>Total</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((d) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: 12.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: d.color }} />
              <span style={{ width: 78 }}>{d.name}</span>
              <span style={{ color: C.textDim }}>{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
