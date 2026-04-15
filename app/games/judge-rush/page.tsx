"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createParticles, updateParticles,
  playScoreSound, playDeathSound, playPowerUpSound,
  fillBackground, drawText, createShake, applyShake, ShakeState,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 520;
type GameState = "start" | "playing" | "over";

const CATEGORIES = [
  { label: "WEB", color: "#7c6af7", hints: ["html", "css", "react", "next", "vue", "svelte", "web"] },
  { label: "AI", color: "#3ecf8e", hints: ["ml", "llm", "gpt", "neural", "model", "bert", "tf"] },
  { label: "MOBILE", color: "#ecc94b", hints: ["ios", "android", "flutter", "rn", "swift", "kotlin"] },
  { label: "CHAIN", color: "#f56565", hints: ["nft", "eth", "sol", "dao", "defi", "web3", "crypto"] },
  { label: "HW", color: "#4db6f4", hints: ["iot", "robot", "sensor", "arduino", "pi", "drone"] },
];

const SUBMISSION_NAMES = [
  "AI-powered HTML Form", "React Dashboard for Hospitals", "NFT Marketplace built in Vue",
  "Flutter Fitness App", "Ethereum DeFi Protocol", "Neural Network on Arduino",
  "Next.js Social Platform", "Android IoT Controller", "GPT Chatbot Website",
  "Solana Wallet App", "ML Crop Disease Detector", "Drone Delivery System",
  "Web3 Gaming Platform", "LLM Code Assistant (React)", "Kotlin AR Navigator",
  "SwiftUI Health Tracker", "TensorFlow on Raspberry Pi", "CSS Art Generator",
];

interface Submission {
  id: number;
  name: string;
  category: number; // index into CATEGORIES
  x: number;
  y: number;
  speed: number;
  width: number;
}

interface SlotEffect {
  slotIdx: number;
  progress: number; // 0..1
  correct: boolean;
}

