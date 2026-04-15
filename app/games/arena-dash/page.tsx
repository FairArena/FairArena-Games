"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createParticles, createBurstParticles, updateParticles,
  playScoreSound, playDeathSound, playPowerUpSound,
  fillBackground, drawText, createShake, applyShake, ShakeState,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 400;
type GameState = "start" | "playing" | "over";

interface Obstacle {
  x: number;
  y: number;
  type: "jump" | "slide" | "both";
  width: number;
  height: number;
  label: string;
  color: string;
}

interface Milestone {
  distance: number;
  label: string;
}

const MILESTONES: Milestone[] = [
  { distance: 500, label: "🚀 Hackathon Starts!" },
  { distance: 1000, label: "⚡ Judging Begins!" },
  { distance: 2000, label: "🏆 Finals Round!" },
  { distance: 5000, label: "🎉 Grand Prize!" },
];

const GROUND_Y = CANVAS_H - 60;
const PLAYER_W = 20;
const PLAYER_H = 36;
const PLAYER_X = 80;

export default function ArenaDashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const playerRef = useRef({
    y: GROUND_Y - PLAYER_H,
    vy: 0,
    isJumping: false,
    jumpCount: 0,
    isSliding: false,
    slideTimer: 0,
    dead: false,
  });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const distanceRef = useRef(0);
  const speedRef = useRef(4);
  const obstacleTimerRef = useRef(0);
  const obstacleIntervalRef = useRef(1800);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const bestDistanceRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());
  const milestoneFlashRef = useRef<{ label: string; timer: number } | null>(null);
  const bgOffsetRef = useRef(0);

  const GRAVITY = 0.6;
  const JUMP_FORCE = -13;

  function startGame() {
    const p = playerRef.current;
    p.y = GROUND_Y - PLAYER_H;
    p.vy = 0;
    p.isJumping = false;
    p.jumpCount = 0;
    p.isSliding = false;
    p.slideTimer = 0;
    p.dead = false;
    obstaclesRef.current = [];
    particlesRef.current = [];
    distanceRef.current = 0;
    speedRef.current = 4;
    obstacleTimerRef.current = 0;
    obstacleIntervalRef.current = 1800;
    bgOffsetRef.current = 0;
    bestDistanceRef.current = getPersonalBest("arena-dash");
    setScore(0);
    stateRef.current = "playing";
    setGameState("playing");
  }

  function jump() {
    const p = playerRef.current;
    if (stateRef.current !== "playing") return;
    if (p.jumpCount < 2) {
      p.vy = JUMP_FORCE;
      p.jumpCount++;
      p.isJumping = true;
      p.isSliding = false;
      p.slideTimer = 0;
      try {
        const ac = new AudioContext();
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.frequency.value = p.jumpCount > 1 ? 500 : 380;
        g.gain.setValueAtTime(0.06, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
        osc.start(); osc.stop(ac.currentTime + 0.12);
      } catch {}
    }
  }

  function slide() {
    const p = playerRef.current;
    if (stateRef.current !== "playing") return;
    if (!p.isJumping || p.y >= GROUND_Y - PLAYER_H - 5) {
      p.isSliding = true;
      p.slideTimer = 600;
    }
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (stateRef.current !== "playing") { startGame(); return; }
        jump();
      }
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        slide();
      }
      if (e.code === "Enter" && stateRef.current !== "playing") startGame();
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  function spawnObstacle() {
    const types: Array<{ type: Obstacle["type"], label: string, color: string, height: number, width: number }> = [
      { type: "jump", label: "MERGE CONFLICT", color: "#f56565", height: 50, width: 30 },
      { type: "slide", label: "SCOPE CREEP", color: "#6b6b78", height: 20, width: 80 },
      { type: "both", label: "MISSING README", color: "#ecc94b", height: 34, width: 24 },
    ];
    const chosen = types[Math.floor(Math.random() * types.length)];
    const y = chosen.type === "slide"
      ? GROUND_Y - 60
      : GROUND_Y - chosen.height;

    obstaclesRef.current.push({
      x: CANVAS_W + 40,
      y,
      ...chosen,
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;
      const dtN = dt / 16.67;

      ctx.save();
      if (shakeRef.current.active) applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      const speed = speedRef.current;

      // Parallax city background
      bgOffsetRef.current = (bgOffsetRef.current + speed * 0.3 * dtN) % CANVAS_W;
      const buildingHeights = [60, 100, 80, 140, 70, 110, 90, 60, 130, 50, 120, 75];
      buildingHeights.forEach((h, i) => {
        const bx = ((i * 72 - bgOffsetRef.current * 0.5) % (CANVAS_W + 72) + CANVAS_W + 72) % (CANVAS_W + 72);
        ctx.fillStyle = "#141420";
        ctx.fillRect(bx - 36, GROUND_Y - h, 68, h);
        // Windows
        for (let wx = bx - 28; wx < bx + 30; wx += 12) {
          for (let wy = GROUND_Y - h + 12; wy < GROUND_Y - 8; wy += 18) {
            if (Math.random() > 0.6) {
              ctx.fillStyle = "rgba(236,201,75,0.12)";
              ctx.fillRect(wx, wy, 8, 10);
            }
          }
        }
      });

      // Ground
      ctx.fillStyle = "#1c1c21";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 1);

      // Ground markings (scrolling)
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      for (let x = (-(bgOffsetRef.current * 2) % 60 + 60) % 60; x < CANVAS_W; x += 60) {
        ctx.fillRect(x, GROUND_Y + 4, 30, 2);
      }

      if (stateRef.current === "playing") {
        const p = playerRef.current;

        // Update distance / speed
        distanceRef.current += speed * dtN;
        speedRef.current = Math.min(4 + distanceRef.current / 800, 10);
        setScore(Math.floor(distanceRef.current));

        // Milestone
        for (const m of MILESTONES) {
          if (distanceRef.current >= m.distance && !milestoneFlashRef.current) {
            milestoneFlashRef.current = { label: m.label, timer: 2500 };
            MILESTONES.splice(MILESTONES.indexOf(m), 1);
            playPowerUpSound();
            break;
          }
        }
        if (milestoneFlashRef.current) {
          milestoneFlashRef.current.timer -= dt;
          if (milestoneFlashRef.current.timer <= 0) milestoneFlashRef.current = null;
          else {
            ctx.fillStyle = `rgba(124,106,247,${0.08 * (milestoneFlashRef.current.timer / 2500)})`;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            ctx.fillStyle = "#7c6af7";
            ctx.font = "bold 18px var(--font-space-grotesk, sans-serif)";
            ctx.textAlign = "center";
            ctx.fillText(milestoneFlashRef.current.label, CANVAS_W / 2, 50);
            ctx.textAlign = "left";
          }
        }

        // Slide timer
        if (p.isSliding) {
          p.slideTimer -= dt;
          if (p.slideTimer <= 0) p.isSliding = false;
        }

        // Physics
        p.vy += GRAVITY * dtN;
        p.y += p.vy * dtN;
        if (p.y >= GROUND_Y - PLAYER_H) {
          p.y = GROUND_Y - PLAYER_H;
          p.vy = 0;
          p.isJumping = false;
          p.jumpCount = 0;
        }

        // Obstacle spawn
        obstacleTimerRef.current += dt;
        obstacleIntervalRef.current = Math.max(900, 1800 - distanceRef.current * 0.2);
        if (obstacleTimerRef.current >= obstacleIntervalRef.current) {
          obstacleTimerRef.current = 0;
          spawnObstacle();
        }

        // Update/draw obstacles
        for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
          const ob = obstaclesRef.current[i];
          ob.x -= speed * dtN;

          // Draw
          ctx.fillStyle = ob.color;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#0c0c0e";
          ctx.font = "6px monospace";
          ctx.textAlign = "center";
          ctx.fillText(ob.label, ob.x + ob.width / 2, ob.y + ob.height / 2 + 3);
          ctx.textAlign = "left";

          if (ob.x + ob.width < 0) {
            obstaclesRef.current.splice(i, 1);
            continue;
          }

          // Collision
          const ph = p.isSliding ? 14 : PLAYER_H;
          const py = p.isSliding ? GROUND_Y - 14 : p.y;
          const collision =
            PLAYER_X + PLAYER_W - 6 > ob.x &&
            PLAYER_X + 6 < ob.x + ob.width &&
            py + ph - 4 > ob.y &&
            py + 4 < ob.y + ob.height;

          if (collision) {
            p.dead = true;
            createBurstParticles(particlesRef.current, PLAYER_X + 10, py + ph / 2,
              ["#f56565", "#ecc94b", "#7c6af7"], 20);
            shakeRef.current = createShake(5, 400);
            playDeathSound();
            addScore("arena-dash", {
              score: Math.floor(distanceRef.current),
              date: new Date().toISOString(),
              combo: 1,
            });
            stateRef.current = "over";
            setGameState("over");
          }
        }

        // Draw player
        const ph = p.isSliding ? 14 : PLAYER_H;
        const py = p.isSliding ? GROUND_Y - 14 : p.y;
        // Body
        ctx.fillStyle = "#7c6af7";
        ctx.fillRect(PLAYER_X, py, PLAYER_W, ph);
        if (!p.isSliding) {
          // Head
          ctx.fillStyle = "#e8c49a";
          ctx.fillRect(PLAYER_X + 2, py - 12, 16, 12);
          // Glasses
          ctx.fillStyle = "#0c0c0e";
          ctx.fillRect(PLAYER_X + 3, py - 9, 4, 3);
          ctx.fillRect(PLAYER_X + 10, py - 9, 4, 3);
        }
        // Legs animating
        const legTime = Date.now() * 0.02;
        ctx.fillStyle = "#5a49c5";
        ctx.fillRect(PLAYER_X + 2, py + ph, 6, 4 + Math.sin(legTime) * 3);
        ctx.fillRect(PLAYER_X + 12, py + ph, 6, 4 + Math.cos(legTime) * 3);

        // Score display
        drawText(ctx, `${Math.floor(distanceRef.current)}m`, CANVAS_W - 16, 28,
          { font: "bold 20px monospace", color: "#e8e8ec", align: "right" });
        if (bestDistanceRef.current > 0) {
          drawText(ctx, `Best: ${bestDistanceRef.current}m`, CANVAS_W - 16, 48,
            { font: "11px monospace", color: "#6b6b78", align: "right" });
        }
      }

      updateParticles(ctx, particlesRef.current, dt);

      // START
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Arena Dash", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "15px sans-serif";
        ctx.fillText("SPACE/↑ to jump · ↓ to slide · Double-jump possible!", CANVAS_W / 2, CANVAS_H / 2 - 4);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(245,101,101,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("SPACE to Start", CANVAS_W / 2, CANVAS_H / 2 + 48);
        ctx.textAlign = "left";
      }

      // GAME OVER
      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Wipeout!", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 48px monospace";
        ctx.fillText(`${Math.floor(distanceRef.current)}m`, CANVAS_W / 2, CANVAS_H / 2 + 8);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText("distance covered", CANVAS_W / 2, CANVAS_H / 2 + 32);
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("SPACE or ENTER to restart", CANVAS_W / 2, CANVAS_H / 2 + 80);
        ctx.textAlign = "left";
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [addScore]);

  return (
    <GameLayout
      gameId="arena-dash"
      title="Arena Dash"
      score={score}
      keyboardHints={["⎵ SPACE / ↑ UP — Jump", "⎵⎵ Double SPACE — Double-Jump", "↓ DOWN — Slide"]}
    >
      <div
        style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" }}
        onClick={() => {
          if (stateRef.current !== "playing") startGame();
          else jump();
        }}
      >
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
    </GameLayout>
  );
}
