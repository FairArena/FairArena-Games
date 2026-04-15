"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createBurstParticles, updateParticles,
  playScoreSound, fillBackground, drawText, drawRoundedRect,
} from "@/lib/gameUtils";

const CANVAS_W = 600;
const CANVAS_H = 600;
const GRID_SIZE = 4;
const TILE_PADDING = 10;
const GRID_PADDING = 16;

const TILE_LABELS: Record<number, string> = {
  2: "Idea", 4: "Prototype", 8: "MVP", 16: "Demo",
  32: "Pitch", 64: "Polished", 128: "Award", 256: "Top10",
  512: "Finalist", 1024: "Winner", 2048: "GRAND\nPRIZE",
};

const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  2: { bg: "#1c1c21", text: "#6b6b78" },
  4: { bg: "#252530", text: "#8888a0" },
  8: { bg: "#2a2a42", text: "#a0a0c0" },
  16: { bg: "#32326a", text: "#c0c0e0" },
  32: { bg: "#3a3080", text: "#d0d0f0" },
  64: { bg: "#4a3faf", text: "#e0e0ff" },
  128: { bg: "#7c6af7", text: "#ffffff" },
  256: { bg: "#3ecf8e", text: "#0c2018" },
  512: { bg: "#2eb87e", text: "#0c2018" },
  1024: { bg: "#25a06e", text: "#0c2018" },
  2048: { bg: "#ecc94b", text: "#1a1000" },
};

type Grid = (number | null)[][];
type GameState = "playing" | "over" | "won";

