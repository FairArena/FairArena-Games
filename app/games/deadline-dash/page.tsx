"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout, TouchAction } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createBurstParticles, updateParticles,
  playScoreSound, playDeathSound, playPowerUpSound,
  fillBackground, drawText, createShake, applyShake, ShakeState,
} from "@/lib/gameUtils";

const CANVAS_W = 800, CANVAS_H = 520;
type GS = "start" | "playing" | "over";

const TASKS = [
  "Fix CORS error", "Write README", "Add demo video", "Deploy to Vercel",
  "Update .env.example", "Write API docs", "Add screenshots", "Test on mobile",
  "Check memory leaks", "Add error handling", "Remove console.logs", "Commit changes",
  "Tag v1.0.0", "Set up CI", "Add LICENSE file", "Create slide deck",
  "Run lighthouse", "Fix 404 page", "Add loading states", "Optimise images",
  "Check bundle size", "Add meta tags", "Sanitise inputs", "Add rate limiting",
];

interface Task {
  id: number; text: string; x: number; y: number; speed: number;
  progress: number; // 0..1, tap to increase
  taps: number; maxTaps: number; complete: boolean; color: string;
}

const TASK_COLORS = ["#7c6af7", "#3ecf8e", "#ecc94b", "#4db6f4", "#e53e83"];

const TOTAL_TIME = 90; // seconds (simulates "90 mins to demo day")

