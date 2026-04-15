"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createBurstParticles, updateParticles,
  playScoreSound, playDeathSound, playPowerUpSound,
  fillBackground, drawText, createShake, applyShake, ShakeState, lerp,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 500;
const PADDLE_H = 80;
const PADDLE_W = 12;
const BALL_R = 7;
const SCORE_TO_WIN = 11;

type GameState = "start" | "playing" | "over";

interface PowerUp {
  x: number;
  y: number;
  type: "surge" | "speed" | "wide" | "curve";
  active: boolean;
  label: string;
  color: string;
}

const POWER_UP_CONFIGS: Record<PowerUp["type"], { label: string; color: string }> = {
  surge: { label: "SCORE SURGE", color: "#ecc94b" },
  speed: { label: "SPEED HACK", color: "#f56565" },
  wide: { label: "WIDE PADDLE", color: "#3ecf8e" },
  curve: { label: "CURVE BALL", color: "#7c6af7" },
};

export default function LeaderboardPongPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const addScore = useLeaderboard((s) => s.addScore);
  const addPongResult = useLeaderboard((s) => s.addPongResult);
  const getPongRecord = useLeaderboard((s) => s.getPongRecord);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const playerRef = useRef({ y: CANVAS_H / 2 - PADDLE_H / 2, score: 0, paddleH: PADDLE_H });
  const aiRef = useRef({ y: CANVAS_H / 2 - PADDLE_H / 2, score: 0, speed: 4 });
  const ballRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2, vx: 4, vy: 3, curve: 0 });
  const rallyCntRef = useRef(0);
  const maxRallyRef = useRef(0);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const scoreMultRef = useRef(1); // for score surge
  const speedHackTimerRef = useRef(0);
  const widePaddleTimerRef = useRef(0);
  const curveBallTimerRef = useRef(0);
  const powerUpSpawnTimerRef = useRef(0);

  const startGame = useCallback(() => {
    playerRef.current = { y: CANVAS_H / 2 - PADDLE_H / 2, score: 0, paddleH: PADDLE_H };
    aiRef.current = { y: CANVAS_H / 2 - PADDLE_H / 2, score: 0, speed: 4 };
    ballRef.current = { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: (Math.random() > 0.5 ? 4 : -4), vy: (Math.random() - 0.5) * 6, curve: 0 };
    rallyCntRef.current = 0; maxRallyRef.current = 0;
    powerUpsRef.current = []; particlesRef.current = [];
    scoreMultRef.current = 1; speedHackTimerRef.current = 0;
    widePaddleTimerRef.current = 0; curveBallTimerRef.current = 0;
    powerUpSpawnTimerRef.current = 0;
    setScore(0);
    stateRef.current = "playing";
    setGameState("playing");
  }, []);

  function resetBall(scoredLeft: boolean) {
    ballRef.current = {
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      vx: scoredLeft ? 4 : -4,
      vy: (Math.random() - 0.5) * 6,
      curve: 0,
    };
    rallyCntRef.current = 0;
    scoreMultRef.current = 1;
    speedHackTimerRef.current = 0;
    curveBallTimerRef.current = 0;
    widePaddleTimerRef.current = 0;
    playerRef.current.paddleH = PADDLE_H;
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if ((e.code === "Enter" || e.code === "Space") && stateRef.current !== "playing") {
        startGame();
      }
      if (e.code === "ArrowUp" || e.code === "ArrowDown") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [startGame]);

  // Mouse/touch control for player paddle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
      playerRef.current.y = Math.max(0, Math.min(CANVAS_H - playerRef.current.paddleH, my - playerRef.current.paddleH / 2));
    };
    const handleTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const my = (e.touches[0].clientY - rect.top) * (CANVAS_H / rect.height);
      playerRef.current.y = Math.max(0, Math.min(CANVAS_H - playerRef.current.paddleH, my - playerRef.current.paddleH / 2));
    };
    canvas.addEventListener("mousemove", handleMouse);
    canvas.addEventListener("touchmove", handleTouch);
    return () => {
      canvas.removeEventListener("mousemove", handleMouse);
      canvas.removeEventListener("touchmove", handleTouch);
    };
  }, []);

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

      // Center line
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      if (stateRef.current === "playing") {
        const player = playerRef.current;
        const ai = aiRef.current;
        const ball = ballRef.current;

        // Player keyboard control
        const PLAYER_SPEED = 6;
        if (keysRef.current.has("ArrowUp") || keysRef.current.has("KeyW")) {
          player.y = Math.max(0, player.y - PLAYER_SPEED * dtN);
        }
        if (keysRef.current.has("ArrowDown") || keysRef.current.has("KeyS")) {
          player.y = Math.min(CANVAS_H - player.paddleH, player.y + PLAYER_SPEED * dtN);
        }

        // AI
        const scoreDiff = player.score - ai.score;
        let aiTargetSpeed = ai.speed;
        if (scoreDiff >= 3) aiTargetSpeed = Math.min(ai.speed + 1, 8); // player winning
        else if (scoreDiff <= -3) aiTargetSpeed = Math.max(ai.speed - 1, 2); // AI winning

        const aiCenter = ai.y + PADDLE_H / 2;
        if (aiCenter < ball.y - 8) ai.y += aiTargetSpeed * dtN;
        else if (aiCenter > ball.y + 8) ai.y -= aiTargetSpeed * dtN;
        ai.y = Math.max(0, Math.min(CANVAS_H - PADDLE_H, ai.y));

        // Ball physics
        const speedScale = speedHackTimerRef.current > 0 ? 1.8 : 1;
        ball.x += ball.vx * dtN * speedScale;
        ball.y += (ball.vy + (curveBallTimerRef.current > 0 ? ball.curve : 0)) * dtN * speedScale;

        // Timers
        if (speedHackTimerRef.current > 0) speedHackTimerRef.current -= dt;
        if (widePaddleTimerRef.current > 0) {
          widePaddleTimerRef.current -= dt;
          if (widePaddleTimerRef.current <= 0) player.paddleH = PADDLE_H;
        }
        if (curveBallTimerRef.current > 0) curveBallTimerRef.current -= dt;

        // Wall bounce
        if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }
        if (ball.y + BALL_R > CANVAS_H) { ball.y = CANVAS_H - BALL_R; ball.vy = -Math.abs(ball.vy); }

        // Player paddle collision
        const playerX = 20;
        if (
          ball.x - BALL_R < playerX + PADDLE_W &&
          ball.x > playerX &&
          ball.y > player.y &&
          ball.y < player.y + player.paddleH
        ) {
          ball.vx = Math.abs(ball.vx) * 1.05;
          const relY = (ball.y - player.y) / player.paddleH - 0.5;
          ball.vy = relY * 10;
          ball.x = playerX + PADDLE_W + BALL_R;
          rallyCntRef.current++;
          maxRallyRef.current = Math.max(maxRallyRef.current, rallyCntRef.current);
          createBurstParticles(particlesRef.current, ball.x, ball.y, ["#7c6af7"],  6);
          playScoreSound();
        }

        // AI paddle collision
        const aiX = CANVAS_W - 20 - PADDLE_W;
        if (
          ball.x + BALL_R > aiX &&
          ball.x < aiX + PADDLE_W &&
          ball.y > ai.y &&
          ball.y < ai.y + PADDLE_H
        ) {
          ball.vx = -Math.abs(ball.vx) * 1.05;
          const relY = (ball.y - ai.y) / PADDLE_H - 0.5;
          ball.vy = relY * 10;
          ball.x = aiX - BALL_R;
          rallyCntRef.current++;
          maxRallyRef.current = Math.max(maxRallyRef.current, rallyCntRef.current);
        }

        // Cap speed
        const maxSpeed = 16;
        if (Math.abs(ball.vx) > maxSpeed) ball.vx = Math.sign(ball.vx) * maxSpeed;
        if (Math.abs(ball.vy) > maxSpeed) ball.vy = Math.sign(ball.vy) * maxSpeed;

        // Scoring
        if (ball.x < 0) {
          ai.score++;
          shakeRef.current = createShake(3, 200);
          playDeathSound();
          if (ai.score >= SCORE_TO_WIN) {
            stateRef.current = "over";
            setGameState("over");
            addPongResult(false);
            addScore("leaderboard-pong", { score: player.score * 100, date: new Date().toISOString(), combo: maxRallyRef.current });
          } else resetBall(true);
        }
        if (ball.x > CANVAS_W) {
          player.score++;
          setScore(player.score * 100 + rallyCntRef.current * 10);
          createBurstParticles(particlesRef.current, CANVAS_W - 40, ball.y, ["#3ecf8e", "#7c6af7"], 16);
          if (player.score >= SCORE_TO_WIN) {
            stateRef.current = "over";
            setGameState("over");
            addPongResult(true);
            addScore("leaderboard-pong", { score: player.score * 100 + maxRallyRef.current * 10, date: new Date().toISOString(), combo: maxRallyRef.current });
          } else resetBall(false);
        }

        // Power-ups
        powerUpSpawnTimerRef.current += dt;
        if (powerUpSpawnTimerRef.current >= 8000) {
          powerUpSpawnTimerRef.current = 0;
          const types: PowerUp["type"][] = ["surge", "speed", "wide", "curve"];
          const t = types[Math.floor(Math.random() * types.length)];
          powerUpsRef.current.push({
            x: CANVAS_W / 2 + (Math.random() - 0.5) * 200,
            y: 80 + Math.random() * (CANVAS_H - 160),
            type: t, active: true,
            ...POWER_UP_CONFIGS[t],
          });
        }

        for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
          const pu = powerUpsRef.current[i];
          const dist = Math.hypot(ball.x - pu.x, ball.y - pu.y);
          if (dist < 20) {
            powerUpsRef.current.splice(i, 1);
            playPowerUpSound();
            if (pu.type === "surge") scoreMultRef.current = 3;
            else if (pu.type === "speed") speedHackTimerRef.current = 5000;
            else if (pu.type === "wide") { widePaddleTimerRef.current = 5000; player.paddleH = PADDLE_H * 1.6; }
            else if (pu.type === "curve") { curveBallTimerRef.current = 5000; ball.curve = 0.3; }
            continue;
          }
          ctx.fillStyle = pu.color;
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.font = "7px monospace";
          ctx.textAlign = "center";
          ctx.fillText(pu.label.slice(0, 5), pu.x, pu.y + 3);
          ctx.textAlign = "left";
        }

        // Draw player
        ctx.fillStyle = "#7c6af7";
        ctx.fillRect(20, player.y, PADDLE_W, player.paddleH);
        if (widePaddleTimerRef.current > 0) {
          ctx.strokeStyle = "#3ecf8e";
          ctx.lineWidth = 1;
          ctx.strokeRect(20, player.y, PADDLE_W, player.paddleH);
        }

        // Draw AI
        ctx.fillStyle = "#f56565";
        ctx.fillRect(CANVAS_W - 20 - PADDLE_W, ai.y, PADDLE_W, PADDLE_H);

        // Draw ball
        ctx.fillStyle = speedHackTimerRef.current > 0 ? "#f56565" : "#e8e8ec";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();

        // Rally counter
        if (rallyCntRef.current >= 5) {
          ctx.fillStyle = "#ecc94b";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`RALLY x${rallyCntRef.current}`, CANVAS_W / 2, 24);
          ctx.textAlign = "left";
        }

        // Score display
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 48px monospace";
        ctx.textAlign = "center";
        ctx.fillText(player.score.toString(), CANVAS_W / 2 - 60, 60);
        ctx.fillStyle = "#6b6b78";
        ctx.fillText(ai.score.toString(), CANVAS_W / 2 + 60, 60);
        ctx.textAlign = "left";
      }

      updateParticles(ctx, particlesRef.current, dt);

      // Match record
      const record = getPongRecord();
      drawText(ctx, `W:${record.wins} L:${record.losses}`, CANVAS_W - 90, CANVAS_H - 10, { font: "10px monospace", color: "#2a2a35" });

      // START
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.82)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Leaderboard Pong", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText("First to 11 wins · Move mouse or ↑↓ keys", CANVAS_W / 2, CANVAS_H / 2 - 4);
        const r = getPongRecord();
        ctx.fillStyle = "#3ecf8e";
        ctx.font = "13px monospace";
        ctx.fillText(`Career: ${r.wins}W ${r.losses}L`, CANVAS_W / 2, CANVAS_H / 2 + 24);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(124,106,247,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("ENTER to Start", CANVAS_W / 2, CANVAS_H / 2 + 64);
        ctx.textAlign = "left";
      }

      // GAME OVER
      if (stateRef.current === "over") {
        const p = playerRef.current;
        const a = aiRef.current;
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        const won = p.score >= SCORE_TO_WIN;
        ctx.fillStyle = won ? "#3ecf8e" : "#f56565";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText(won ? "Victory!" : "Defeated", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 36px monospace";
        ctx.fillText(`${p.score} — ${a.score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "13px sans-serif";
        ctx.fillText(`Max rally: ${maxRallyRef.current}`, CANVAS_W / 2, CANVAS_H / 2 + 40);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(232,232,236,${pulse})`;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("ENTER for rematch", CANVAS_W / 2, CANVAS_H / 2 + 80);
        ctx.textAlign = "left";
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [addScore, addPongResult, getPongRecord, startGame]);

  return (
    <GameLayout
      gameId="leaderboard-pong"
      title="Leaderboard Pong"
      score={score}
      keyboardHints={["↑ ↓ or W S — Move paddle", "Mouse — Move paddle", "First to 11 wins"]}
    >
      <div
        style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", cursor: "none" }}
        onClick={() => stateRef.current !== "playing" && startGame()}
      >
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ display: "block", width: "100%", height: "auto" }} />
      </div>
    </GameLayout>
  );
}
