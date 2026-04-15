"use client";

import React, { useState, useEffect } from "react";
import { PanicButton } from "@/components/PanicButton";
import { GamesGrid } from "@/components/GamesGrid";

const FLOATING_SCORES = [
  { val: "42,180", delay: "0s",   size: "1.4rem" },
  { val: "18,930", delay: "0.8s", size: "1.6rem" },
  { val: "7,450",  delay: "1.6s", size: "1.2rem" },
  { val: "99,999", delay: "0.4s", size: "1.8rem" },
  { val: "3,210",  delay: "2.2s", size: "1rem" },
];

const STATS = [
  { n: "14", label: "Games" },
  { n: "∞", label: "Replays" },
  { n: "Free", label: "Forever" },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0c0c0e",
        color: "#e8e8ec",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* ── STICKY HEADER ── */}
      <header
        className="page-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(12,12,14,0.94)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "0 20px",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        {/* Logo */}
        <a href="https://fairarena.app" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://fra.cloud.appwrite.io/v1/storage/buckets/697b974d001a7a80496e/files/697b9764002453409e98/view?project=69735edc00127d2033d8&mode=admin"
            alt="FairArena"
            style={{
              height: "26px",
              width: "auto",
              filter: "brightness(0) saturate(100%) invert(82%) sepia(62%) saturate(500%) hue-rotate(2deg) brightness(103%) contrast(97%)",
            }}
          />
          <span style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 700,
            fontSize: "15px",
            color: "#e8e8ec",
            letterSpacing: "-0.02em",
          }}>
            FairArena <span style={{ color: "#ecc94b", fontWeight: 400 }}>Games</span>
          </span>
        </a>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <a
            href="https://fairarena.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "12px",
              color: "#6b6b78",
              textDecoration: "none",
              padding: "5px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "none",
            }}
            className="back-to-arena"
          >
            ← Back to FairArena
          </a>
          <PanicButton />
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="hero-section"
        style={{
          padding: "60px 20px 40px",
          maxWidth: "1200px",
          margin: "0 auto",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Floating score numbers (desktop decoration) */}
        {mounted && FLOATING_SCORES.map(({ val, delay, size }, i) => (
          <span
            key={i}
            className="score-bg-number"
            style={{
              right: `${4 + i * 8}%`,
              top: `${20 + i * 14}%`,
              animationDelay: delay,
              fontSize: size,
            }}
          >
            {val}
          </span>
        ))}

        {/* Headline */}
        <div style={{ maxWidth: "620px", position: "relative" }}>
          {/* Pill badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
            padding: "5px 14px",
            background: "rgba(124,106,247,0.08)",
            border: "1px solid rgba(124,106,247,0.2)",
            borderRadius: "20px",
          }}>
            <span style={{ fontSize: "12px" }}>🎮</span>
            <span style={{ color: "#7c6af7", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em" }}>
              14 FREE GAMES · MADE FOR HACKATHON PARTICIPANTS
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "clamp(36px, 7vw, 68px)",
            fontWeight: 700,
            color: "#e8e8ec",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
            marginBottom: "20px",
          }}>
            Waiting for<br />
            <span style={{ color: "#ecc94b" }}>submissions?</span>
          </h1>

          <p style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "clamp(15px, 2.5vw, 18px)",
            color: "#6b6b78",
            lineHeight: 1.6,
            maxWidth: "480px",
            marginBottom: "32px",
          }}>
            Play free arcade games between judging rounds. Each one is FairArena-themed and ridiculously addictive. Press <kbd style={{ background: "#1c1c21", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 5px", fontSize: "11px", color: "#aaa", fontFamily: "monospace" }}>Ctrl+Shift+B</kbd> if your organizer walks by.
          </p>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {STATS.map(({ n, label }) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: "clamp(22px,4vw,32px)", fontWeight: 700, color: "#e8e8ec", lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: "12px", color: "#6b6b78", marginTop: "4px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GAMES GRID ── */}
      <section
        className="games-grid-section"
        style={{ padding: "0 20px 80px", maxWidth: "1200px", margin: "0 auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <h2 style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: "#6b6b78",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>
            All Games
          </h2>
          <div style={{ height: "1px", flex: 1, background: "rgba(255,255,255,0.06)" }} />
          <span style={{ fontSize: "11px", color: "#3a3a45", whiteSpace: "nowrap" }}>
            Scores saved locally
          </span>
        </div>

        <GamesGrid />
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}>
        <p style={{ color: "#3a3a45", fontSize: "12px", textAlign: "center" }}>
          Built with ❤️ for the FairArena community ·&nbsp;
          <a href="https://fairarena.app" style={{ color: "#6b6b78", textDecoration: "underline" }}>fairarena.app</a>
        </p>
        <p style={{ color: "#2a2a35", fontSize: "11px" }}>
          High scores are stored locally in your browser · No account needed
        </p>
      </footer>
    </main>
  );
}
