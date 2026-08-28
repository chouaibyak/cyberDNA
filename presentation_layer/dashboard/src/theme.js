// src/theme.js
// Design tokens shared by every component. Import { C } wherever colors are needed.
export const C = {
  bg: "#0a0e17",
  panel: "#0d1320",
  panelHeader: "#0f1523",
  border: "#1c2536",
  borderSoft: "#161e2e",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMute: "#8592a8",
  blue: "#5b8def",
  green: "#22c55e",
  orange: "#f59e0b",
  red: "#f4415f",
  mono: "'JetBrains Mono','Fira Code',ui-monospace,monospace",
};

export const btnStyle = {
  display: "flex", alignItems: "center", gap: 6,
  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7,
  padding: "7px 12px", color: C.textMute, fontSize: 12, fontFamily: C.mono,
  cursor: "pointer",
};

export const td = { padding: "10px 10px", color: "#cbd5e1" };