export default function DeadlineDashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GS>("start");
  const [gameState, setGameState] = useState<GS>("start");
  const [score, setScore] = useState(0);
  const addScore = useLeaderboard(s => s.addScore);
  const getPersonalBest = useLeaderboard(s => s.getPersonalBest);

  const tasksRef = useRef<Task[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity:0,duration:0,elapsed:0,active:false });
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(TOTAL_TIME * 1000);
  const spawnTimerRef = useRef(0);
  const spawnIntervalRef = useRef(3000);
  const idRef = useRef(0);
  const rafRef = useRef<number|null>(null);
  const lastTimeRef = useRef(0);
  const panicRef = useRef(false); // last 20 seconds

  const startGame = useCallback(() => {
    tasksRef.current = []; particlesRef.current = [];
    scoreRef.current = 0; timeLeftRef.current = TOTAL_TIME * 1000;
    spawnTimerRef.current = 0; spawnIntervalRef.current = 3000; idRef.current = 0;
    panicRef.current = false;
    setScore(0); stateRef.current = "playing"; setGameState("playing");
  }, []);

  function spawnTask() {
    const text = TASKS[Math.floor(Math.random() * TASKS.length)];
    const maxTaps = 2 + Math.floor(Math.random() * 3);
    tasksRef.current.push({
      id: idRef.current++, text, maxTaps, taps: 0, progress: 0, complete: false,
      x: 60 + Math.random() * (CANVAS_W - 200),
      y: -50, speed: 0.6 + Math.random() * 0.5,
      color: TASK_COLORS[Math.floor(Math.random() * TASK_COLORS.length)],
    });
  }

  function tapTask(x: number, y: number) {
    if (stateRef.current !== "playing") return;
    for (let i = tasksRef.current.length - 1; i >= 0; i--) {
      const t = tasksRef.current[i];
      if (t.complete) continue;
      if (x > t.x - 10 && x < t.x + 180 && y > t.y && y < t.y + 56) {
        t.taps++;
        t.progress = t.taps / t.maxTaps;
        if (t.taps >= t.maxTaps) {
          t.complete = true;
          scoreRef.current += 50 + Math.floor(timeLeftRef.current / 1000) * 2;
          setScore(scoreRef.current);
          playScoreSound();
          createBurstParticles(particlesRef.current, t.x + 90, t.y + 28, [t.color, "#fff"], 14);
        } else playPowerUpSound();
        break;
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const handleClick = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      tapTask((e.clientX-r.left)*(CANVAS_W/r.width), (e.clientY-r.top)*(CANVAS_H/r.height));
      if (stateRef.current !== "playing") startGame();
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      Array.from(e.changedTouches).forEach(t => {
        tapTask((t.clientX-r.left)*(CANVAS_W/r.width), (t.clientY-r.top)*(CANVAS_H/r.height));
      });
    };
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    const handleKey = (e: KeyboardEvent) => {
      if ((e.code === "Enter" || e.code === "Space") && stateRef.current !== "playing") startGame();
    };
    window.addEventListener("keydown", handleKey);

    function loop(ts: number) {
      const dt = Math.min(ts - lastTimeRef.current, 50);
      lastTimeRef.current = ts;
      ctx.save();
      if (shakeRef.current.active) shakeRef.current = applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      if (stateRef.current === "playing") {
        timeLeftRef.current -= dt;
        panicRef.current = timeLeftRef.current < 20000;
        if (timeLeftRef.current <= 0) {
          stateRef.current = "over"; setGameState("over");
          playDeathSound();
          addScore("deadline-dash", { score: scoreRef.current, date: new Date().toISOString(), combo: 1 });
        }

        // Background flash in panic
        if (panicRef.current && Math.sin(Date.now() * 0.015) > 0.7) {
          ctx.fillStyle = "rgba(245,101,101,0.04)"; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Timer bar
        const pct = timeLeftRef.current / (TOTAL_TIME * 1000);
        ctx.fillStyle = "#1c1c21"; ctx.fillRect(0, 0, CANVAS_W, 6);
        ctx.fillStyle = pct > 0.4 ? "#3ecf8e" : pct > 0.2 ? "#ecc94b" : "#f56565";
        ctx.fillRect(0, 0, CANVAS_W * pct, 6);

        // Timer label
        const secs = Math.ceil(timeLeftRef.current / 1000);
        ctx.fillStyle = pct < 0.2 ? "#f56565" : "#6b6b78";
        ctx.font = `bold ${pct < 0.2 ? 18 : 14}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(`${secs}s  ・  Demo Day Countdown`, CANVAS_W/2, 28);

        // Spawn
        spawnTimerRef.current += dt;
        if (spawnTimerRef.current >= spawnIntervalRef.current && tasksRef.current.filter(t=>!t.complete).length < 6) {
          spawnTimerRef.current = 0;
          spawnIntervalRef.current = Math.max(1200, 3000 - scoreRef.current * 2);
          spawnTask();
        }

        // Update/draw tasks
        for (let i = tasksRef.current.length-1; i >= 0; i--) {
          const t = tasksRef.current[i];
          if (!t.complete) t.y += t.speed * (dt / 16.67);
          else { t.y -= 2 * (dt/16.67); }
          if (t.y > CANVAS_H + 20) {
            if (!t.complete) {
              shakeRef.current = createShake(3, 200);
              scoreRef.current = Math.max(0, scoreRef.current - 20);
              setScore(scoreRef.current);
            }
            tasksRef.current.splice(i, 1); continue;
          }
          if (t.y < -80) { tasksRef.current.splice(i, 1); continue; }

          const alpha = t.complete ? Math.max(0, (t.y + 80) / 80) : 1;
          ctx.globalAlpha = alpha;
          // Card
          ctx.fillStyle = t.complete ? "#141417" : "#141421";
          ctx.strokeStyle = t.color + (t.complete ? "40" : "80");
          ctx.lineWidth = 1.5;
          ctx.fillRect(t.x, t.y, 180, 56);
          ctx.strokeRect(t.x, t.y, 180, 56);
          // Header stripe
          ctx.fillStyle = t.color + "20";
          ctx.fillRect(t.x, t.y, 6, 56);
          // Text
          ctx.fillStyle = t.complete ? "#3a3a45" : "#e8e8ec";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(t.complete ? "✓ Done!" : t.text.slice(0, 20), t.x + 16, t.y + 22);
          // Progress bar
          if (!t.complete) {
            ctx.fillStyle = "#1c1c21";
            ctx.fillRect(t.x + 16, t.y + 34, 148, 8);
            ctx.fillStyle = t.color;
            ctx.fillRect(t.x + 16, t.y + 34, 148 * t.progress, 8);
            ctx.fillStyle = "#6b6b78";
            ctx.font = "9px monospace";
            ctx.fillText(`TAP ×${t.maxTaps - t.taps}`, t.x + 16, t.y + 48);
          }
          ctx.globalAlpha = 1;
        }

        // Score
        ctx.textAlign = "right";
        ctx.fillStyle = "#e8e8ec"; ctx.font = "bold 20px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W-16, 52);
        ctx.fillStyle = "#6b6b78"; ctx.font = "10px monospace";
        ctx.fillText("PTS", CANVAS_W-16, 66);
        ctx.textAlign = "left";
      }

      updateParticles(ctx, particlesRef.current, dt);

      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.85)"; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle = "#e8e8ec"; ctx.font = "bold 40px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("Deadline Dash", CANVAS_W/2, CANVAS_H/2-50);
        ctx.fillStyle = "#6b6b78"; ctx.font = "15px sans-serif";
        ctx.fillText("TAP tasks to complete them before demo day!", CANVAS_W/2, CANVAS_H/2-10);
        ctx.fillText("Missed tasks cost -20 pts · You have 90 seconds", CANVAS_W/2, CANVAS_H/2+16);
        const p = 0.5 + Math.sin(Date.now()*0.003)*0.5;
        ctx.fillStyle = `rgba(245,101,101,${p})`; ctx.font = "bold 14px sans-serif";
        ctx.fillText("TAP to Start", CANVAS_W/2, CANVAS_H/2+60); ctx.textAlign="left";
      }

      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.88)"; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle = "#f56565"; ctx.font = "bold 36px sans-serif"; ctx.textAlign="center";
        ctx.fillText("Demo Day is HERE!", CANVAS_W/2, CANVAS_H/2-50);
        ctx.fillStyle = "#e8e8ec"; ctx.font = "bold 52px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W/2, CANVAS_H/2+10);
        ctx.fillStyle = "#6b6b78"; ctx.font = "14px sans-serif";
        ctx.fillText("points scored", CANVAS_W/2, CANVAS_H/2+36);
        const p = 0.5+Math.sin(Date.now()*0.004)*0.5;
        ctx.fillStyle=`rgba(232,232,236,${p})`; ctx.font="bold 13px sans-serif";
        ctx.fillText("TAP to restart", CANVAS_W/2, CANVAS_H/2+80); ctx.textAlign="left";
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleTouch);
      window.removeEventListener("keydown", handleKey);
    };
  }, [addScore, startGame]);

  return (
    <GameLayout gameId="deadline-dash" title="Deadline Dash" score={score}
      keyboardHints={["CLICK tasks to complete them", "Tasks at bottom = -20 pts", "90 seconds to demo day!"]}
      touchControls={<TouchAction label="TAP TASK" color="#f56565" onPress={() => setScore(s=>s)} />}
    >
      <div className="game-canvas-wrapper">
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
          style={{ display:"block", width:"100%", height:"auto" }} />
      </div>
    </GameLayout>
  );
}
