// src/services/mockData.js
// Placeholder data shaped exactly like what the websocket_server should push.
// Replace with real calls once hooks/useAlertSocket.js is wired to the backend.
export const pulseData = [
  { t: 0, v: 25 }, { t: 1, v: 45 }, { t: 2, v: 20 }, { t: 3, v: 55 },
  { t: 4, v: 40 }, { t: 5, v: 95 }, { t: 6, v: 65 }, { t: 7, v: 70 },
  { t: 8, v: 50 }, { t: 9, v: 75 }, { t: 10, v: 30 }, { t: 11, v: 60 },
];

export const distribution = [
  { name: "Cowrie", value: 50, color: "#22c55e" },
  { name: "Dionaea", value: 30, color: "#f59e0b" },
  { name: "Honeytrap", value: 20, color: "#f4415f" },
];

export const alerts = [
  { id: "#9042", time: "10:24:15.023", ip: "192.168.1.105", pot: "Cowrie", event: "SSH Login Attempt (Failed)", score: 0.92, tactic: "Initial Access" },
  { id: "#9041", time: "10:24:12.110", ip: "45.33.22.19", pot: "Dionaea", event: "SMB Connection Request", score: 0.65, tactic: "Lateral Movement" },
  { id: "#9040", time: "10:23:59.882", ip: "114.114.114.114", pot: "Honeytrap", event: "Port Scan (SYN)", score: 0.12, tactic: "Discovery" },
  { id: "#9039", time: "10:23:45.001", ip: "192.168.1.105", pot: "Cowrie", event: "SSH Login Attempt (Failed)", score: 0.88, tactic: "Initial Access" },
];

export const stability = Array.from({ length: 24 }).map((_, i) => ({
  t: i,
  uptime: 92 + Math.sin(i / 3) * 2 + 4,
  latency: 20 + i * 1.4 + Math.sin(i) * 4,
}));

export const reports = [
  { name: "Incident_Report_9042.pdf", meta: "2023-10-27 10:25 · 1.2MB" },
  { name: "Daily_Summary_20231027.pdf", meta: "2023-10-27 08:00 · 4.5MB" },
];
