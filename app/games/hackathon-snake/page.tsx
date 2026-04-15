"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle,
  createParticles,
  updateParticles,
  playScoreSound,
  playDeathSound,
  playPowerUpSound,
  fillBackground,
  drawText,
  createShake,
  applyShake,
  ShakeState,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 480;
const GRID_COLS = 24;
const GRID_ROWS = 24;
const CELL = Math.floor(Math.min(CANVAS_W, CANVAS_H) / GRID_COLS);

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GameState = "start" | "playing" | "over";

interface Cell {
  x: number;
  y: number;
}

interface FoodItem {
  cell: Cell;
  type: "react" | "docker" | "ai" | "prize";
  score: number;
  emoji: string;
}

type PowerUpType = "mvp" | "debt";

interface PowerUp {
  cell: Cell;
  type: PowerUpType;
  emoji: string;
  timer?: number;
}

const FOOD_TYPES: Array<{ type: FoodItem["type"]; score: number; emoji: string; weight: number }> = [
  { type: "react", score: 1, emoji: "⚛", weight: 50 },
  { type: "docker", score: 2, emoji: "🐳", weight: 30 },
  { type: "ai", score: 5, emoji: "🤖", weight: 15 },
  { type: "prize", score: 10, emoji: "🏆", weight: 5 },
];