function createEmpty(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function addRandom(grid: Grid): Grid {
  const empty: [number, number][] = [];
  grid.forEach((row, r) => row.forEach((cell, c) => { if (!cell) empty.push([r, c]); }));
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function slide(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let score = 0;
  let moved = false;
  const newGrid: Grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

  for (let r = 0; r < GRID_SIZE; r++) {
    const row = grid[r].filter(Boolean) as number[];
    const merged: number[] = [];
    let i = 0;
    while (i < row.length) {
      if (i + 1 < row.length && row[i] === row[i + 1]) {
        const val = row[i] * 2;
        merged.push(val);
        score += val;
        i += 2;
      } else {
        merged.push(row[i]);
        i++;
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      newGrid[r][c] = merged[c] ?? null;
    }
    if (JSON.stringify(newGrid[r]) !== JSON.stringify(grid[r])) moved = true;
  }

  return { grid: newGrid, score, moved };
}

function rotateGrid(grid: Grid): Grid {
  return Array.from({ length: GRID_SIZE }, (_, r) =>
    Array.from({ length: GRID_SIZE }, (_, c) => grid[GRID_SIZE - 1 - c][r])
  );
}

function move(grid: Grid, dir: "left" | "right" | "up" | "down"): { grid: Grid; score: number; moved: boolean } {
  let g = grid;
  let rotations = 0;
  if (dir === "right") rotations = 2;
  else if (dir === "up") rotations = 3;
  else if (dir === "down") rotations = 1;

  for (let i = 0; i < rotations; i++) g = rotateGrid(g);
  const result = slide(g);
  g = result.grid;
  const reverseRots = (4 - rotations) % 4;
  for (let i = 0; i < reverseRots; i++) g = rotateGrid(g);
  return { grid: g, score: result.score, moved: result.moved };
}

function hasNoMoves(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) return false;
      if (c + 1 < GRID_SIZE && grid[r][c] === grid[r][c + 1]) return false;
      if (r + 1 < GRID_SIZE && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

const TILE_SIZE = (CANVAS_W - GRID_PADDING * 2 - TILE_PADDING * (GRID_SIZE + 1)) / GRID_SIZE;

export default function Score2048Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Grid>(createEmpty());
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>("playing");
  const scoreRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const undoGridRef = useRef<Grid | null>(null);
  const undoScoreRef = useRef(0);
  const undoUsedRef = useRef(false);
  const moveCountRef = useRef(0);
  const labelAnimsRef = useRef<Array<{ r: number; c: number; val: number; timer: number }>>([]);
  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const startGame = useCallback(() => {
    let g = createEmpty();
    g = addRandom(g);
    g = addRandom(g);
    gridRef.current = g;
    scoreRef.current = 0;
    setScore(0);
    setGameState("playing");
    undoGridRef.current = null;
    undoUsedRef.current = false;
    moveCountRef.current = 0;
    particlesRef.current = [];
    labelAnimsRef.current = [];
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  function handleMove(dir: "left" | "right" | "up" | "down") {
    if (gameState !== "playing") return;
    undoGridRef.current = gridRef.current.map(r => [...r]);
    undoScoreRef.current = scoreRef.current;

    const result = move(gridRef.current, dir);
    if (!result.moved) return;

    gridRef.current = addRandom(result.grid);
    scoreRef.current += result.score;
    setScore(scoreRef.current);
    moveCountRef.current++;

    // Replenish undo every 50 moves
    if (moveCountRef.current % 50 === 0) undoUsedRef.current = false;

    if (result.score > 0) {
      playScoreSound();
      // Find merged cells for animation
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const val = gridRef.current[r][c];
          if (val && TILE_LABELS[val]) {
            labelAnimsRef.current.push({ r, c, val, timer: 600 });
          }
        }
      }
    }

    if (gridRef.current.some(row => row.some(v => v === 2048))) {
      setGameState("won");
      addScore("score-2048", { score: scoreRef.current, date: new Date().toISOString(), combo: 1 });
    } else if (hasNoMoves(gridRef.current)) {
      setGameState("over");
      addScore("score-2048", { score: scoreRef.current, date: new Date().toISOString(), combo: 1 });
    }
  }

  function handleUndo() {
    if (undoUsedRef.current || !undoGridRef.current) return;
    gridRef.current = undoGridRef.current;
    scoreRef.current = undoScoreRef.current;
    setScore(undoScoreRef.current);
    undoUsedRef.current = true;
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      };
      const dir = map[e.code];
      if (dir) { e.preventDefault(); handleMove(dir); }
      if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) handleUndo();
      if (e.code === "Enter" && gameState !== "playing") startGame();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, startGame]);

  function drawTile(ctx: CanvasRenderingContext2D, val: number, x: number, y: number, pulse = 1) {
    const colors = TILE_COLORS[val] ?? { bg: "#7c6af7", text: "#fff" };
    const s = TILE_SIZE * pulse;
    const ox = x + (TILE_SIZE - s) / 2;
    const oy = y + (TILE_SIZE - s) / 2;

    ctx.fillStyle = colors.bg;
    drawRoundedRect(ctx, ox, oy, s, s, 8);
    ctx.fill();

    // Grand Prize glow
    if (val === 2048) {
      ctx.strokeStyle = "rgba(236,201,75,0.4)";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, ox - 1, oy - 1, s + 2, s + 2, 9);
      ctx.stroke();
    }

    ctx.fillStyle = colors.text;
    const label = TILE_LABELS[val] ?? val.toString();
    const lines = label.split("\n");
    const fontSize = val >= 512 ? 9 : val >= 64 ? 11 : 13;
    ctx.font = `bold ${fontSize}px var(--font-space-grotesk, sans-serif)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, i) => {
      const lineY = oy + s / 2 + (i - (lines.length - 1) / 2) * (fontSize + 2);
      ctx.fillText(line, ox + s / 2, lineY);
    });
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      ctx.save();
      fillBackground(ctx, "#0c0c0e");

      // Grid background
      ctx.fillStyle = "#141417";
      drawRoundedRect(ctx, GRID_PADDING, GRID_PADDING, CANVAS_W - GRID_PADDING * 2, CANVAS_H - GRID_PADDING * 2, 12);
      ctx.fill();

      // Empty cells
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const x = GRID_PADDING + TILE_PADDING + c * (TILE_SIZE + TILE_PADDING);
          const y = GRID_PADDING + TILE_PADDING + r * (TILE_SIZE + TILE_PADDING);
          ctx.fillStyle = "#0e0e12";
          drawRoundedRect(ctx, x, y, TILE_SIZE, TILE_SIZE, 8);
          ctx.fill();
        }
      }

      // Tiles
      const grid = gridRef.current;
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const val = grid[r][c];
          if (!val) continue;
          const x = GRID_PADDING + TILE_PADDING + c * (TILE_SIZE + TILE_PADDING);
          const y = GRID_PADDING + TILE_PADDING + r * (TILE_SIZE + TILE_PADDING);

          // Grand prize pulse
          const pulse = val === 2048
            ? 1 + Math.sin(Date.now() * 0.004) * 0.03
            : 1;
          drawTile(ctx, val, x, y, pulse);

          // Label animation
          const anim = labelAnimsRef.current.find(a => a.r === r && a.c === c && a.val === val);
          if (anim) {
            anim.timer -= dt;
            const p = anim.timer / 600;
            ctx.fillStyle = TILE_COLORS[val]?.bg ?? "#7c6af7";
            ctx.globalAlpha = p * 0.6;
            ctx.font = "bold 9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(TILE_LABELS[val] ?? "", x + TILE_SIZE / 2, y - 5 - (1 - p) * 10);
            ctx.globalAlpha = 1;
            ctx.textAlign = "left";
            if (anim.timer <= 0) {
              labelAnimsRef.current = labelAnimsRef.current.filter(a => a !== anim);
            }
          }
        }
      }

      updateParticles(ctx, particlesRef.current, dt);

      // Overlays
      if (gameState === "won") {
        ctx.fillStyle = "rgba(12,12,14,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ecc94b";
        ctx.font = "bold 48px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("GRAND PRIZE!", CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "24px monospace";
        ctx.fillText(`Score: ${scoreRef.current.toLocaleString()}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "14px sans-serif";
        ctx.fillText("ENTER to play again", CANVAS_W / 2, CANVAS_H / 2 + 60);
        ctx.textAlign = "left";
      }

      if (gameState === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("No More Moves", CANVAS_W / 2, CANVAS_H / 2 - 30);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "24px monospace";
        ctx.fillText(`Score: ${scoreRef.current.toLocaleString()}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "14px sans-serif";
        ctx.fillText("ENTER to restart", CANVAS_W / 2, CANVAS_H / 2 + 60);
        ctx.textAlign = "left";
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameState]);

  // Touch swipe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let tx = 0, ty = 0;
    const ts = (e: TouchEvent) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; };
    const te = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy)) handleMove(dx > 0 ? "right" : "left");
      else handleMove(dy > 0 ? "down" : "up");
    };
    canvas.addEventListener("touchstart", ts);
    canvas.addEventListener("touchend", te);
    return () => {
      canvas.removeEventListener("touchstart", ts);
      canvas.removeEventListener("touchend", te);
    };
  }, [gameState]);

  return (
    <GameLayout
      gameId="score-2048"
      title="Score 2048"
      score={score}
      keyboardHints={["← → ↑ ↓ — Slide tiles", "Ctrl+Z — Undo (1x per 50 moves)", "ENTER — Restart", "Swipe — Mobile"]}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn-secondary"
            onClick={startGame}
            style={{ fontSize: "13px", padding: "6px 14px" }}
          >
            New Game
          </button>
          <button
            className="btn-secondary"
            onClick={handleUndo}
            style={{
              fontSize: "13px", padding: "6px 14px",
              opacity: undoUsedRef.current ? 0.4 : 1,
              cursor: undoUsedRef.current ? "not-allowed" : "pointer",
            }}
          >
            ↩ Undo
          </button>
        </div>
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      </div>
    </GameLayout>
  );
}
