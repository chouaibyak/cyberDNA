// src/components/LLMReport.jsx
import React from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { Panel } from "./Panel";
import { C, btnStyle } from "../theme";

// eventId prop: string, analysisText prop: string, onGenerate prop: () => void
export function LLMReport({ eventId, analysisText, onGenerate }) {
  return (
    <Panel
      icon={MessageSquare}
      title="LLM INVESTIGATION REPORT"
      right={
        <button style={{ ...btnStyle, background: C.blue, borderColor: C.blue, color: "#fff" }} onClick={onGenerate}>
          <Sparkles size={12} /> Generate
        </button>
      }
    >
      <div style={{ fontFamily: C.mono, fontSize: 12.5, lineHeight: 1.8 }}>
        <div style={{ color: C.green }}>&gt; Analyzing Event {eventId}...</div>
        <div style={{ color: C.textMute, marginTop: 8 }}>{analysisText}</div>
        <div style={{ color: C.textDim, marginTop: 8 }}>_</div>
      </div>
    </Panel>
  );
}
