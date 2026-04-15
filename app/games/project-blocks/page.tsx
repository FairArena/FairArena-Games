"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createParticles, createBurstParticles, updateParticles,
  playScoreSound, playDeathSound, playPowerUpSound,
  fillBackground, drawText, drawRoundedRect, createShake, applyShake, ShakeState,
} from "@/lib/gameUtils";

const CANVAS_W = 500;
const CANVAS_H = 600;
const COLS = 10;
const ROWS = 20;
const CELL = CANVAS_W / COLS;
const BOARD_W = COLS * CELL;

type Piece = number[][];
type Color = string;

const PIECES: { shape: Piece; color: Color; name: string }[] = [
  { shape: [[1, 1, 1, 1]], color: "#4db6f4", name: "API Endpoint" },
  { shape: [[1, 1], [1, 1]], color: "#7c6af7", name: "Auth Module" },
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#3ecf8e", name: "Dashboard" },
  { shape: [[1, 0], [1, 1], [0, 1]], color: "#f56565", name: "Bug Fix" },
  { shape: [[0, 1], [1, 1], [1, 0]], color: "#e53e83", name: "Tech Debt" },
  { shape: [[1, 0], [1, 0], [1, 1]], color: "#ecc94b", name: "Frontend" },
  { shape: [[0, 1], [0, 1], [1, 1]], color: "#4db6f4", name: "Backend" },
];

interface ActivePiece {
  shape: Piece;
  color: Color;
  name: string;
  x: number;
  y: number;
  ghostY: number;
}

type GameState = "start" | "playing" | "over";