export default function HackathonSnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [lives] = useState(1);

  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const snakeRef = useRef<Cell[]>([{ x: 12, y: 12 }]);
  const dirRef = useRef<Dir>("RIGHT");
  const nextDirRef = useRef<Dir>("RIGHT");
  const foodRef = useRef<FoodItem | null>(null);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const obstaclesRef = useRef<Cell[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const comboStreakRef = useRef(0);
  const foodEatenRef = useRef(0);
  const lastMoveRef = useRef(0);
  const moveIntervalRef = useRef(150);
  const activePowerRef = useRef<PowerUpType | null>(null);
  const powerTimerRef = useRef(0);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const bestScoreRef = useRef(0);

  function randomFreeCell(): Cell {
    const snake = snakeRef.current;
    const obstacles = obstaclesRef.current;
    let cell: Cell;
    do {
      cell = { x: Math.floor(Math.random() * GRID_COLS), y: Math.floor(Math.random() * GRID_ROWS) };
    } while (
      snake.some(s => s.x === cell.x && s.y === cell.y) ||
      obstacles.some(o => o.x === cell.x && o.y === cell.y)
    );
    return cell;
  }

  function spawnFood() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    let chosen = FOOD_TYPES[0];
    for (const ft of FOOD_TYPES) {
      cumulative += ft.weight;
      if (rand <= cumulative) { chosen = ft; break; }
    }
    foodRef.current = { cell: randomFreeCell(), ...chosen };
  }

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }];
    dirRef.current = "RIGHT";
    nextDirRef.current = "RIGHT";
    obstaclesRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    comboRef.current = 1;
    comboStreakRef.current = 0;
    foodEatenRef.current = 0;
    moveIntervalRef.current = 150;
    activePowerRef.current = null;
    powerTimerRef.current = 0;
    bestScoreRef.current = getPersonalBest("hackathon-snake");
    spawnFood();
    setScore(0);
    setCombo(1);
    stateRef.current = "playing";
    setGameState("playing");
  }, [getPersonalBest]);

  useEffect(() => {
    bestScoreRef.current = getPersonalBest("hackathon-snake");
  }, [getPersonalBest]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const dir = dirRef.current;
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        KeyW: "UP", KeyS: "DOWN", KeyA: "LEFT", KeyD: "RIGHT",
      };
      const newDir = map[e.code];
      if (newDir && !isOpposite(newDir, dir)) {
        nextDirRef.current = newDir;
      }
      if ((e.code === "Space" || e.code === "Enter") && stateRef.current !== "playing") {
        startGame();
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  function isOpposite(a: Dir, b: Dir): boolean {
    return (a === "UP" && b === "DOWN") || (a === "DOWN" && b === "UP") ||
      (a === "LEFT" && b === "RIGHT") || (a === "RIGHT" && b === "LEFT");
  }

  function moveSnake(): boolean {
    dirRef.current = nextDirRef.current;
    const head = snakeRef.current[0];
    const dx = dirRef.current === "LEFT" ? -1 : dirRef.current === "RIGHT" ? 1 : 0;
    const dy = dirRef.current === "UP" ? -1 : dirRef.current === "DOWN" ? 1 : 0;
    const newHead = { x: head.x + dx, y: head.y + dy };

    // Wall collision (but MVP mode = invincible)
    if (activePowerRef.current !== "mvp") {
      if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) return false;
      // Self collision
      if (snakeRef.current.slice(1).some(s => s.x === newHead.x && s.y === newHead.y)) return false;
      // Obstacles
      if (obstaclesRef.current.some(o => o.x === newHead.x && o.y === newHead.y)) return false;
    } else {
      newHead.x = (newHead.x + GRID_COLS) % GRID_COLS;
      newHead.y = (newHead.y + GRID_ROWS) % GRID_ROWS;
    }

    snakeRef.current.unshift(newHead);

    // Eat food
    const food = foodRef.current;
    if (food && newHead.x === food.cell.x && newHead.y === food.cell.y) {
      scoreRef.current += food.score * comboRef.current;
      foodEatenRef.current++;
      comboStreakRef.current++;
      if (comboStreakRef.current >= 3) {
        comboRef.current = Math.min(comboRef.current + 1, 4);
        setCombo(comboRef.current);
      }
      setScore(scoreRef.current);
      playScoreSound();
      createParticles(particlesRef.current, newHead.x * CELL + CELL / 2, newHead.y * CELL + CELL / 2,
        food.type === "prize" ? "#ecc94b" : "#3ecf8e", 10);
      spawnFood();

      // Speed up every 5 food
      moveIntervalRef.current = Math.max(60, 150 - Math.floor(foodEatenRef.current / 5) * 10);

      // Scope creep obstacles every 15 food
      if (foodEatenRef.current % 15 === 0) {
        for (let i = 0; i < 3; i++) obstaclesRef.current.push(randomFreeCell());
      }

      // Power-up spawn every 8 food
      if (foodEatenRef.current % 8 === 0) {
        const types: PowerUpType[] = ["mvp", "debt"];
        const t = types[Math.floor(Math.random() * types.length)];
        powerUpsRef.current.push({
          cell: randomFreeCell(), type: t,
          emoji: t === "mvp" ? "⭐" : "💸",
        });
      }
    } else {
      snakeRef.current.pop();
      comboStreakRef.current = 0;
    }

    // Power-up collection
    for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
      const p = powerUpsRef.current[i];
      if (newHead.x === p.cell.x && newHead.y === p.cell.y) {
        activePowerRef.current = p.type;
        powerTimerRef.current = 5000;
        powerUpsRef.current.splice(i, 1);
        playPowerUpSound();
      }
    }

    return true;
  }

  function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
    const px = x * CELL, py = y * CELL;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    // Eyes
    ctx.fillStyle = "#0c0c0e";
    const dir = dirRef.current;
    const eyeOffsets = dir === "RIGHT" ? [[CELL - 6, 3], [CELL - 6, CELL - 7]] :
      dir === "LEFT" ? [[2, 3], [2, CELL - 7]] :
        dir === "UP" ? [[3, 2], [CELL - 7, 2]] : [[3, CELL - 6], [CELL - 7, CELL - 6]];
    eyeOffsets.forEach(([ex, ey]) => ctx.fillRect(px + ex, py + ey, 3, 3));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      ctx.save();
      if (shakeRef.current.active) applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_W; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      if (stateRef.current === "playing") {
        // Move snake
        lastMoveRef.current += dt;
        if (lastMoveRef.current >= moveIntervalRef.current) {
          lastMoveRef.current -= moveIntervalRef.current;

          // Tech Debt: random direction changes
          if (activePowerRef.current === "debt" && Math.random() < 0.3) {
            const dirs: Dir[] = ["UP", "DOWN", "LEFT", "RIGHT"];
            const validDirs = dirs.filter(d => !isOpposite(d, dirRef.current));
            nextDirRef.current = validDirs[Math.floor(Math.random() * validDirs.length)];
          }

          if (!moveSnake()) {
            playDeathSound();
            shakeRef.current = createShake(4, 300);
            addScore("hackathon-snake", {
              score: scoreRef.current, date: new Date().toISOString(), combo: comboRef.current
            });
            stateRef.current = "over";
            setGameState("over");
          }
        }

        // Power-up timer
        if (activePowerRef.current) {
          powerTimerRef.current -= dt;
          if (powerTimerRef.current <= 0) activePowerRef.current = null;
        }

        // Draw obstacles
        ctx.fillStyle = "#2a2a35";
        obstaclesRef.current.forEach(o => {
          ctx.fillRect(o.x * CELL + 1, o.y * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = "#3a3a45";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("SC", o.x * CELL + CELL / 2, o.y * CELL + CELL / 2 + 4);
          ctx.textAlign = "left";
          ctx.fillStyle = "#2a2a35";
        });

        // Draw food
        const food = foodRef.current;
        if (food) {
          ctx.font = `${CELL - 4}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(food.emoji, food.cell.x * CELL + CELL / 2, food.cell.y * CELL + CELL - 2);
          ctx.textAlign = "left";
        }

        // Draw power-ups
        powerUpsRef.current.forEach(p => {
          ctx.font = `${CELL - 4}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(p.emoji, p.cell.x * CELL + CELL / 2, p.cell.y * CELL + CELL - 2);
          ctx.textAlign = "left";
        });

        // Draw snake
        const snake = snakeRef.current;
        const color = activePowerRef.current === "mvp" ? "#ecc94b" :
          activePowerRef.current === "debt" ? "#f56565" : "#3ecf8e";

        snake.forEach((s, i) => {
          if (i === 0) {
            drawHead(ctx, s.x, s.y, color);
          } else {
            ctx.fillStyle = `rgba(${activePowerRef.current === "mvp" ? "236,201,75" :
              activePowerRef.current === "debt" ? "245,101,101" : "62,207,142"},${Math.max(0.3, 1 - i * 0.04)})`;
            ctx.fillRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4);
          }
        });

        // Power bar
        if (activePowerRef.current) {
          const barW = 200;
          const barX = (CANVAS_W - barW) / 2;
          const barY = 8;
          const frac = powerTimerRef.current / 5000;
          ctx.fillStyle = "#1c1c21";
          ctx.fillRect(barX, barY, barW, 8);
          ctx.fillStyle = activePowerRef.current === "mvp" ? "#ecc94b" : "#f56565";
          ctx.fillRect(barX, barY, barW * frac, 8);
          ctx.fillStyle = "#e8e8ec";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(activePowerRef.current === "mvp" ? "⭐ MVP MODE" : "💸 TECH DEBT", CANVAS_W / 2, barY + 22);
          ctx.textAlign = "left";
        }

        // Score & combo
        drawText(ctx, `${scoreRef.current}`, CANVAS_W - 16, 24, { font: "bold 18px monospace", color: "#e8e8ec", align: "right" });
        if (comboRef.current > 1) {
          ctx.fillStyle = "#3ecf8e";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "right";
          ctx.fillText(`x${comboRef.current} COMBO`, CANVAS_W - 16, 44);
          ctx.textAlign = "left";
        }
        drawText(ctx, `🐍 ${snake.length}`, 16, 24, { font: "13px sans-serif", color: "#6b6b78" });
        drawText(ctx, `Speed: ${Math.round(1000 / moveIntervalRef.current)}`, 16, 42, { font: "11px monospace", color: "#6b6b78" });
      }

      updateParticles(ctx, particlesRef.current, dt);

      // START
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Hackathon Snake", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "15px sans-serif";
        ctx.fillText("Eat the tech stack, grow your team", CANVAS_W / 2, CANVAS_H / 2 - 8);
        if (bestScoreRef.current > 0) {
          ctx.fillStyle = "#3ecf8e";
          ctx.font = "14px monospace";
          ctx.fillText(`Best: ${bestScoreRef.current} pts`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        }
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(62,207,142,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("Arrow Keys · WASD · SPACE to Start", CANVAS_W / 2, CANVAS_H / 2 + 60);
        ctx.textAlign = "left";
      }

      // GAME OVER
      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Scope Creep Killed You", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 52px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Snake length: ${snakeRef.current.length}`, CANVAS_W / 2, CANVAS_H / 2 + 36);
        if (comboRef.current > 1) {
          ctx.fillStyle = "#3ecf8e";
          ctx.font = "13px sans-serif";
          ctx.fillText(`Max combo: x${comboRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 60);
        }
        const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("SPACE or ENTER to restart", CANVAS_W / 2, CANVAS_H / 2 + 96);
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
      gameId="hackathon-snake"
      title="Hackathon Snake"
      score={score}
      combo={combo}
      keyboardHints={["← → ↑ ↓ — Move", "WASD — Move", "SPACE — Start/Restart"]}
    >
      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
        onClick={() => {
          if (stateRef.current !== "playing") startGame();
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", width: "100%", height: "auto", cursor: "default" }}
        />
      </div>
    </GameLayout>
  );
}
