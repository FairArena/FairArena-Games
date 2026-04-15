"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Leaderboard } from "./Leaderboard";
import { useLeaderboard } from "@/lib/useLeaderboard";

interface GameLayoutProps {
  gameId: string;
  title: string;
  score?: number;
  lives?: number;
  maxLives?: number;
  combo?: number;
  keyboardHints?: string[];
  children: React.ReactNode;
  touchControls?: React.ReactNode;
}

export function GameLayout({
  gameId,
  title,
  score = 0,
  lives,
  maxLives = 3,
  combo = 1,
  keyboardHints = [],
  children,
  touchControls,
}: GameLayoutProps) {
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const personalBest = mounted ? getPersonalBest(gameId) : 0;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0c0c0e",
        color: "#e8e8ec",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <header
        className="game-header"
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#141417",
          position: "sticky",
          top: 0,
          zIndex: 30,
          flexShrink: 0,
          gap: "8px",
        }}
      >
        {/* Back */}
        <Link
          href="/"
          className="no-select"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#6b6b78",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none",
            flexShrink: 0,
            minHeight: "36px",
            padding: "0 4px",
          }}
        >
          ← <span style={{ display: "none" }} className="back-label">Back</span>
        </Link>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "clamp(13px, 3.5vw, 18px)",
            fontWeight: 700,
            color: "#e8e8ec",
            flex: 1,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h1>

        {/* HUD */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {combo > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                padding: "3px 8px",
                background: "rgba(62,207,142,0.1)",
                borderRadius: "6px",
                border: "1px solid rgba(62,207,142,0.2)",
              }}
            >
              <span
                style={{
                  color: "#3ecf8e",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                x{combo}
              </span>
            </div>
          )}

          {lives !== undefined && (
            <div style={{ display: "flex", gap: "2px" }}>
              {Array.from({ length: maxLives }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "12px",
                    opacity: i < lives ? 1 : 0.2,
                  }}
                >
                  ❤️
                </span>
              ))}
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: "clamp(14px,4vw,20px)",
                fontWeight: 700,
                color: "#e8e8ec",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.2,
              }}
              suppressHydrationWarning
            >
              {mounted ? score.toLocaleString() : "0"}
            </div>
            <div style={{ fontSize: "9px", color: "#6b6b78" }} suppressHydrationWarning>
              PB {mounted ? personalBest.toLocaleString() : "—"}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main
        className="game-layout-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 12px 32px",
          gap: "20px",
        }}
      >
        {/* Canvas/game */}
        <div style={{ width: "100%", maxWidth: "880px" }}>
          {children}
        </div>

        {/* Touch controls (shown only on mobile via CSS) */}
        {touchControls && (
          <div className="touch-controls" style={{
            width: "100%",
            maxWidth: "880px",
            gap: "12px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}>
            {touchControls}
          </div>
        )}

        {/* Keyboard hints */}
        {keyboardHints.length > 0 && (
          <div
            className="keyboard-hints"
            style={{
              width: "100%",
              maxWidth: "880px",
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {keyboardHints.map((hint, i) => (
              <span
                key={i}
                style={{
                  color: "#6b6b78",
                  fontSize: "12px",
                  background: "#141417",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                }}
              >
                {hint}
              </span>
            ))}
          </div>
        )}

        {/* Bottom panels */}
        <div
          className="bottom-panels"
          style={{
            width: "100%",
            maxWidth: "880px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          {/* Personal best */}
          <div
            style={{
              background: "#141417",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                color: "#6b6b78",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Your Best
            </h3>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: "clamp(22px,5vw,32px)",
                fontWeight: 700,
                color: personalBest > 0 ? "#7c6af7" : "#2a2a35",
              }}
              suppressHydrationWarning
            >
              {mounted ? (personalBest > 0 ? personalBest.toLocaleString() : "—") : "—"}
            </div>
            {personalBest > 0 && (
              <div style={{ color: "#6b6b78", fontSize: "11px", marginTop: "2px" }}>pts</div>
            )}
          </div>

          {/* Top 5 */}
          <div
            style={{
              background: "#141417",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "10px",
                fontWeight: 600,
                color: "#6b6b78",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "10px",
              }}
            >
              Top Scores
            </h3>
            <Leaderboard gameId={gameId} />
          </div>
        </div>
      </main>
    </div>
  );
}

/* Reusable mobile D-pad component */
export function TouchDPad({
  onUp, onDown, onLeft, onRight,
}: {
  onUp?: () => void; onDown?: () => void;
  onLeft?: () => void; onRight?: () => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "56px 56px 56px", gap: "4px", userSelect: "none" }}>
      <div />
      <button className="btn-touch no-select"
        onTouchStart={(e) => { e.preventDefault(); onUp?.(); }}
        onClick={onUp}
      >↑</button>
      <div />
      <button className="btn-touch no-select"
        onTouchStart={(e) => { e.preventDefault(); onLeft?.(); }}
        onClick={onLeft}
      >←</button>
      <div style={{ width: 56, height: 56, background: "rgba(255,255,255,0.03)", borderRadius: "12px" }} />
      <button className="btn-touch no-select"
        onTouchStart={(e) => { e.preventDefault(); onRight?.(); }}
        onClick={onRight}
      >→</button>
      <div />
      <button className="btn-touch no-select"
        onTouchStart={(e) => { e.preventDefault(); onDown?.(); }}
        onClick={onDown}
      >↓</button>
      <div />
    </div>
  );
}

/* Single action button */
export function TouchAction({
  label, color = "#7c6af7", onPress
}: {
  label: string; color?: string; onPress?: () => void
}) {
  return (
    <button
      className="no-select"
      onTouchStart={(e) => { e.preventDefault(); onPress?.(); }}
      onClick={onPress}
      style={{
        minHeight: "64px",
        minWidth: "120px",
        borderRadius: "14px",
        background: `${color}22`,
        border: `1.5px solid ${color}44`,
        color,
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: "15px",
        fontWeight: 700,
        cursor: "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "background 0.1s ease",
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </button>
  );
}
