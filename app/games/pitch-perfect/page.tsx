"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { GameLayout, TouchAction } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import {
  Particle, createBurstParticles, updateParticles,
  playScoreSound, playDeathSound, playPowerUpSound, generateTone,
  fillBackground, createShake, applyShake, ShakeState,
} from "@/lib/gameUtils";

const CW = 400, CH = 600;
type GS = "start" | "show" | "input" | "over";

interface Pad {
  label: string; color: string; textColor: string;
  freq: number; type: OscillatorType; note: string;
}

const PADS: Pad[] = [
  { label: "🔥 MVP",       color: "#7c6af7", textColor: "#fff",    freq: 262, type: "sine",     note: "C4" },
  { label: "🚀 DEPLOY",    color: "#3ecf8e", textColor: "#041208", freq: 330, type: "sine",     note: "E4" },
  { label: "💡 IDEA",      color: "#ecc94b", textColor: "#0c0900", freq: 392, type: "triangle", note: "G4" },
  { label: "🏆 SUBMIT",    color: "#f56565", textColor: "#fff",    freq: 523, type: "sine",     note: "C5" },
];

export default function PitchPerfectPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GS>("start");
  const [gs, setGs] = useState<GS>("start");
  const [score, setScore] = useState(0);
  const addScore = useLeaderboard(s => s.addScore);

  const seq = useRef<number[]>([]); // sequence of pad indices
  const playerSeq = useRef<number[]>([]);
  const showIdxRef = useRef(0);
  const showTimerRef = useRef(0);
  const SHOW_STEP = 600;
  const activePadRef = useRef<number|null>(null);
  const activePadTimerRef = useRef(0);
  const roundRef = useRef(1);
  const scoreRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity:0,duration:0,elapsed:0,active:false });
  const rafRef = useRef<number|null>(null);
  const lastTimeRef = useRef(0);

  function playPad(idx: number, duration = 300) {
    const p = PADS[idx];
    generateTone(p.freq, duration, p.type, 0.18);
    activePadRef.current = idx;
    activePadTimerRef.current = duration;
  }

  const startGame = useCallback(() => {
    seq.current = [Math.floor(Math.random()*4)];
    playerSeq.current = []; showIdxRef.current = 0; showTimerRef.current = SHOW_STEP;
    roundRef.current = 1; scoreRef.current = 0;
    particlesRef.current = [];
    setScore(0);
    stateRef.current = "show"; setGs("show");
  }, []);

  function handlePadPress(idx: number) {
    if (stateRef.current !== "input") return;
    playPad(idx, 250);
    playerSeq.current.push(idx);
    const pos = playerSeq.current.length - 1;

    if (idx !== seq.current[pos]) {
      // Wrong
      shakeRef.current = createShake(5, 400);
      playDeathSound();
      stateRef.current = "over"; setGs("over");
      addScore("pitch-perfect", { score: scoreRef.current, date: new Date().toISOString(), combo: roundRef.current });
      return;
    }

    playScoreSound();
    if (playerSeq.current.length === seq.current.length) {
      // Round complete
      scoreRef.current += roundRef.current * 100;
      setScore(scoreRef.current);
      roundRef.current++;
      playPowerUpSound();
      createBurstParticles(particlesRef.current, CW/2, CH/2, PADS.map(p=>p.color), 20);
      // Next round after delay
      setTimeout(() => {
        seq.current.push(Math.floor(Math.random()*4));
        playerSeq.current = [];
        showIdxRef.current = 0;
        showTimerRef.current = SHOW_STEP;
        stateRef.current = "show"; setGs("show");
      }, 800);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const handleClick = (e: MouseEvent) => {
      if (stateRef.current === "start" || stateRef.current === "over") { startGame(); return; }
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX-r.left)*(CW/r.width);
      const my = (e.clientY-r.top)*(CH/r.height);
      const padIdx = getPadAt(mx, my);
      if (padIdx >= 0) handlePadPress(padIdx);
    };
    const handleTouch = (e: TouchEvent) => {
      e.preventDefault();
      if (stateRef.current === "start" || stateRef.current === "over") { startGame(); return; }
      const r = canvas.getBoundingClientRect();
      Array.from(e.changedTouches).forEach(t => {
        const padIdx = getPadAt((t.clientX-r.left)*(CW/r.width), (t.clientY-r.top)*(CH/r.height));
        if (padIdx >= 0) handlePadPress(padIdx);
      });
    };
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleTouch, {passive:false});
    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string,number> = { Digit1:0, Digit2:1, Digit3:2, Digit4:3, KeyQ:0, KeyW:1, KeyE:2, KeyR:3 };
      const idx = map[e.code];
      if (idx !== undefined && stateRef.current === "input") { handlePadPress(idx); return; }
      if ((e.code==="Enter"||e.code==="Space") && (stateRef.current==="start"||stateRef.current==="over")) startGame();
    };
    window.addEventListener("keydown", handleKey);

    function loop(ts: number) {
      const dt = Math.min(ts - lastTimeRef.current, 50);
      lastTimeRef.current = ts;
      ctx.save();
      if (shakeRef.current.active) shakeRef.current = applyShake(ctx, shakeRef.current, dt);
      fillBackground(ctx, "#0c0c0e");

      const PAD_W = CW/2 - 8, PAD_H = 120;
      const PAD_START_Y = 180;

      // Pads
      PADS.forEach((p, i) => {
        const col = i % 2, row = Math.floor(i/2);
        const px = col*(CW/2)+4, py = PAD_START_Y + row*(PAD_H+6);
        const isActive = activePadRef.current === i;
        const alpha = isActive ? 1 : 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = isActive ? p.color : p.color+"60";
        ctx.fillRect(px, py, PAD_W, PAD_H);
        if (isActive) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 20;
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.fillStyle = isActive ? p.textColor : "#e8e8ec";
        ctx.font = `bold ${isActive ? 22:20}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.label, px+PAD_W/2, py+PAD_H/2);
      });
      ctx.textBaseline = "alphabetic";

      // Timer for active pad
      if (activePadRef.current !== null) {
        activePadTimerRef.current -= dt;
        if (activePadTimerRef.current <= 0) activePadRef.current = null;
      }

      // Show sequence
      if (stateRef.current === "show") {
        showTimerRef.current -= dt;
        if (showTimerRef.current <= 0) {
          showTimerRef.current = SHOW_STEP;
          if (showIdxRef.current < seq.current.length) {
            playPad(seq.current[showIdxRef.current], 400);
            showIdxRef.current++;
          } else {
            activePadRef.current = null;
            stateRef.current = "input"; setGs("input");
          }
        }
      }

      // Top HUD
      ctx.textAlign = "left";
      ctx.fillStyle = "#e8e8ec"; ctx.font = "bold 18px monospace";
      ctx.fillText(`Round ${roundRef.current}`, 16, 36);
      ctx.fillStyle = "#7c6af7"; ctx.font = "bold 16px monospace";
      ctx.textAlign = "right";
      ctx.fillText(scoreRef.current.toString()+" pts", CW-16, 36);

      // Status bar
      const statusText = stateRef.current === "show"
        ? `▶  Watch (${seq.current.length - showIdxRef.current} left)`
        : stateRef.current === "input"
        ? `🎤 Your turn! (${seq.current.length - playerSeq.current.length} left)`
        : "";
      if (statusText) {
        ctx.fillStyle = stateRef.current === "input" ? "#3ecf8e" : "#ecc94b";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(statusText, CW/2, 100);
      }

      // Sequence dots
      ctx.textAlign = "center";
      const dotY = 130, dotSpacing = 14;
      const totalW = seq.current.length * dotSpacing;
      const startX = CW/2 - totalW/2 + dotSpacing/2;
      seq.current.forEach((padIdx, i) => {
        ctx.fillStyle = i < playerSeq.current.length ? PADS[padIdx].color : "#2a2a35";
        ctx.beginPath();
        ctx.arc(startX + i*dotSpacing, dotY, 4, 0, Math.PI*2);
        ctx.fill();
      });

      updateParticles(ctx, particlesRef.current, dt);

      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.85)"; ctx.fillRect(0,0,CW,CH);
        ctx.fillStyle = "#ecc94b"; ctx.font = "bold 38px sans-serif"; ctx.textAlign="center";
        ctx.fillText("Pitch Perfect", CW/2, CH/2-60);
        ctx.fillStyle = "#6b6b78"; ctx.font = "13px sans-serif";
        ctx.fillText("Repeat the hackathon pitch sequence", CW/2, CH/2-24);
        ctx.fillText("Watch the pads light up  ·  Then repeat", CW/2, CH/2+0);
        const p=0.5+Math.sin(Date.now()*0.003)*0.5;
        ctx.fillStyle = `rgba(236,201,75,${p})`;
        ctx.font="bold 14px sans-serif";
        ctx.fillText("TAP to Start", CW/2, CH/2+54);
      }

      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.88)"; ctx.fillRect(0,0,CW,CH);
        ctx.fillStyle = "#f56565"; ctx.font = "bold 34px sans-serif"; ctx.textAlign="center";
        ctx.fillText("Wrong pitch!", CW/2, CH/2-50);
        ctx.fillStyle="#e8e8ec"; ctx.font="bold 48px monospace";
        ctx.fillText(scoreRef.current.toString(), CW/2, CH/2+10);
        ctx.fillStyle="#6b6b78"; ctx.font="13px sans-serif";
        ctx.fillText(`Round ${roundRef.current} · TAP to retry`, CW/2, CH/2+44);
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

  function getPadAt(mx: number, my: number): number {
    const PAD_W = CW/2-8, PAD_H = 120, PAD_START_Y = 180;
    for (let i=0; i<4; i++) {
      const col = i%2, row = Math.floor(i/2);
      const px = col*(CW/2)+4, py = PAD_START_Y+row*(PAD_H+6);
      if (mx>=px && mx<=px+PAD_W && my>=py && my<=py+PAD_H) return i;
    }
    return -1;
  }

  return (
    <GameLayout gameId="pitch-perfect" title="Pitch Perfect" score={score}
      keyboardHints={["Watch pads light up", "1/2/3/4 or Q/W/E/R — tap pads", "Repeat the sequence!"]}
      touchControls={
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",width:"100%",maxWidth:"400px"}}>
          {PADS.map((p,i) => (
            <button key={i} className="btn-touch"
              onTouchStart={e=>{e.preventDefault();handlePadPress(i);}}
              onClick={()=>handlePadPress(i)}
              style={{background:p.color+"22",border:`1.5px solid ${p.color}55`,color:p.color,fontWeight:700,fontSize:"13px",minHeight:"52px"}}
            >{p.label}</button>
          ))}
        </div>
      }
    >
      <div className="game-canvas-wrapper" style={{maxWidth:"400px",margin:"0 auto"}}>
        <canvas ref={canvasRef} width={CW} height={CH} style={{display:"block",width:"100%",height:"auto"}} />
      </div>
    </GameLayout>
  );
}
