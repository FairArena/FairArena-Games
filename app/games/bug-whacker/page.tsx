"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createBurstParticles, updateParticles,
  playScoreSound, playDeathSound, playComboSound, playPowerUpSound,
  fillBackground, drawText, createShake, applyShake, ShakeState,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 540;
const GRID_COLS = 4;
const GRID_ROWS = 4;
const CELL_PAD = 12;
const CELL_W = (CANVAS_W - CELL_PAD * (GRID_COLS + 1)) / GRID_COLS;
const CELL_H = (CANVAS_H - 80 - CELL_PAD * (GRID_ROWS + 1)) / GRID_ROWS;
const CELL_START_Y = 80;

type GameState = "start" | "playing" | "over";
type BugType = "normal" | "critical" | "security" | "ghost" | "speed";

interface Bug {
  id: number;
  row: number;
  col: number;
  type: BugType;
  active: boolean;
  shown: boolean;
  lifeMs: number;
  maxLifeMs: number;
  spawnTime: number;
  clickCount: number;
}

const BUG_CONFIGS: Record<BugType, { emoji: string; pts: number; maxLife: number; label: string; color: string }> = {
  normal: { emoji: "🐛", pts: 10, maxLife: 2500, label: "CLICK", color: "#3ecf8e" },
  critical: { emoji: "💀", pts: 30, maxLife: 3000, label: "DOUBLE-CLICK", color: "#f56565" },
  security: { emoji: "🔥", pts: 50, maxLife: 3500, label: "RIGHT-CLICK", color: "#ecc94b" },
  ghost: { emoji: "👻", pts: 25, maxLife: 3000, label: "CLICK AT PEAK", color: "#7c6af7" },
  speed: { emoji: "⚡", pts: 40, maxLife: 500, label: "QUICK!", color: "#4db6f4" },
};

