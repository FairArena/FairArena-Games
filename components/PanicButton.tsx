"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const FAKE_PROJECTS = [
  { name: "AI Health Tracker", team: "Team Vertex", status: "Shortlisted", score: 94, time: "2h ago" },
  { name: "Web3 Supply Chain", team: "BlockBuilders", status: "Under Review", score: 88, time: "3h ago" },
  { name: "EdTech for Rural India", team: "Impact Labs", status: "Submitted", score: 91, time: "45m ago" },
  { name: "Drone Delivery OS", team: "AeroCraft", status: "Shortlisted", score: 96, time: "1h ago" },
  { name: "LegalAI Assistant", team: "Lexica.dev", status: "Under Review", score: 82, time: "5h ago" },
];

const STATUS_COLOR: Record<string, string> = {
  "Shortlisted": "#3ecf8e",
  "Under Review": "#ecc94b",
  "Submitted": "#7c6af7",
};

export function PanicButton() {
  const [panicMode, setPanicMode] = useState(false);

  const [mounted, setMounted] = useState(false);
  // Keyboard shortcut: Escape or Ctrl+Shift+B
  useEffect(() => {
    setMounted(true);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panicMode) setPanicMode(false);
      if (e.key === "b" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        setPanicMode(prev => !prev);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [panicMode]);

  if (panicMode && mounted) {
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#0a0a10",
          fontFamily: "var(--font-inter), 'Inter', sans-serif",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setPanicMode(false); }}
      >
        {/* FairArena-style header */}
        <div style={{
          height: "56px",
          background: "rgba(20,20,23,0.98)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: "16px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "6px",
              background: "linear-gradient(135deg, #7c6af7, #3ecf8e)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 700, color: "#fff",
            }}>F</div>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#e8e8ec", letterSpacing: "-0.02em" }}>
              FairArena <span style={{ color: "#ecc94b", fontWeight: 400 }}>Admin</span>
            </span>
          </div>

          <nav style={{ display: "flex", gap: "6px", marginLeft: "24px", overflowX: "auto" }}>
            {["Dashboard", "Submissions", "Judges", "Analytics", "Settings"].map((item, i) => (
              <div key={item} style={{
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: i === 0 ? 600 : 400,
                color: i === 0 ? "#e8e8ec" : "#6b6b78",
                background: i === 0 ? "rgba(255,255,255,0.06)" : "transparent",
                cursor: "default",
              }}>{item}</div>
            ))}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              padding: "5px 12px",
              background: "rgba(62,207,142,0.1)",
              border: "1px solid rgba(62,207,142,0.2)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#3ecf8e",
              fontWeight: 600,
            }}>● LIVE</div>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#7c6af7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: 700 }}>A</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "row" }}>
          {/* Sidebar */}
          <div style={{
            width: "200px",
            background: "#0f0f14",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "16px 12px",
            flexShrink: 0,
            overflowY: "auto",
            display: "block"
          }}
          className="boss-sidebar-hidden-mobile"
          >
            {[
              { icon: "⚡", label: "Overview" },
              { icon: "📋", label: "Submissions", badge: "142" },
              { icon: "⭐", label: "Shortlisted", badge: "24" },
              { icon: "👥", label: "Teams" },
              { icon: "🏆", label: "Leaderboard" },
              { icon: "📊", label: "Reports" },
              { icon: "🔔", label: "Alerts", badge: "3" },
            ].map(({ icon, label, badge }, i) => (
              <div key={label} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 10px",
                borderRadius: "8px",
                marginBottom: "2px",
                background: i === 0 ? "rgba(124,106,247,0.12)" : "transparent",
                cursor: "default",
              }}>
                <span style={{ fontSize: "14px" }}>{icon}</span>
                <span style={{ fontSize: "13px", color: i === 0 ? "#e8e8ec" : "#6b6b78", fontWeight: i === 0 ? 600 : 400 }}>{label}</span>
                {badge && (
                  <span style={{ marginLeft: "auto", background: "rgba(124,106,247,0.2)", color: "#7c6af7", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px" }}>{badge}</span>
                )}
              </div>
            ))}
          </div>

          {/* Dashboard */}
          <div style={{ flex: 1, overflow: "auto", padding: "24px" }}>
            {/* KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Total Submissions", val: "142", delta: "+12 today", color: "#7c6af7" },
                { label: "Shortlisted",       val: "24",  delta: "Top 17%",   color: "#3ecf8e" },
                { label: "Active Judges",     val: "8",   delta: "3 online",  color: "#ecc94b" },
                { label: "Avg Score",         val: "78.4",delta: "↑ 3.2",    color: "#4db6f4" },
              ].map(({ label, val, delta, color }) => (
                <div key={label} style={{
                  background: "#141417",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "12px",
                  padding: "16px",
                }}>
                  <div style={{ fontSize: "11px", color: "#6b6b78", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: "28px", fontWeight: 700, color, fontFamily: "var(--font-jetbrains-mono,monospace)", lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: "11px", color: "#3ecf8e", marginTop: "6px" }}>{delta}</div>
                </div>
              ))}
            </div>

            {/* Submissions table */}
            <div style={{ background: "#141417", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", overflowX: "auto" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-space-grotesk,sans-serif)", fontWeight: 600, fontSize: "14px", color: "#e8e8ec" }}>Recent Submissions</span>
                <span style={{ fontSize: "12px", color: "#7c6af7", cursor: "default" }}>View all →</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Project", "Team", "Status", "Score", "Submitted"].map(h => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "11px", color: "#6b6b78", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FAKE_PROJECTS.map((p, i) => (
                     <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#e8e8ec", fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: "12px 20px", fontSize: "13px", color: "#6b6b78" }}>{p.team}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{
                          padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600,
                          background: `${STATUS_COLOR[p.status]}18`,
                          color: STATUS_COLOR[p.status],
                          border: `1px solid ${STATUS_COLOR[p.status]}30`,
                        }}>{p.status}</span>
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: "13px", fontFamily: "var(--font-jetbrains-mono,monospace)", color: p.score >= 90 ? "#3ecf8e" : "#e8e8ec", fontWeight: 600 }}>{p.score}</td>
                      <td style={{ padding: "12px 20px", fontSize: "12px", color: "#6b6b78" }}>{p.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Exit hint */}
        <div style={{
          position: "fixed",
          bottom: "16px",
          right: "16px",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "6px 12px",
          fontSize: "11px",
          color: "#4a4a55",
          cursor: "pointer",
        }}
          onClick={() => setPanicMode(false)}
        >
          ESC — back to games
        </div>
      </div>,
      document.body
    );
  }

  return (
    <button
      onClick={() => setPanicMode(true)}
      className="no-select"
      title="Ctrl+Shift+B — Boss key"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        background: "#1c1c21",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "6px",
        color: "#6b6b78",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.04em",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
        flexShrink: 0,
        minHeight: "36px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#e8e8ec";
        (e.currentTarget as HTMLButtonElement).style.background = "#252530";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#6b6b78";
        (e.currentTarget as HTMLButtonElement).style.background = "#1c1c21";
      }}
    >
      <span>👔</span>
      <span>Boss Mode</span>
    </button>
  );
}