export default function JudgeRushPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(1);
  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const submissionsRef = useRef<Submission[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const comboRef = useRef(1);
  const correctRef = useRef(0);
  const frenzyRef = useRef(false);
  const frenzyTimerRef = useRef(0);
  const rubricLockRef = useRef<number | null>(null);
  const fastTrackRef = useRef(false);
  const fastTrackTimerRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const spawnIntervalRef = useRef(2500);
  const baseSpeedRef = useRef(1.2);
  const idCounterRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const slotEffectsRef = useRef<SlotEffect[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const bestScoreRef = useRef(0);

  const SLOT_W = CANVAS_W / 5;
  const SLOT_Y = CANVAS_H - 70;

  function spawnSubmission() {
    const cat = Math.floor(Math.random() * 5);
    const name = SUBMISSION_NAMES[Math.floor(Math.random() * SUBMISSION_NAMES.length)];
    submissionsRef.current.push({
      id: idCounterRef.current++,
      name,
      category: cat,
      x: SLOT_W * cat + SLOT_W / 2,
      y: -40,
      speed: baseSpeedRef.current * (fastTrackRef.current ? 0.4 : 1),
      width: 100,
    });
  }

  const startGame = useCallback(() => {
    submissionsRef.current = [];
    particlesRef.current = [];
    slotEffectsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 5;
    comboRef.current = 1;
    correctRef.current = 0;
    frenzyRef.current = false;
    frenzyTimerRef.current = 0;
    rubricLockRef.current = null;
    fastTrackRef.current = false;
    fastTrackTimerRef.current = 0;
    spawnTimerRef.current = 0;
    spawnIntervalRef.current = 2500;
    baseSpeedRef.current = 1.2;
    idCounterRef.current = 0;
    bestScoreRef.current = getPersonalBest("judge-rush");
    setScore(0); setLives(5); setCombo(1);
    stateRef.current = "playing";
    setGameState("playing");
  }, [getPersonalBest]);

  function handleSlotClick(slotIdx: number) {
    if (stateRef.current !== "playing") return;
    const submissions = submissionsRef.current;
    if (submissions.length === 0) return;

    // Find lowest submission near this slot
    let target: Submission | null = null;
    let maxY = -Infinity;
    for (const s of submissions) {
      const sSlot = Math.floor(s.x / SLOT_W);
      if (sSlot === slotIdx && s.y > maxY) {
        maxY = s.y;
        target = s;
      }
    }

    if (!target) return;

    const isCorrect = target.category === slotIdx || (frenzyRef.current) ||
      (rubricLockRef.current === slotIdx && target.category === slotIdx);

    if (isCorrect) {
      const bonus = frenzyRef.current ? 5 : 1;
      scoreRef.current += 10 * comboRef.current * bonus;
      comboRef.current = Math.min(comboRef.current + 1, 8);
      correctRef.current++;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      playScoreSound();
      createParticles(particlesRef.current, target.x, target.y, CATEGORIES[target.category].color, 12);
      slotEffectsRef.current.push({ slotIdx, progress: 0, correct: true });

      // Frenzy check
      if (correctRef.current % 50 === 0 && correctRef.current > 0) {
        frenzyRef.current = true;
        frenzyTimerRef.current = 10000;
        playPowerUpSound();
      }

      // Power-up drop
      if (Math.random() < 0.08) {
        if (Math.random() < 0.5) {
          rubricLockRef.current = Math.floor(Math.random() * 5);
          setTimeout(() => { rubricLockRef.current = null; }, 5000);
        } else {
          fastTrackRef.current = true;
          fastTrackTimerRef.current = 3000;
        }
      }

      // Speed up every 20 correct
      if (correctRef.current % 20 === 0) {
        baseSpeedRef.current = Math.min(baseSpeedRef.current + 0.2, 4);
        spawnIntervalRef.current = Math.max(spawnIntervalRef.current - 200, 600);
      }
    } else {
      livesRef.current -= 2;
      comboRef.current = 1;
      setLives(livesRef.current);
      setCombo(1);
      slotEffectsRef.current.push({ slotIdx, progress: 0, correct: false });
      shakeRef.current = createShake(3, 200);
      if (livesRef.current <= 0) {
        stateRef.current = "over";
        setGameState("over");
        playDeathSound();
        addScore("judge-rush", { score: scoreRef.current, date: new Date().toISOString(), combo: comboRef.current });
      }
    }

    submissionsRef.current = submissions.filter(s => s.id !== target!.id);
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.code === "Enter" || e.code === "Space") && stateRef.current !== "playing") {
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const handleClick = (e: MouseEvent) => {
      if (stateRef.current !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
      const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
      if (my > SLOT_Y) {
        const slotIdx = Math.floor(mx / SLOT_W);
        handleSlotClick(slotIdx);
      }
    };

    canvas.addEventListener("click", handleClick);

    function loop(timestamp: number) {
      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      ctx.save();
      if (shakeRef.current.active) applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      if (stateRef.current === "playing") {
        // Update timers
        if (frenzyRef.current) {
          frenzyTimerRef.current -= dt;
          if (frenzyTimerRef.current <= 0) frenzyRef.current = false;
          ctx.fillStyle = "rgba(236,201,75,0.04)";
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }
        if (fastTrackRef.current) {
          fastTrackTimerRef.current -= dt;
          if (fastTrackTimerRef.current <= 0) fastTrackRef.current = false;
        }

        // Spawn
        spawnTimerRef.current += dt;
        const maxActive = 3 + Math.floor(correctRef.current / 20);
        if (spawnTimerRef.current >= spawnIntervalRef.current && submissionsRef.current.length < Math.min(maxActive, 5)) {
          spawnTimerRef.current = 0;
          spawnSubmission();
        }

        // Update/draw submissions
        for (let i = submissionsRef.current.length - 1; i >= 0; i--) {
          const s = submissionsRef.current[i];
          const speed = fastTrackRef.current ? s.speed * 0.4 : s.speed;
          s.y += speed * (dt / 16.67);

          if (s.y > SLOT_Y - 20) {
            // Missed
            submissionsRef.current.splice(i, 1);
            livesRef.current--;
            comboRef.current = 1;
            setLives(livesRef.current);
            setCombo(1);
            shakeRef.current = createShake(3, 200);
            if (livesRef.current <= 0) {
              stateRef.current = "over";
              setGameState("over");
              playDeathSound();
              addScore("judge-rush", { score: scoreRef.current, date: new Date().toISOString(), combo: comboRef.current });
            }
            continue;
          }

          // Draw submission card
          const c = CATEGORIES[s.category];
          ctx.fillStyle = "#141417";
          ctx.strokeStyle = c.color;
          ctx.lineWidth = 1.5;
          const sw = 90, sh = 52;
          ctx.fillRect(s.x - sw / 2, s.y - sh / 2, sw, sh);
          ctx.strokeRect(s.x - sw / 2, s.y - sh / 2, sw, sh);
          ctx.fillStyle = c.color;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText(c.label, s.x, s.y - 10);
          ctx.fillStyle = "#a0a0b0";
          ctx.font = "8px sans-serif";
          const truncated = s.name.length > 14 ? s.name.slice(0, 14) + "…" : s.name;
          ctx.fillText(truncated, s.x, s.y + 4);
          ctx.fillText(c.hints[0] + "…", s.x, s.y + 16);
          ctx.textAlign = "left";
        }

        // Draw slots
        CATEGORIES.forEach((cat, i) => {
          const x = i * SLOT_W;
          const isLocked = rubricLockRef.current === i;
          ctx.fillStyle = `rgba(${hexToRgb(cat.color)},${isLocked ? "0.15" : "0.06"})`;
          ctx.fillRect(x + 2, SLOT_Y, SLOT_W - 4, 68);
          ctx.strokeStyle = isLocked ? cat.color : `rgba(${hexToRgb(cat.color)},0.4)`;
          ctx.lineWidth = isLocked ? 2 : 1;
          ctx.strokeRect(x + 2, SLOT_Y, SLOT_W - 4, 68);
          ctx.fillStyle = cat.color;
          ctx.font = `bold ${isLocked ? 13 : 11}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(cat.label, x + SLOT_W / 2, SLOT_Y + 40);
          if (isLocked) {
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.font = "9px sans-serif";
            ctx.fillText("🔒 LOCKED", x + SLOT_W / 2, SLOT_Y + 58);
          }
          ctx.textAlign = "left";
        });

        // Slot effects
        for (let i = slotEffectsRef.current.length - 1; i >= 0; i--) {
          const e = slotEffectsRef.current[i];
          e.progress += dt / 400;
          if (e.progress >= 1) { slotEffectsRef.current.splice(i, 1); continue; }
          ctx.fillStyle = e.correct
            ? `rgba(62,207,142,${0.3 * (1 - e.progress)})`
            : `rgba(245,101,101,${0.4 * (1 - e.progress)})`;
          ctx.fillRect(e.slotIdx * SLOT_W, SLOT_Y - 80 * e.progress, SLOT_W, 80);
        }

        // HUD
        drawText(ctx, `${scoreRef.current}`, 16, 28, { font: "bold 20px monospace", color: "#e8e8ec" });
        drawText(ctx, `❤ ${livesRef.current}`, 16, 50, { font: "13px sans-serif", color: "#f56565" });
        if (comboRef.current > 1) {
          ctx.fillStyle = "#3ecf8e";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(`x${comboRef.current}`, 16, 70);
        }
        if (frenzyRef.current) {
          ctx.fillStyle = "#ecc94b";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("⚡ FRENZY MODE ⚡", CANVAS_W / 2, 32);
          ctx.textAlign = "left";
        }
      }

      updateParticles(ctx, particlesRef.current, dt);

      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.8)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Judge Rush", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "15px sans-serif";
        ctx.fillText("Click the right category slot before submissions land!", CANVAS_W / 2, CANVAS_H / 2 - 4);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(236,201,75,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("CLICK to Start", CANVAS_W / 2, CANVAS_H / 2 + 48);
        ctx.textAlign = "left";
      }

      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Judging Complete!", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 52px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText(`Correct: ${correctRef.current} submissions`, CANVAS_W / 2, CANVAS_H / 2 + 38);
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
    };
  }, [addScore, startGame]);

  return (
    <GameLayout
      gameId="judge-rush"
      title="Judge Rush"
      score={score}
      lives={lives}
      maxLives={5}
      combo={combo}
      keyboardHints={["CLICK category slots — Judge submissions", "ENTER — Start/Restart"]}
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

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