function createEmptyBoard(): (Color | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function rotatePiece(piece: Piece): Piece {
  const rows = piece.length, cols = piece[0].length;
  return Array.from({ length: cols }, (_, r) =>
    Array.from({ length: rows }, (_, c) => piece[rows - 1 - c][r])
  );
}

export default function ProjectBlocksPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<(Color | null)[][]>(createEmptyBoard());
  const activeRef = useRef<ActivePiece | null>(null);
  const heldRef = useRef<{ shape: Piece; color: Color; name: string } | null>(null);
  const nextPiecesRef = useRef<Array<{ shape: Piece; color: Color; name: string }>>([]);
  const canHoldRef = useRef(true);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const dropTimerRef = useRef(0);
  const dropIntervalRef = useRef(800);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const flashRowsRef = useRef<Set<number>>(new Set());
  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  function randomPiece() {
    return { ...PIECES[Math.floor(Math.random() * PIECES.length)] };
  }

  function getGhostY(piece: ActivePiece): number {
    let y = piece.y;
    while (canPlace(piece.shape, piece.x, y + 1)) y++;
    return y;
  }

  function canPlace(shape: Piece, x: number, y: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && boardRef.current[ny][nx]) return false;
      }
    }
    return true;
  }

  function spawnPiece() {
    if (nextPiecesRef.current.length < 4) {
      while (nextPiecesRef.current.length < 4) nextPiecesRef.current.push(randomPiece());
    }
    const p = nextPiecesRef.current.shift()!;
    nextPiecesRef.current.push(randomPiece());
    const startX = Math.floor((COLS - p.shape[0].length) / 2);
    const piece: ActivePiece = { ...p, x: startX, y: -1, ghostY: 0 };
    piece.ghostY = getGhostY(piece);

    if (!canPlace(piece.shape, piece.x, piece.y)) {
      endGame();
      return;
    }
    activeRef.current = piece;
    canHoldRef.current = true;
  }

  function lockPiece() {
    const piece = activeRef.current;
    if (!piece) return;
    const board = boardRef.current;
    piece.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        const ny = piece.y + r;
        if (ny >= 0) board[ny][piece.x + c] = piece.color;
      });
    });

    // Clear lines
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (board[r].every(Boolean)) fullRows.push(r);
    }

    if (fullRows.length > 0) {
      flashRowsRef.current = new Set(fullRows);
      const pts = [0, 100, 300, 500, 800][fullRows.length] * levelRef.current;
      scoreRef.current += pts;
      linesRef.current += fullRows.length;
      levelRef.current = 1 + Math.floor(linesRef.current / 10);
      dropIntervalRef.current = Math.max(100, 800 - (levelRef.current - 1) * 70);
      setScore(scoreRef.current);
      playScoreSound();

      fullRows.forEach(r => {
        for (let c = 0; c < COLS; c++) {
          createParticles(particlesRef.current, c * CELL + CELL / 2, r * CELL + CELL / 2, board[r][c] ?? "#7c6af7", 3);
        }
      });

      setTimeout(() => {
        flashRowsRef.current = new Set();
        fullRows.sort((a, b) => b - a).forEach(r => {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(null));
        });
      }, 150);
    }

    activeRef.current = null;
    setTimeout(spawnPiece, 50);
  }

  function endGame() {
    stateRef.current = "over";
    setGameState("over");
    playDeathSound();
    shakeRef.current = createShake(4, 400);
    addScore("project-blocks", { score: scoreRef.current, date: new Date().toISOString(), combo: levelRef.current });
  }

  const startGame = useCallback(() => {
    boardRef.current = createEmptyBoard();
    activeRef.current = null;
    heldRef.current = null;
    nextPiecesRef.current = [];
    particlesRef.current = [];
    flashRowsRef.current = new Set();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    dropIntervalRef.current = 800;
    dropTimerRef.current = 0;
    setScore(0);
    stateRef.current = "playing";
    setGameState("playing");
    while (nextPiecesRef.current.length < 4) nextPiecesRef.current.push(randomPiece());
    spawnPiece();
  }, []);

  function hold() {
    if (!canHoldRef.current || !activeRef.current) return;
    canHoldRef.current = false;
    const current = activeRef.current;
    if (heldRef.current) {
      const prev = heldRef.current;
      heldRef.current = { shape: current.shape, color: current.color, name: current.name };
      const nx = Math.floor((COLS - prev.shape[0].length) / 2);
      activeRef.current = { ...prev, x: nx, y: -1, ghostY: 0 };
      activeRef.current.ghostY = getGhostY(activeRef.current);
    } else {
      heldRef.current = { shape: current.shape, color: current.color, name: current.name };
      activeRef.current = null;
      spawnPiece();
    }
  }

  function moveActive(dx: number) {
    const p = activeRef.current;
    if (!p || !canPlace(p.shape, p.x + dx, p.y)) return;
    p.x += dx;
    p.ghostY = getGhostY(p);
  }

  function rotateActive() {
    const p = activeRef.current;
    if (!p) return;
    const rotated = rotatePiece(p.shape);
    // Wall kick
    for (const kick of [0, -1, 1, -2, 2]) {
      if (canPlace(rotated, p.x + kick, p.y)) {
        p.shape = rotated;
        p.x += kick;
        p.ghostY = getGhostY(p);
        return;
      }
    }
  }

  function hardDrop() {
    const p = activeRef.current;
    if (!p) return;
    const bonus = (p.ghostY - p.y) * 2;
    scoreRef.current += bonus;
    setScore(scoreRef.current);
    p.y = p.ghostY;
    lockPiece();
  }

  function softDrop() {
    const p = activeRef.current;
    if (!p) return;
    if (canPlace(p.shape, p.x, p.y + 1)) {
      p.y++;
      scoreRef.current++;
      dropTimerRef.current = 0;
    } else {
      lockPiece();
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (stateRef.current !== "playing") {
        if (e.code === "Enter" || e.code === "Space") startGame();
        return;
      }
      switch (e.code) {
        case "ArrowLeft": e.preventDefault(); moveActive(-1); break;
        case "ArrowRight": e.preventDefault(); moveActive(1); break;
        case "ArrowUp": e.preventDefault(); rotateActive(); break;
        case "ArrowDown": e.preventDefault(); softDrop(); break;
        case "Space": e.preventDefault(); hardDrop(); break;
        case "KeyC": hold(); break;
        case "KeyR": rotateActive(); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const SX = 80; // sidebar width for hold/next

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      ctx.save();
      if (shakeRef.current.active) applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      // Drop timer
      if (stateRef.current === "playing" && activeRef.current) {
        dropTimerRef.current += dt;
        if (dropTimerRef.current >= dropIntervalRef.current) {
          dropTimerRef.current = 0;
          const p = activeRef.current;
          if (canPlace(p.shape, p.x, p.y + 1)) p.y++;
          else lockPiece();
        }
      }

      // Draw board background
      ctx.fillStyle = "#0e0e12";
      ctx.fillRect(SX, 0, BOARD_W, ROWS * CELL);
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 0.5;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(SX, r * CELL); ctx.lineTo(SX + BOARD_W, r * CELL); ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(SX + c * CELL, 0); ctx.lineTo(SX + c * CELL, ROWS * CELL); ctx.stroke();
      }

      // Draw board cells
      const board = boardRef.current;
      board.forEach((row, r) => {
        const isFlash = flashRowsRef.current.has(r);
        row.forEach((color, c) => {
          if (!color && !isFlash) return;
          const bg = isFlash ? "#e8e8ec" : color!;
          ctx.fillStyle = bg;
          ctx.fillRect(SX + c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
        });
      });

      // Draw ghost piece
      const p = activeRef.current;
      if (p && stateRef.current === "playing") {
        p.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (!cell) return;
            const gy = p.ghostY + r;
            if (gy < 0) return;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.18;
            ctx.fillRect(SX + (p.x + c) * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 1;
          });
        });

        // Draw active piece
        p.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (!cell) return;
            const ny = p.y + r;
            if (ny < 0) return;
            ctx.fillStyle = p.color;
            ctx.fillRect(SX + (p.x + c) * CELL + 1, ny * CELL + 1, CELL - 2, CELL - 2);
          });
        });
      }

      // Sidebar: Hold
      ctx.fillStyle = "#141417";
      ctx.fillRect(0, 0, SX - 4, 80);
      ctx.fillStyle = "#6b6b78";
      ctx.font = "9px monospace";
      ctx.fillText("HOLD", 4, 16);
      if (heldRef.current) {
        heldRef.current.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (!cell) return;
            ctx.fillStyle = canHoldRef.current ? heldRef.current!.color : "#2a2a35";
            ctx.fillRect(4 + c * 16, 22 + r * 16, 14, 14);
          });
        });
      }

      // Sidebar: Next
      ctx.fillStyle = "#6b6b78";
      ctx.font = "9px monospace";
      ctx.fillText("NEXT", 4, 100);
      nextPiecesRef.current.slice(0, 3).forEach((np, ni) => {
        np.shape.forEach((row, r) => {
          row.forEach((cell, c) => {
            if (!cell) return;
            ctx.fillStyle = np.color;
            ctx.fillRect(4 + c * 14, 108 + ni * 52 + r * 14, 12, 12);
          });
        });
      });

      // HUD right of board
      const hx = SX + BOARD_W + 8;
      drawText(ctx, "SCORE", hx, 20, { font: "9px monospace", color: "#6b6b78" });
      drawText(ctx, scoreRef.current.toLocaleString(), hx, 40, { font: "bold 14px monospace", color: "#e8e8ec" });
      drawText(ctx, "LINES", hx, 66, { font: "9px monospace", color: "#6b6b78" });
      drawText(ctx, linesRef.current.toString(), hx, 84, { font: "bold 14px monospace", color: "#e8e8ec" });
      drawText(ctx, "LEVEL", hx, 110, { font: "9px monospace", color: "#6b6b78" });
      drawText(ctx, levelRef.current.toString(), hx, 128, { font: "bold 18px monospace", color: "#7c6af7" });

      updateParticles(ctx, particlesRef.current, dt);

      // START
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.82)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Project Blocks", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "13px sans-serif";
        ctx.fillText("← → Move · ↑ Rotate · ↓ Soft drop", CANVAS_W / 2, CANVAS_H / 2 - 4);
        ctx.fillText("SPACE Hard drop · C Hold", CANVAS_W / 2, CANVAS_H / 2 + 18);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(124,106,247,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("SPACE to Start", CANVAS_W / 2, CANVAS_H / 2 + 60);
        ctx.textAlign = "left";
      }

      // GAME OVER
      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 32px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Stack Overflow!", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 44px monospace";
        ctx.fillText(scoreRef.current.toLocaleString(), CANVAS_W / 2, CANVAS_H / 2 + 8);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "12px sans-serif";
        ctx.fillText(`${linesRef.current} lines · Level ${levelRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 34);
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
    };
  }, [addScore, startGame]);

  return (
    <GameLayout
      gameId="project-blocks"
      title="Project Blocks"
      score={score}
      keyboardHints={["← → — Move", "↑ / R — Rotate", "↓ — Soft Drop", "⎵ SPACE — Hard Drop", "C — Hold"]}
    >
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", cursor: "default" }}
          onClick={() => stateRef.current !== "playing" && startGame()}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      </div>
    </GameLayout>
  );
}
