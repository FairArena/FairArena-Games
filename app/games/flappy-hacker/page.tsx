"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle,
  createParticles,
  updateParticles,
  createShake,
  applyShake,
  ShakeState,
  playScoreSound,
  playDeathSound,
  playComboSound,
  fillBackground,
  drawText,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 480;
const GRAVITY = 0.5;
const JUMP_FORCE = -9;
const PIPE_GAP = 180;
const PIPE_SPEED_BASE = 3;
const PIPE_INTERVAL = 200; // frames between pipes

const PR_TITLES = [
  "fix: auth bug",
  "feat: dark mode",
  "refactor: db",
  "chore: deps",
  "fix: memory leak",
  "feat: API v2",
  "test: coverage",
  "docs: readme",
  "perf: cache",
  "fix: race cond",
  "feat: streaming",
  "build: docker",
];

type GameState = "start" | "playing" | "over";

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
  label: string;
  isGolden: boolean;
}

interface CodeRainDrop {
  x: number;
  y: number;
  speed: number;
  char: string;
  alpha: number;
}

export default function FlappyHackerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [lives] = useState(1);
  const [combo, setCombo] = useState(1);

  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  // Game state refs
  const birdRef = useRef({ x: 120, y: CANVAS_H / 2, vy: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const comboStreakRef = useRef(0);
  const frameRef = useRef(0);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const bestScoreRef = useRef(0);
  const codeRainRef = useRef<CodeRainDrop[]>([]);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const speedRef = useRef(PIPE_SPEED_BASE);

  // Init code rain
  useEffect(() => {
    codeRainRef.current = Array.from({ length: 30 }, (_, i) => ({
      x: i * 28,
      y: Math.random() * CANVAS_H,
      speed: 0.5 + Math.random() * 1,
      char: Math.random() > 0.5 ? "1" : "0",
      alpha: 0.03 + Math.random() * 0.07,
    }));
    bestScoreRef.current = getPersonalBest("flappy-hacker");
  }, [getPersonalBest]);

  const jump = useCallback(() => {
    if (stateRef.current === "over") return;
    if (stateRef.current === "start") {
      startGame();
      return;
    }
    birdRef.current.vy = JUMP_FORCE;
    generateTone(330, 60);
  }, []);

  function generateTone(freq: number, dur: number) {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur / 1000);
      osc.start();
      osc.stop(ctx.currentTime + dur / 1000);
    } catch {}
  }

  const startGame = useCallback(() => {
    birdRef.current = { x: 120, y: CANVAS_H / 2, vy: 0, rotation: 0 };
    pipesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 1;
    comboStreakRef.current = 0;
    frameRef.current = 0;
    speedRef.current = PIPE_SPEED_BASE;
    shakeRef.current = { intensity: 0, duration: 0, elapsed: 0, active: false };
    setScore(0);
    setCombo(1);
    stateRef.current = "playing";
    setGameState("playing");
    birdRef.current.vy = JUMP_FORCE;
  }, []);

  const endGame = useCallback(() => {
    stateRef.current = "over";
    setGameState("over");
    playDeathSound();

    const finalScore = scoreRef.current;
    const finalCombo = comboRef.current;
    addScore("flappy-hacker", {
      score: finalScore,
      date: new Date().toISOString(),
      combo: finalCombo,
    });
    bestScoreRef.current = Math.max(bestScoreRef.current, finalScore);

    shakeRef.current = createShake(5, 400);
  }, [addScore]);

  // Draw functions
  function drawBird(ctx: CanvasRenderingContext2D, bird: typeof birdRef.current) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);

    // Body (hoodie)
    ctx.fillStyle = "#7c6af7";
    ctx.fillRect(-10, -8, 20, 16);
    // Head
    ctx.fillStyle = "#e8c49a";
    ctx.fillRect(-6, -16, 12, 10);
    // Glasses
    ctx.fillStyle = "#0c0c0e";
    ctx.fillRect(-5, -13, 4, 3);
    ctx.fillRect(1, -13, 4, 3);
    // Hood
    ctx.fillStyle = "#5a49c5";
    ctx.fillRect(-10, -14, 6, 6);
    ctx.fillRect(4, -14, 6, 6);

    ctx.restore();
  }

  function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe) {
    const color = pipe.isGolden ? "#ecc94b" : "#1c1c21";
    const borderColor = pipe.isGolden ? "#f6d860" : "rgba(124,106,247,0.4)";

    // Top pipe
    ctx.fillStyle = color;
    ctx.fillRect(pipe.x, 0, 48, pipe.gapY);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(pipe.x, 0, 48, pipe.gapY);

    // Cap
    ctx.fillStyle = pipe.isGolden ? "#f6d860" : "#252535";
    ctx.fillRect(pipe.x - 4, pipe.gapY - 16, 56, 16);

    // Bottom pipe
    const bottomY = pipe.gapY + PIPE_GAP;
    ctx.fillStyle = color;
    ctx.fillRect(pipe.x, bottomY, 48, CANVAS_H - bottomY);
    ctx.strokeStyle = borderColor;
    ctx.strokeRect(pipe.x, bottomY, 48, CANVAS_H - bottomY);

    // Cap
    ctx.fillStyle = pipe.isGolden ? "#f6d860" : "#252535";
    ctx.fillRect(pipe.x - 4, bottomY, 56, 16);

    // Label
    ctx.save();
    ctx.font = "10px monospace";
    ctx.fillStyle = pipe.isGolden ? "#ecc94b" : "rgba(124,106,247,0.7)";
    ctx.textAlign = "center";
    ctx.fillText(pipe.label, pipe.x + 24, pipe.gapY - 22);
    ctx.restore();
  }

  function drawSkyline(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#141420";
    const buildings = [
      [0, 120], [60, 80], [110, 140], [180, 60], [240, 100],
      [290, 160], [360, 50], [420, 120], [480, 70], [550, 110],
      [610, 90], [670, 130], [730, 75], [780, 140],
    ];
    buildings.forEach(([x, h]) => {
      ctx.fillRect(x, CANVAS_H - h, 48, h);
      // Windows
      ctx.fillStyle = "rgba(236, 201, 75, 0.15)";
      for (let wx = x + 8; wx < x + 40; wx += 10) {
        for (let wy = CANVAS_H - h + 10; wy < CANVAS_H - 10; wy += 14) {
          if (Math.random() > 0.5) {
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      ctx.fillStyle = "#141420";
    });
  }

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      ctx.save();

      // Screen shake
      if (shakeRef.current.active) {
        shakeRef.current = applyShake(ctx, shakeRef.current, dt);
      }

      fillBackground(ctx, "#0c0c0e");

      // Skyline
      drawSkyline(ctx);

      // Code rain
      codeRainRef.current.forEach((drop) => {
        ctx.fillStyle = `rgba(124, 106, 247, ${drop.alpha})`;
        ctx.font = "12px monospace";
        ctx.fillText(drop.char, drop.x, drop.y);
        drop.y += drop.speed;
        if (drop.y > CANVAS_H) {
          drop.y = -10;
          drop.char = Math.random() > 0.5 ? "1" : "0";
        }
      });

      if (stateRef.current === "playing") {
        const bird = birdRef.current;
        const dtNorm = dt / 16.67;

        // Physics
        bird.vy += GRAVITY * dtNorm;
        bird.y += bird.vy * dtNorm;
        bird.rotation = Math.max(-30, Math.min(90, bird.vy * 5));

        // Spawn pipes
        frameRef.current += dtNorm;
        if (frameRef.current % PIPE_INTERVAL < dtNorm * 2 && pipesRef.current.length < 8) {
          const gapY = 80 + Math.random() * (CANVAS_H - PIPE_GAP - 160);
          const pipeCount = scoreRef.current;
          const isGolden = pipeCount > 0 && pipeCount % 5 === 4;
          pipesRef.current.push({
            x: CANVAS_W + 50,
            gapY,
            scored: false,
            label: PR_TITLES[Math.floor(Math.random() * PR_TITLES.length)],
            isGolden,
          });
        }

        // Speed progression
        speedRef.current = PIPE_SPEED_BASE + Math.floor(scoreRef.current / 10) * 0.3;

        // Update pipes
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const pipe = pipesRef.current[i];
          pipe.x -= speedRef.current * dtNorm;

          if (!pipe.scored && pipe.x + 48 < bird.x) {
            pipe.scored = true;
            comboStreakRef.current++;
            const bonus = pipe.isGolden ? 5 : 1;
            scoreRef.current += bonus * comboRef.current;

            if (comboStreakRef.current >= 3) {
              comboRef.current = Math.min(comboRef.current + 1, 4);
              setCombo(comboRef.current);
              playComboSound(comboRef.current);
            } else {
              playScoreSound();
            }

            setScore(scoreRef.current);
            createParticles(
              particlesRef.current,
              pipe.x + 24,
              pipe.gapY + PIPE_GAP / 2,
              pipe.isGolden ? "#ecc94b" : "#7c6af7",
              pipe.isGolden ? 20 : 10
            );
          }

          if (pipe.x + 48 < 0) {
            pipesRef.current.splice(i, 1);
          }

          drawPipe(ctx, pipe);

          // Collision
          const hitTop = bird.x + 8 > pipe.x && bird.x - 8 < pipe.x + 48 &&
            bird.y - 12 < pipe.gapY;
          const hitBot = bird.x + 8 > pipe.x && bird.x - 8 < pipe.x + 48 &&
            bird.y + 12 > pipe.gapY + PIPE_GAP;

          if (hitTop || hitBot) {
            createParticles(particlesRef.current, bird.x, bird.y, "#f56565", 16);
            endGame();
            return;
          }
        }

        // Ceiling/floor
        if (bird.y < 12 || bird.y > CANVAS_H - 12) {
          createParticles(particlesRef.current, bird.x, bird.y, "#f56565", 16);
          endGame();
          ctx.restore();
          return;
        }

        // Near-miss flash
        for (const pipe of pipesRef.current) {
          const margin = 30;
          const nearX = bird.x + 8 > pipe.x - margin && bird.x - 8 < pipe.x + 48 + margin;
          const nearGap = Math.abs(bird.y - pipe.gapY) < 20 || Math.abs(bird.y - (pipe.gapY + PIPE_GAP)) < 20;
          if (nearX && nearGap) {
            ctx.fillStyle = "rgba(245, 101, 101, 0.06)";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          }
        }

        // Best score ghost line
        if (bestScoreRef.current > 0 && bestScoreRef.current > scoreRef.current) {
          const ghostX = 120 + (bestScoreRef.current - scoreRef.current) * 48;
          if (ghostX < CANVAS_W) {
            ctx.strokeStyle = "rgba(124,106,247,0.2)";
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(ghostX, 0);
            ctx.lineTo(ghostX, CANVAS_H);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Bird
      drawBird(ctx, birdRef.current);

      // Particles
      updateParticles(ctx, particlesRef.current, dt);

      // Combo text
      if (comboRef.current > 1 && stateRef.current === "playing") {
        ctx.fillStyle = "#3ecf8e";
        ctx.font = "bold 14px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText(`x${comboRef.current} COMBO`, CANVAS_W / 2, 32);
        if (comboStreakRef.current >= 3) {
          ctx.fillStyle = "rgba(62,207,142,0.6)";
          ctx.font = "12px sans-serif";
          ctx.fillText("Clean Code!", CANVAS_W / 2, 52);
        }
      }

      // Score on canvas
      drawText(ctx, scoreRef.current.toString(), 16, 30, {
        font: "bold 20px monospace",
        color: "#e8e8ec",
      });

      // FPS
      drawText(ctx, `${Math.round(1000 / Math.max(dt, 1))} fps`, CANVAS_W - 50, CANVAS_H - 8, {
        font: "9px monospace",
        color: "#2a2a35",
        align: "right",
      });

      // START SCREEN
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.75)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Flappy Hacker", CANVAS_W / 2, CANVAS_H / 2 - 40);

        ctx.fillStyle = "#6b6b78";
        ctx.font = "16px sans-serif";
        ctx.fillText("Navigate code review gates", CANVAS_W / 2, CANVAS_H / 2 - 8);

        if (bestScoreRef.current > 0) {
          ctx.fillStyle = "#7c6af7";
          ctx.font = "14px monospace";
          ctx.fillText(`Best: ${bestScoreRef.current} PRs merged`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        }

        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(232, 232, 236, ${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("SPACE or TAP to Start", CANVAS_W / 2, CANVAS_H / 2 + 60);
        ctx.textAlign = "left";
      }

      // GAME OVER SCREEN
      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = "#f56565";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("PR Rejected", CANVAS_W / 2, CANVAS_H / 2 - 60);

        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 48px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, CANVAS_H / 2);

        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText("PRs merged", CANVAS_W / 2, CANVAS_H / 2 + 24);

        if (comboRef.current > 1) {
          ctx.fillStyle = "#3ecf8e";
          ctx.font = "13px sans-serif";
          ctx.fillText(`Best combo: x${comboRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 48);
        }

        ctx.fillStyle = "#7c6af7";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Personal best: ${Math.max(bestScoreRef.current, scoreRef.current)}`, CANVAS_W / 2, CANVAS_H / 2 + 72);

        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("ENTER or TAP to restart", CANVAS_W / 2, CANVAS_H / 2 + 104);
        ctx.textAlign = "left";
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [endGame]);

  // Input handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (stateRef.current === "over") {
          startGame();
        } else {
          jump();
        }
      }
      if (e.code === "Enter" && stateRef.current === "over") {
        startGame();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jump, startGame]);

  const handleCanvasClick = useCallback(() => {
    if (stateRef.current === "over") {
      startGame();
    } else {
      jump();
    }
  }, [jump, startGame]);

  return (
    <GameLayout
      gameId="flappy-hacker"
      title="Flappy Hacker"
      score={score}
      lives={lives}
      maxLives={1}
      combo={combo}
      keyboardHints={[
        "⎵ SPACE — Jump",
        "↑ UP — Jump",
        "TAP — Jump (mobile)",
      ]}
    >
      <div
        style={{
          position: "relative",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", width: "100%", height: "auto" }}
          onClick={handleCanvasClick}
        />
      </div>
    </GameLayout>
  );
}
