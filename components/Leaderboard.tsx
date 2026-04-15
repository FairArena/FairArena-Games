"use client";

import React from "react";
import { useLeaderboard } from "@/lib/useLeaderboard";

interface LeaderboardProps {
  gameId: string;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatScore(score: number): string {
  return score.toLocaleString();
}

const RANK_COLORS = ["#ecc94b", "#a0aec0", "#c4a35a", "#6b6b78", "#6b6b78"];
const RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];

export function Leaderboard({ gameId }: LeaderboardProps) {
  const getTopScores = useLeaderboard((s) => s.getTopScores);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);
  const scores = getTopScores(gameId);
  const personalBest = getPersonalBest(gameId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {scores.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 16px",
            color: "#6b6b78",
            fontSize: "13px",
          }}
        >
          No scores yet. Be the first!
        </div>
      ) : (
        scores.map((entry, i) => {
          const isPersonalBest = entry.score === personalBest && i === 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                background: isPersonalBest
                  ? "rgba(124, 106, 247, 0.08)"
                  : "rgba(255,255,255,0.02)",
                borderRadius: "8px",
                border: isPersonalBest
                  ? "1px solid rgba(124, 106, 247, 0.2)"
                  : "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {/* Rank */}
              <span
                style={{
                  color: RANK_COLORS[i],
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  width: "28px",
                  flexShrink: 0,
                }}
              >
                {RANK_LABELS[i]}
              </span>

              {/* Score */}
              <span
                style={{
                  color: isPersonalBest ? "#7c6af7" : "#e8e8ec",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "16px",
                  fontWeight: 700,
                  flex: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatScore(entry.score)}
              </span>

              {/* Combo */}
              {entry.combo > 1 && (
                <span
                  style={{
                    color: "#3ecf8e",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: "rgba(62, 207, 142, 0.08)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    letterSpacing: "0.04em",
                  }}
                >
                  x{entry.combo}
                </span>
              )}

              {/* Date */}
              <span
                style={{
                  color: "#6b6b78",
                  fontSize: "11px",
                  flexShrink: 0,
                }}
              >
                {formatDate(entry.date)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
