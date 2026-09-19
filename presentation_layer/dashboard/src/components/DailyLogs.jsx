// src/components/DailyLogs.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ChevronRight, ChevronDown, Search, Clock,
  AlertTriangle, Download, MoreVertical, Copy,
} from "lucide-react";
import { C } from "../theme";

// --- Couleurs de sévérité (locales à cette page, thème non modifié) ---
const SEV = {
  CRITICAL: "#f43f5e",
  HIGH: "#f59e0b",
  MEDIUM: "#eab308",
};

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname || "localhost"}:8000`;
const PAGE_SIZE = 5;

function formatTimestamp(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("fr-FR", { hour12: false });
}

function SeverityBadge({ severity, score }) {
  const col = SEV[severity] || C.textMute;
  return (
    <span style={{
      display: "inline-block", fontFamily: C.mono, fontSize: 11.5, fontWeight: 700,
      color: severity === "MEDIUM" ? "#1a1406" : "#fff",
      background: col, borderRadius: 4, padding: "3px 8px", lineHeight: 1.4,
    }}>
      {severity} {score}
    </span>
  );
}

function BarChart({ data, selectedDate, onSelect }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const yTicks = [max, max * 0.75, max * 0.5, max * 0.25, 0];

  return (
    <div style={{ display: "flex", padding: "24px 24px 8px" }}>
      {/* Axe Y */}
      <div style={{
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        height: 320, paddingRight: 12, fontFamily: C.mono, fontSize: 11, color: C.textMute,
      }}>
        {yTicks.map((t, index) => <div key={index}>{Math.round(t).toLocaleString("fr-FR")}</div>)}
      </div>

      {/* Barres */}
      <div style={{
        flex: 1, display: "flex", alignItems: "flex-end", gap: 18,
        height: 320, borderLeft: `1px solid ${C.borderSoft}`,
        borderBottom: `1px solid ${C.borderSoft}`, padding: "0 8px",
      }}>
        {data.map((d) => {
          const h = Math.max((d.value / max) * 300, 4);
          const isSelected = selectedDate === d.date;
          return (
            <div key={d.date} onClick={() => onSelect(d.date)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-end", height: "100%", cursor: "pointer",
            }}>
              {(d.today || isSelected) && (
                <div style={{ fontFamily: C.mono, fontSize: 12, color: "#cbd5e1", marginBottom: 6, fontWeight: 700 }}>
                  {d.value.toLocaleString("fr-FR")}
                </div>
              )}
              <div style={{
                width: "100%", maxWidth: 72, height: h, borderRadius: "3px 3px 0 0",
                background: isSelected ? "#4d8dfa" : C.blue,
                boxShadow: isSelected ? "0 0 14px rgba(77,141,250,0.45)" : "none",
              }} />
              {isSelected && (
                <div style={{
                  width: 8, height: 8, transform: "rotate(45deg)", background: C.blue,
                  marginTop: -4, border: `2px solid ${C.panel}`,
                }} />
              )}
              <div style={{
                fontFamily: C.mono, fontSize: 11.5, marginTop: 10,
                color: isSelected ? C.blue : C.textMute, fontWeight: isSelected ? 700 : 400,
              }}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JsonViewer({ data }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(data, null, 2);

  const renderValue = (v) => {
    if (typeof v === "string") return <span style={{ color: "#e2e8f0" }}>"{v}"</span>;
    if (typeof v === "number") return <span style={{ color: "#facc15" }}>{v}</span>;
    return <span style={{ color: "#e2e8f0" }}>{String(v)}</span>;
  };

  const renderObj = (obj, indent) =>
    Object.entries(obj).map(([k, v], i, arr) => {
      const isObj = v && typeof v === "object" && !Array.isArray(v);
      return (
        <div key={k} style={{ paddingLeft: indent * 16 }}>
          <span style={{ color: "#7dd3fc" }}>"{k}"</span>
          <span style={{ color: C.textDim }}>: </span>
          {isObj ? (
            <>
              <span style={{ color: C.textDim }}>{"{"}</span>
              {renderObj(v, indent + 1)}
              <div style={{ paddingLeft: indent * 16, color: C.textDim }}>{"}"}{i < arr.length - 1 ? "," : ""}</div>
            </>
          ) : (
            <>{renderValue(v)}<span style={{ color: C.textDim }}>{i < arr.length - 1 ? "," : ""}</span></>
          )}
        </div>
      );
    });

  return (
    <div style={{
      background: "rgba(0,0,0,0.25)", border: `1px solid ${C.borderSoft}`,
      borderRadius: 8, margin: "0 16px 16px", padding: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: C.mono, fontSize: 12.5, color: "#cbd5e1", fontWeight: 600 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: C.red, boxShadow: `0 0 6px ${C.red}` }} />
          Structured Document JSON View (Elasticsearch _source: security-alerts)
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "transparent",
            border: "none", color: copied ? C.green : C.blue, fontFamily: C.mono,
            fontSize: 12, cursor: "pointer",
          }}
        >
          <Copy size={12} /> {copied ? "Copied" : "Copy JSON"}
        </button>
      </div>
      <div style={{ fontFamily: C.mono, fontSize: 12.5, lineHeight: 1.9 }}>
        <span style={{ color: C.textDim }}>{"{"}</span>
        {renderObj(data, 1)}
        <div style={{ color: C.textDim }}>{"}"}</div>
      </div>
    </div>
  );
}

export default function DailyLogs({ onBack }) {
  const [chartData, setChartData] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (date = selectedDate, signal) => {
    setLoading(true);
    setError("");
    try {
      const alertsUrl = new URL(`${API_BASE}/alerts`);
      if (date) alertsUrl.searchParams.set("date", date);
      const [statsResponse, alertsResponse] = await Promise.all([
        fetch(`${API_BASE}/alerts/stats`, { signal }),
        fetch(alertsUrl, { signal }),
      ]);
      if (!statsResponse.ok || !alertsResponse.ok) throw new Error("Réponse API invalide");
      const [stats, alerts] = await Promise.all([statsResponse.json(), alertsResponse.json()]);
      const today = new Date().toISOString().slice(0, 10);
      setChartData(stats.map((item) => ({
        ...item,
        date: item.label,
        label: `${item.label.slice(5)}${item.label === today ? " (Today)" : ""}`,
        today: item.label === today,
      })));
      setRows(alerts.map((alert) => ({
        ...alert,
        time: formatTimestamp(alert.time),
        severity: String(alert.severity || "MEDIUM").toUpperCase(),
        score: Number(alert.score || 0).toFixed(1),
      })));
      setExpandedId(null);
      setPage(1);
    } catch (err) {
      if (err.name !== "AbortError") setError("Impossible de charger les alertes Elasticsearch.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(null, controller.signal);
    return () => controller.abort();
  }, []);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );
  const firstRow = rows.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastRow = Math.min(page * PAGE_SIZE, rows.length);

  const selectDate = (date) => {
    const nextDate = selectedDate === date ? null : date;
    setSelectedDate(nextDate);
    loadData(nextDate);
  };

  const exportAlerts = () => {
    const blob = new Blob([JSON.stringify(rows.map((row) => row.json), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `security-alerts-${selectedDate || "all"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", width: "100%", color: C.text,
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", padding: 16,
    }}>
      {/* --- Barre de navigation / breadcrumb --- */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 10, marginBottom: 16, fontFamily: C.mono, fontSize: 13,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent",
              border: "none", color: C.textDim, fontFamily: C.mono, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Retour au Dashboard
          </button>
          <span style={{ color: C.borderSoft }}>/</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMute }}>
            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>SentinelAI</span>
            <ChevronRight size={12} />
            <span>elasticsearch</span>
            <ChevronRight size={12} />
            <span style={{ color: C.blue }}>security-alerts Index Explorer</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: 6, background: `${C.green}14`,
            border: `1px solid ${C.green}55`, borderRadius: 7, padding: "6px 12px", color: C.green,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: C.green }} />
            Ingestion: OK (12.4k EPS)
          </span>
          <span style={{
            background: `${C.blue}14`, border: `1px solid ${C.blue}55`,
            borderRadius: 7, padding: "6px 12px", color: "#93c5fd",
          }}>
            Cluster: soc-elastic-eu01
          </span>
        </div>
      </div>

      {/* --- Barre de filtres --- */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px", background: C.panel, border: `1px solid ${C.border}`,
        borderRadius: 10, marginBottom: 16,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px",
          fontFamily: C.mono, fontSize: 12.5, color: C.textDim, whiteSpace: "nowrap",
        }}>
          Filter: _index: "security-alerts" <ChevronDown size={13} />
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px",
        }}>
          <Search size={14} color={C.textDim} />
          <span style={{ fontFamily: C.mono, fontSize: 12.5, color: "#cbd5e1" }}>
            _index: security-alerts AND (severity: (CRITICAL OR HIGH OR MEDIUM) OR honeypot: *)
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, background: C.bg,
          border: `1px solid ${C.border}`, borderRadius: 7, padding: "9px 12px",
          fontFamily: C.mono, fontSize: 12.5, color: "#cbd5e1", whiteSpace: "nowrap",
        }}>
          <Clock size={13} color={C.textDim} /> Last 7 Days <ChevronDown size={13} />
        </div>
        <button onClick={() => loadData()} style={{
          display: "flex", alignItems: "center", gap: 8, background: C.blue,
          border: `1px solid ${C.blue}`, borderRadius: 7, padding: "9px 16px",
          fontFamily: C.mono, fontSize: 12.5, color: "#fff", fontWeight: 600, cursor: "pointer",
        }}>
          <Search size={13} /> Search
        </button>
      </div>

      {/* --- Résumé résultats + graphique --- */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
        marginBottom: 16, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: `1px solid ${C.borderSoft}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: C.mono, fontSize: 13 }}>
            <span><strong>{rows.length.toLocaleString("fr-FR")}</strong> Documents</span>
            <span style={{ color: C.borderSoft }}>|</span>
            <span style={{ color: C.textMute }}>
              Filtre actif : <span style={{ color: C.blue, fontWeight: 700 }}>{selectedDate || "Toutes les dates"}</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontStyle: "italic", fontSize: 12.5, color: C.textMute }}>
              Cliquez sur une colonne pour inspecter les alertes et logs bruts de cette journée
            </span>
            <MoreVertical size={16} color={C.textMute} />
          </div>
        </div>
        {error ? (
          <div style={{ padding: 32, textAlign: "center", color: C.red, fontFamily: C.mono }}>{error}</div>
        ) : chartData.length ? (
          <BarChart data={chartData} selectedDate={selectedDate} onSelect={selectDate} />
        ) : (
          <div style={{ padding: 32, textAlign: "center", color: C.textMute, fontFamily: C.mono }}>
            {loading ? "Chargement des statistiques..." : "Aucune statistique disponible"}
          </div>
        )}
      </div>

      {/* --- Table des alertes --- */}
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: `1px solid ${C.borderSoft}`, background: C.panelHeader,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={15} color={C.orange} />
            <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: "#cbd5e1" }}>
              Security Alerts &amp; Intrusion Stream
            </span>
            <span style={{
              fontFamily: C.mono, fontSize: 11, color: "#93c5fd", background: `${C.blue}14`,
              border: `1px solid ${C.blue}55`, borderRadius: 5, padding: "3px 8px",
            }}>
              Index: security-alerts
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: C.mono, fontSize: 12, color: C.textMute }}>
              Showing <span style={{ color: C.text }}>{firstRow}-{lastRow}</span> of <span style={{ color: C.text }}>{rows.length}</span> records
            </span>
            <button onClick={exportAlerts} disabled={!rows.length} style={{
              display: "flex", alignItems: "center", gap: 6, background: "transparent",
              border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px",
              fontFamily: C.mono, fontSize: 12, color: C.textDim, cursor: "pointer",
            }}>
              <Download size={12} /> Export
            </button>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: C.mono, fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: C.textDim, textAlign: "left" }}>
              <th style={{ width: 30, padding: "12px 10px" }} />
              {["TIME", "SOURCE IP", "HONEYPOT", "SEVERITY", "MITRE ATT&CK / MESSAGE"].map((h) => (
                <th key={h} style={{ fontWeight: 500, padding: "12px 10px", borderBottom: `2px solid ${C.border}` }}>{h}</th>
              ))}
              <th style={{ width: 40, borderBottom: `2px solid ${C.border}` }} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const isOpen = expandedId === r.id;
              return (
                <React.Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                    style={{
                      borderBottom: isOpen ? "none" : `1px solid ${C.borderSoft}`,
                      cursor: "pointer",
                      background: isOpen ? C.panelHeader : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 10px", color: C.textMute }}>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td style={{ padding: "12px 10px", color: isOpen ? "#fbbf24" : C.text }}>{r.time}</td>
                    <td style={{ padding: "12px 10px", color: isOpen ? "#fbbf24" : "#93c5fd", fontWeight: 700 }}>{r.ip}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{
                        border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 8px",
                        color: C.textDim, fontSize: 12,
                      }}>{r.pot}</span>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <SeverityBadge severity={r.severity} score={r.score} />
                    </td>
                    <td style={{ padding: "12px 10px", color: C.text }}>
                      <span style={{ color: "#93c5fd" }}>[{r.mitre}]</span> {r.message}
                    </td>
                    <td style={{ padding: "12px 10px", color: C.textMute }}>
                      <Download size={13} />
                    </td>
                  </tr>
                  {isOpen && r.json && (
                    <tr>
                      <td colSpan={7} style={{ padding: 0, borderBottom: `1px solid ${C.borderSoft}` }}>
                        <JsonViewer data={r.json} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!loading && !visibleRows.length && (
              <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: C.textMute }}>Aucune alerte trouvée</td></tr>
            )}
          </tbody>
        </table>

        {/* --- Pagination --- */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderTop: `1px solid ${C.borderSoft}`,
          fontFamily: C.mono, fontSize: 12.5, color: C.textMute,
        }}>
          <span>Showing rows <span style={{ color: C.text }}>{firstRow}</span> to <span style={{ color: C.text }}>{lastRow}</span> of <span style={{ color: C.text }}>{rows.length}</span> items</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={pageBtn}>« Prev</button>
            <button style={{ ...pageBtn, background: C.blue, color: "#fff", borderColor: C.blue }}>{page}</button>
            <span style={{ padding: "0 4px" }}>/ {pageCount}</span>
            <button disabled={page === pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} style={pageBtn}>Next »</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageBtn = {
  background: "transparent",
  border: `1px solid #1f2937`,
  borderRadius: 6,
  padding: "6px 12px",
  fontFamily: "inherit",
  fontSize: "inherit",
  color: "inherit",
  cursor: "pointer",
};
