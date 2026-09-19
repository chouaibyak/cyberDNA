// src/components/Sidebar.jsx
// Barre latérale fixe. Ne modifie aucun autre composant.
// Props : active (string), onNavigate (fn(id))
import React, { useState } from "react";
import { Shield, LayoutGrid, BarChart3, BookOpen, ArrowRight } from "lucide-react";
import { C } from "../theme";

export const NAV_SECTIONS = [
  {
    label: "SOC OPERATIONS",
    items: [
      { id: "live",  icon: LayoutGrid, label: "Live Stream",          dot: true },
      { id: "daily", icon: BarChart3,  label: "Daily Logs & Alertes", badge: "24H", badgeColor: C.green },
    ],
  },
];

function NavItem({ item, active, onNavigate }) {
  const [hover, setHover] = useState(false);
  const Icon = item.icon;
  const isActive = active === item.id;

  return (
    <button
      onClick={() => onNavigate(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%",
        padding: "10px 16px", border: "none", cursor: "pointer",
        textAlign: "left", fontFamily: C.mono, fontSize: 13.5,
        color: isActive ? "#fff" : C.textDim,
        background: isActive ? "rgba(59,130,246,0.12)" : hover ? C.panelHeader : "transparent",
        borderLeft: `2px solid ${isActive ? C.blue : "transparent"}`,
      }}
    >
      <Icon size={16} color={isActive ? C.blue : C.textMute} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.dot && (
        <span style={{ width: 7, height: 7, borderRadius: 99, background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
      )}
      {item.badge && (
        <span style={{
          fontSize: 10.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
          color: item.badgeColor || C.green,
          background: `${item.badgeColor || C.green}1f`,
          border: `1px solid ${item.badgeColor || C.green}55`,
        }}>{item.badge}</span>
      )}
    </button>
  );
}

export function Sidebar({ active, onNavigate }) {
  const [promoHover, setPromoHover] = useState(false);

  return (
    <aside style={{
      width: 260, flexShrink: 0, height: "100vh", position: "sticky", top: 0,
      display: "flex", flexDirection: "column",
      background: C.panel, borderRight: `1px solid ${C.border}`, color: C.text,
    }}>
      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 16px", borderBottom: `1px solid ${C.border}`,
      }}>
        <Shield size={22} color={C.blue} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.3 }}>SentinelAI</div>
          <div style={{ fontFamily: C.mono, fontSize: 10.5, color: C.textMute, letterSpacing: 0.6 }}>
            SOC ENGINE V4.2
          </div>
        </div>
        <span style={{
          fontFamily: C.mono, fontSize: 10, fontWeight: 700, padding: "3px 7px",
          borderRadius: 4, color: C.green, background: `${C.green}1f`, border: `1px solid ${C.green}55`,
        }}>PROD</span>
      </div>

      {/* Carte promo → renvoie vers la page Daily Logs */}
      <div style={{ padding: 12 }}>
        <div
          onClick={() => onNavigate("daily")}
          onMouseEnter={() => setPromoHover(true)}
          onMouseLeave={() => setPromoHover(false)}
          style={{
            cursor: "pointer", padding: 12, borderRadius: 8,
            background: promoHover ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.09)",
            border: `1px solid ${C.blue}55`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={14} color={C.blue} />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Daily Logs Explorer</span>
            <span style={{
              fontFamily: C.mono, fontSize: 9.5, fontWeight: 700, padding: "2px 6px",
              borderRadius: 4, color: "#fff", background: C.red,
            }}>NEW</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: 6,
            fontFamily: C.mono, fontSize: 11, color: C.textMute,
          }}>
            Analyse Journalière des Flux & Logs <ArrowRight size={11} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ paddingTop: 10 }}>
            <div style={{
              padding: "8px 16px", fontFamily: C.mono, fontSize: 10.5,
              letterSpacing: 1, color: C.textMute,
            }}>{section.label}</div>
            {section.items.map((item) => (
              <NavItem key={item.id} item={item} active={active} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer : état du cluster */}
      <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, fontFamily: C.mono, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: C.textMute }}>
          <span style={{ letterSpacing: 0.8 }}>INGESTION</span>
          <span style={{ color: C.text, fontWeight: 700 }}>1.4 GB/s</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: C.border, marginTop: 7, overflow: "hidden" }}>
          <div style={{ width: "72%", height: "100%", background: C.blue }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, color: C.textMute }}>
          <span>UPTIME: <span style={{ color: C.green }}>99.98%</span></span>
          <span>NODE: <span style={{ color: C.text }}>cluster-01</span></span>
        </div>
      </div>
    </aside>
  );
}