export default function BugWhackerPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(1);
  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const bugsRef = useRef<Bug[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const comboRef = useRef(1);
  const idCounterRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const spawnIntervalRef = useRef(1400);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const bestScoreRef = useRef(0);
  const scorePopups = useRef<Array<{ x: number; y: number; text: string; life: number; color: string }>>([]);

  function cellRect(row: number, col: number) {
    return {
      x: CELL_PAD + col * (CELL_W + CELL_PAD),
      y: CELL_START_Y + CELL_PAD + row * (CELL_H + CELL_PAD),
    };
  }

  const startGame = useCallback(() => {
    bugsRef.current = [];
    particlesRef.current = [];
    scorePopups.current = [];
    scoreRef.current = 0;
    livesRef.current = 5;
    comboRef.current = 1;
    idCounterRef.current = 0;
    spawnTimerRef.current = 0;
    spawnIntervalRef.current = 1400;
    bestScoreRef.current = getPersonalBest("bug-whacker");
    setScore(0); setLives(5); setCombo(1);
    stateRef.current = "playing";
    setGameState("playing");
  }, [getPersonalBest]);

  function spawnBug() {
    const occupied = new Set(bugsRef.current.map(b => `${b.row},${b.col}`));
    const available: [number, number][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (!occupied.has(`${r},${c}`)) available.push([r, c]);
      }
    }
    if (available.length === 0) return;
    const [row, col] = available[Math.floor(Math.random() * available.length)];

    const difficultyFactor = Math.min(scoreRef.current / 200, 1);
    const rand = Math.random();
    let type: BugType;
    if (rand < 0.35) type = "normal";
    else if (rand < 0.55) type = "critical";
    else if (rand < 0.7) type = "security";
    else if (rand < 0.85) type = "ghost";
    else type = "speed";

    const maxLife = Math.max(BUG_CONFIGS[type].maxLife * (1 - difficultyFactor * 0.5), 400);
    bugsRef.current.push({
      id: idCounterRef.current++,
      row, col, type,
      active: true, shown: true,
      lifeMs: maxLife,
      maxLifeMs: maxLife,
      spawnTime: Date.now(),
      clickCount: 0,
    });
  }

  function handleBugHit(bug: Bug, rightClick = false) {
    const config = BUG_CONFIGS[bug.type];
    const { x, y } = cellRect(bug.row, bug.col);
    const cx = x + CELL_W / 2, cy = y + CELL_H / 2;

    let success = false;
    if (bug.type === "normal" && !rightClick) success = true;
    else if (bug.type === "critical" && !rightClick) {
      bug.clickCount++;
      if (bug.clickCount >= 2) success = true;
      else return;
    }
    else if (bug.type === "security" && rightClick) success = true;
    else if (bug.type === "ghost") {
      const elapsed = Date.now() - bug.spawnTime;
      const halfLife = bug.maxLifeMs / 2;
      const opacity = Math.sin((elapsed / bug.maxLifeMs) * Math.PI);
      if (opacity > 0.6) success = true;
    }
    else if (bug.type === "speed" && !rightClick) success = true;

    if (success) {
      bug.active = false;
      const pts = config.pts * comboRef.current;
      scoreRef.current += pts;
      comboRef.current = Math.min(comboRef.current + 1, 8);
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      playScoreSound();
      if (comboRef.current >= 4) playComboSound(comboRef.current);
      createBurstParticles(particlesRef.current, cx, cy, [config.color, "#e8e8ec"], 16);
      scorePopups.current.push({ x: cx, y: cy, text: `+${pts}${comboRef.current > 1 ? ` x${comboRef.current}` : ""}`, life: 800, color: config.color });
      if (comboRef.current === 8) {
        createBurstParticles(particlesRef.current, cx, cy, ["#ecc94b", "#7c6af7", "#3ecf8e", "#f56565"], 40);
        shakeRef.current = createShake(4, 300);
      }
    } else if (!success && (bug.type !== "critical" || rightClick)) {
      // Wrong click type
      livesRef.current--;
      comboRef.current = 1;
      setLives(livesRef.current);
      setCombo(1);
      shakeRef.current = createShake(3, 200);
      scorePopups.current.push({ x: cx, y: cy, text: "MISS!", life: 600, color: "#f56565" });
      if (livesRef.current <= 0) {
        endGame();
      }
    }
  }

  function bugEscaped(bug: Bug) {
    const { x, y } = cellRect(bug.row, bug.col);
    livesRef.current--;
    comboRef.current = 1;
    setLives(livesRef.current);
    setCombo(1);
    shakeRef.current = createShake(2, 200);
    scorePopups.current.push({ x: x + CELL_W / 2, y: y + CELL_H / 2, text: "ESCAPED!", life: 700, color: "#f56565" });
    if (livesRef.current <= 0) endGame();
  }

  function endGame() {
    stateRef.current = "over";
    setGameState("over");
    playDeathSound();
    addScore("bug-whacker", { score: scoreRef.current, date: new Date().toISOString(), combo: comboRef.current });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      if (stateRef.current !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
      const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
      const rightClick = e.button === 2;

      for (const bug of bugsRef.current) {
        if (!bug.active || !bug.shown) continue;
        const { x, y } = cellRect(bug.row, bug.col);
        if (mx >= x && mx <= x + CELL_W && my >= y && my <= y + CELL_H) {
          handleBugHit(bug, rightClick);
          break;
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      if (stateRef.current !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
      const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
      for (const bug of bugsRef.current) {
        if (!bug.active || bug.type !== "critical") continue;
        const { x, y } = cellRect(bug.row, bug.col);
        if (mx >= x && mx <= x + CELL_W && my >= y && my <= y + CELL_H) {
          bug.clickCount = 2;
          handleBugHit(bug, false);
          break;
        }
      }
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("dblclick", handleDblClick);
    canvas.addEventListener("contextmenu", (e) => { e.preventDefault(); handleClick(e); });

    const handleKey = (e: KeyboardEvent) => {
      if ((e.code === "Enter" || e.code === "Space") && stateRef.current !== "playing") startGame();
    };
    window.addEventListener("keydown", handleKey);

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      ctx.save();
      if (shakeRef.current.active) applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      // Title bar
      ctx.fillStyle = "#141417";
      ctx.fillRect(0, 0, CANVAS_W, 56);
      ctx.fillStyle = "#3ecf8e";
      ctx.font = "bold 13px var(--font-space-grotesk, sans-serif)";
      ctx.fillText("BUG WHACKER — Terminal Defense System", 16, 32);
      if (stateRef.current === "playing") {
        drawText(ctx, `SCORE: ${scoreRef.current}`, CANVAS_W - 16, 32,
          { font: "bold 16px monospace", color: "#e8e8ec", align: "right" });
        if (comboRef.current > 1) {
          const comboLabel = comboRef.current === 8 ? "🔥 CRITICAL x8!" : `x${comboRef.current} COMBO`;
          const comboColor = comboRef.current === 8 ? "#ecc94b" : "#3ecf8e";
          ctx.fillStyle = comboColor;
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(comboLabel, CANVAS_W - 16, 50);
          ctx.textAlign = "left";
        }
      }

      if (stateRef.current === "playing") {
        // Spawn
        spawnTimerRef.current += dt;
        spawnIntervalRef.current = Math.max(600, 1400 - scoreRef.current * 0.8);
        if (spawnTimerRef.current >= spawnIntervalRef.current) {
          spawnTimerRef.current = 0;
          spawnBug();
        }

        // Update bugs
        for (let i = bugsRef.current.length - 1; i >= 0; i--) {
          const bug = bugsRef.current[i];
          if (!bug.active) {
            bugsRef.current.splice(i, 1);
            continue;
          }
          bug.lifeMs -= dt;

          // Ghost opacity cycling
          if (bug.type === "ghost") {
            const elapsed = Date.now() - bug.spawnTime;
            const opacity = Math.sin((elapsed / bug.maxLifeMs) * Math.PI);
            bug.shown = opacity > 0.05;
          }

          if (bug.lifeMs <= 0) {
            bugsRef.current.splice(i, 1);
            bugEscaped(bug);
            continue;
          }

          // Draw terminal cell
          const { x, y } = cellRect(bug.row, bug.col);
          const progress = bug.lifeMs / bug.maxLifeMs;
          const config = BUG_CONFIGS[bug.type];

          // Cell background
          ctx.fillStyle = "#141417";
          ctx.fillRect(x, y, CELL_W, CELL_H);
          ctx.strokeStyle = `rgba(${progress > 0.3 ? "255,255,255" : "245,101,101"},0.1)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, CELL_W, CELL_H);

          // Terminal header
          ctx.fillStyle = `rgba(${progress > 0.3 ? "28,28,33" : "50,10,10"},0.9)`;
          ctx.fillRect(x, y, CELL_W, 18);
          ctx.fillStyle = "#6b6b78";
          ctx.font = "9px monospace";
          ctx.fillText("$ terminal", x + 6, y + 13);

          // Life bar
          ctx.fillStyle = "#0c0c0e";
          ctx.fillRect(x, y + CELL_H - 6, CELL_W, 6);
          ctx.fillStyle = progress > 0.5 ? "#3ecf8e" : progress > 0.25 ? "#ecc94b" : "#f56565";
          ctx.fillRect(x, y + CELL_H - 6, CELL_W * progress, 6);

          // Bug emoji
          if (bug.shown) {
            const ghostFactor = bug.type === "ghost"
              ? Math.sin(((Date.now() - bug.spawnTime) / bug.maxLifeMs) * Math.PI)
              : 1;
            ctx.globalAlpha = ghostFactor;
            ctx.font = `${Math.floor(CELL_H * 0.4)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(config.emoji, x + CELL_W / 2, y + CELL_H / 2 + CELL_H * 0.15);
            ctx.globalAlpha = 1;
            ctx.fillStyle = config.color;
            ctx.font = "7px monospace";
            ctx.fillText(config.label, x + CELL_W / 2, y + CELL_H - 14);
            ctx.textAlign = "left";
          }
        }

        // Draw empty cells
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const hasBug = bugsRef.current.some(b => b.row === r && b.col === c);
            if (!hasBug) {
              const { x, y } = cellRect(r, c);
              ctx.fillStyle = "#0e0e12";
              ctx.fillRect(x, y, CELL_W, CELL_H);
              ctx.strokeStyle = "rgba(255,255,255,0.04)";
              ctx.strokeRect(x, y, CELL_W, CELL_H);
              ctx.fillStyle = "#141417";
              ctx.fillRect(x, y, CELL_W, 18);
              ctx.fillStyle = "#2a2a35";
              ctx.font = "8px monospace";
              ctx.fillText("$ _", x + 6, y + 13);
            }
          }
        }

        // Lives display
        ctx.fillStyle = "#6b6b78";
        ctx.font = "12px sans-serif";
        ctx.fillText("Lives:", CANVAS_W - 100, 52);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i < livesRef.current ? "#f56565" : "#2a2a35";
          ctx.fillText("♥", CANVAS_W - 70 + i * 14, 52);
        }
      }

      // Score popups
      for (let i = scorePopups.current.length - 1; i >= 0; i--) {
        const p = scorePopups.current[i];
        p.life -= dt;
        p.y -= 0.5;
        if (p.life <= 0) { scorePopups.current.splice(i, 1); continue; }
        ctx.globalAlpha = p.life / 800;
        ctx.fillStyle = p.color;
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
      }

      updateParticles(ctx, particlesRef.current, dt);

      // START
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.82)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#3ecf8e";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Bug Whacker", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "13px sans-serif";
        ctx.fillText("🐛 Click  💀 Double-click  🔥 Right-click  👻 Click at peak", CANVAS_W / 2, CANVAS_H / 2 - 12);
        ctx.fillText("⚡ Click within 0.5s window", CANVAS_W / 2, CANVAS_H / 2 + 12);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(62,207,142,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("CLICK to Start", CANVAS_W / 2, CANVAS_H / 2 + 60);
        ctx.textAlign = "left";
      }

      // GAME OVER
      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.88)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("System Compromised!", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 52px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Best combo: x${comboRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 38);
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("ENTER to restart", CANVAS_W / 2, CANVAS_H / 2 + 80);
        ctx.textAlign = "left";
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("dblclick", handleDblClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [addScore, startGame]);

  return (
    <GameLayout
      gameId="bug-whacker"
      title="Bug Whacker"
      score={score}
      lives={lives}
      maxLives={5}
      combo={combo}
      keyboardHints={[
        "🐛 Normal — Single Click",
        "💀 Critical — Double-Click",
        "🔥 Security — Right-Click",
        "👻 Ghost — Click at peak opacity",
        "⚡ Speed — Click fast!",
      ]}
    >
      <div
        style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", cursor: "pointer" }}
        onClick={() => stateRef.current !== "playing" && startGame()}
      >
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
    </GameLayout>
  );
}
