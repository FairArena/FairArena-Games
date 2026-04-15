"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DifficultyBadge } from "./DifficultyBadge";
import { useLeaderboard } from "@/lib/useLeaderboard";

interface GameCardProps {
  id: string;
  href: string;
  title: string;
  tagline: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "BRUTAL";
  accentColor?: string;
  drawPreview?: (ctx: CanvasRenderingContext2D, t: number) => void;
  delay?: number;
}

function defaultPreview(accentColor: string) {
  return (ctx: CanvasRenderingContext2D, t: number) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = "#141417";
    ctx.fillRect(0, 0, w, h);

    // Animated dots
    for (let i = 0; i < 8; i++) {
      const x = (w / 8) * i + w / 16;
      const y = h / 2 + Math.sin(t * 0.002 + i * 0.8) * 30;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.6 + Math.sin(t * 0.003 + i) * 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
}

export function GameCard({
  id,
  href,
  title,
  tagline,
  difficulty,
  accentColor = "#7c6af7",
  drawPreview,
  delay = 0,
}: GameCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [mounted, setMounted] = useState(false);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);
  const personalBest = mounted ? getPersonalBest(id) : 0;

  useEffect(() => { setMounted(true); }, []);

  const draw = drawPreview ?? defaultPreview(accentColor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function loop() {
      const t = Date.now() - startTimeRef.current;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      draw(ctx!, t);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <div
      className="card"
      style={{
        overflow: "hidden",
        animationDelay: `${delay}ms`,
        opacity: 0,
        animation: `fade-in 0.4s ease ${delay}ms forwards`,
      }}
    >
      {/* Canvas preview */}
      <div style={{ position: "relative", overflow: "hidden", lineHeight: 0 }}>
        <canvas
          ref={canvasRef}
          width={300}
          height={160}
          style={{
            width: "100%",
            height: "160px",
            display: "block",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "60px",
            background: "linear-gradient(transparent, #141417)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Card body */}
      <div style={{ padding: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#e8e8ec",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
          <DifficultyBadge difficulty={difficulty} />
        </div>

        <p
          style={{
            color: "#6b6b78",
            fontSize: "13px",
            marginBottom: "14px",
            lineHeight: 1.4,
          }}
        >
          {tagline}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* High score */}
          <div>
            <div
              style={{
                fontSize: "10px",
                color: "#6b6b78",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Best
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: "18px",
                fontWeight: 700,
                color: personalBest > 0 ? "#7c6af7" : "#2a2a35",
                fontVariantNumeric: "tabular-nums",
              }}
              suppressHydrationWarning
            >
              {mounted ? (personalBest > 0 ? personalBest.toLocaleString() : "— pts") : "— pts"}
            </div>
          </div>

          {/* Play button */}
          <Link href={href} className="btn-primary">
            PLAY →
          </Link>
        </div>
      </div>
    </div>
  );
}
