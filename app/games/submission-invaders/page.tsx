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
  playPowerUpSound,
  fillBackground,
  drawText,
  rectIntersects,
  Rect,
} from "@/lib/gameUtils";

const CANVAS_W = 800;
const CANVAS_H = 520;

type GameState = "start" | "playing" | "over";

interface Enemy {
  row: number;
  col: number;
  alive: boolean;
  type: 0 | 1 | 2 | 3; // PDF, ZIP, ZIP, EXE
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
  playerOwned: boolean;
  pierce?: number;
}

interface Shield {
  x: number;
  y: number;
  blocks: boolean[][];
}

interface PowerUp {
  x: number;
  y: number;
  type: "pierce" | "bomb" | "blind";
  active: boolean;
}

interface Mothership {
  x: number;
  y: number;
  active: boolean;
  direction: 1 | -1;
}

const ENEMY_COLS = 10;
const ENEMY_ROWS = 4;
const ENEMY_W = 36;
const ENEMY_H = 28;

const ENEMY_COLORS = ["#6b6b78", "#ecc94b", "#ecc94b", "#f56565"];
const ENEMY_PTS = [10, 20, 20, 40];
const ENEMY_LABELS = ["PDF", "ZIP", "ZIP", "EXE"];

export default function SubmissionInvadersPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("start");
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(1);

  const addScore = useLeaderboard((s) => s.addScore);
  const getPersonalBest = useLeaderboard((s) => s.getPersonalBest);

  const enemiesRef = useRef<Enemy[]>([]);
  const playerRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H - 50 });
  const bulletsRef = useRef<Bullet[]>([]);
  const shieldsRef = useRef<Shield[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const mothershipRef = useRef<Mothership>({ x: -100, y: 40, active: false, direction: 1 });
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(1);
  const lastFireRef = useRef(0);
  const enemyDirRef = useRef<1 | -1>(1);
  const enemySpeedRef = useRef(1);
  const enemyDropRef = useRef(false);
  const enemyFireTimerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const blindModeRef = useRef(false);
  const bestScoreRef = useRef(0);

  function initGame() {
    const enemies: Enemy[] = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        const type = (row === 0 ? 3 : row <= 2 ? 1 : 0) as 0 | 1 | 2 | 3;
        enemies.push({
          row, col,
          alive: true,
          type,
          x: 80 + col * 64,
          y: 80 + row * 48,
        });
      }
    }
    enemiesRef.current = enemies;

    playerRef.current = { x: CANVAS_W / 2, y: CANVAS_H - 50 };
    bulletsRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];

    shieldsRef.current = [
      createShield(120),
      createShield(310),
      createShield(500),
    ];
    mothershipRef.current = { x: -100, y: 40, active: false, direction: 1 };
    scoreRef.current = 0;
    livesRef.current = 3;
    comboRef.current = 1;
    enemyDirRef.current = 1;
    enemySpeedRef.current = 1;
    enemyDropRef.current = false;
    blindModeRef.current = false;
    bestScoreRef.current = getPersonalBest("submission-invaders");
    setScore(0);
    setLives(3);
    setCombo(1);
  }

  function createShield(x: number): Shield {
    return {
      x,
      y: CANVAS_H - 110,
      blocks: Array.from({ length: 4 }, () => Array(8).fill(true)),
    };
  }

  const startGame = useCallback(() => {
    initGame();
    stateRef.current = "playing";
    setGameState("playing");
  }, []);

  useEffect(() => {
    bestScoreRef.current = getPersonalBest("submission-invaders");
  }, [getPersonalBest]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === "Space") {
        e.preventDefault();
        fireBullet();
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function fireBullet() {
    if (stateRef.current !== "playing") return;
    const now = Date.now();
    if (now - lastFireRef.current < 300) return;
    lastFireRef.current = now;
    bulletsRef.current.push({
      x: playerRef.current.x,
      y: playerRef.current.y - 20,
      playerOwned: true,
      pierce: 1,
    });
    try {
      const ac = new AudioContext();
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.frequency.value = 880;
      osc.type = "square";
      g.gain.setValueAtTime(0.05, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
      osc.start(); osc.stop(ac.currentTime + 0.1);
    } catch {}
  }

  function endGame() {
    stateRef.current = "over";
    setGameState("over");
    playDeathSound();
    shakeRef.current = createShake(6, 400);
    addScore("submission-invaders", {
      score: scoreRef.current,
      date: new Date().toISOString(),
      combo: comboRef.current,
    });
  }

  function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const color = ENEMY_COLORS[enemy.type];
    const label = blindModeRef.current ? "???" : ENEMY_LABELS[enemy.type];
    const t = Date.now() * 0.001;

    // File icon body
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(enemy.x - 12, enemy.y - 10, 24, 22);
    ctx.fillStyle = "#0c0c0e";
    ctx.fillRect(enemy.x + 4, enemy.y - 10, 8, 8);
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;

    // Label
    ctx.font = "bold 8px monospace";
    ctx.fillStyle = "#0c0c0e";
    ctx.textAlign = "center";
    ctx.fillText(label, enemy.x, enemy.y + 16);

    // Animated legs
    const legAnim = Math.sin(t * 5 + enemy.col) > 0 ? 3 : -3;
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - 12, enemy.y + 12 + legAnim, 4, 6);
    ctx.fillRect(enemy.x + 8, enemy.y + 12 - legAnim, 4, 6);
    ctx.textAlign = "left";
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
      if (shakeRef.current.active) {
        shakeRef.current = applyShake(ctx, shakeRef.current, dt);
      }

      fillBackground(ctx, "#0c0c0e");

      // Stars
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.05 + (i % 5) * 0.02})`;
        ctx.fillRect((i * 47 + 11) % CANVAS_W, (i * 31 + 7) % CANVAS_H, 1, 1);
      }

      if (stateRef.current === "playing") {
        // Player movement
        const speed = 4 * dtN;
        if (keysRef.current.has("ArrowLeft") || keysRef.current.has("KeyA")) {
          playerRef.current.x = Math.max(30, playerRef.current.x - speed);
        }
        if (keysRef.current.has("ArrowRight") || keysRef.current.has("KeyD")) {
          playerRef.current.x = Math.min(CANVAS_W - 30, playerRef.current.x + speed);
        }

        // Enemy formation movement
        const aliveEnemies = enemiesRef.current.filter(e => e.alive);
        if (aliveEnemies.length === 0) {
          endGame();
          ctx.restore();
          return;
        }

        let edgeReached = false;
        const totalEnemies = ENEMY_COLS * ENEMY_ROWS;
        enemySpeedRef.current = 1 + (1 - aliveEnemies.length / totalEnemies) * 3;

        aliveEnemies.forEach(e => {
          e.x += enemyDirRef.current * enemySpeedRef.current * dtN * 0.5;
          if (e.x > CANVAS_W - 30 || e.x < 30) edgeReached = true;
        });

        if (edgeReached) {
          enemyDirRef.current *= -1;
          aliveEnemies.forEach(e => { e.y += 20; });
          if (aliveEnemies.some(e => e.y > CANVAS_H - 80)) {
            endGame();
            ctx.restore();
            return;
          }
        }

        // Enemy fire
        enemyFireTimerRef.current += dt;
        const fireInterval = Math.max(800 - scoreRef.current * 5, 300);
        if (enemyFireTimerRef.current >= fireInterval && aliveEnemies.length > 0) {
          enemyFireTimerRef.current = 0;
          const shooter = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          bulletsRef.current.push({
            x: shooter.x, y: shooter.y + 15, playerOwned: false
          });
        }

        // Mothership
        if (!mothershipRef.current.active && Math.random() < 0.001) {
          mothershipRef.current = { x: -60, y: 40, active: true, direction: 1 };
        }
        if (mothershipRef.current.active) {
          mothershipRef.current.x += 2 * dtN;
          if (mothershipRef.current.x > CANVAS_W + 60) {
            mothershipRef.current.active = false;
          }
          // Draw
          ctx.fillStyle = "#e53e83";
          ctx.fillRect(mothershipRef.current.x - 30, 26, 60, 20);
          ctx.fillRect(mothershipRef.current.x - 20, 18, 40, 8);
          ctx.fillStyle = "#fff";
          ctx.font = "9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("SPAM WAVE", mothershipRef.current.x, 37);
          ctx.textAlign = "left";
        }

        // Update bullets
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
          const b = bulletsRef.current[i];
          b.y += (b.playerOwned ? -8 : 5) * dtN;

          if (b.y < 0 || b.y > CANVAS_H) {
            bulletsRef.current.splice(i, 1);
            continue;
          }

          // Draw bullet
          ctx.fillStyle = b.playerOwned ? "#7c6af7" : "#f56565";
          ctx.fillRect(b.x - 2, b.y - 6, 4, 12);

          // Check player bullet → enemy
          if (b.playerOwned) {
            // Mothership hit
            if (
              mothershipRef.current.active &&
              Math.abs(b.x - mothershipRef.current.x) < 35 &&
              Math.abs(b.y - 36) < 18
            ) {
              mothershipRef.current.active = false;
              scoreRef.current += 100 * comboRef.current;
              setScore(scoreRef.current);
              createParticles(particlesRef.current, mothershipRef.current.x, 36, "#e53e83", 20);
              playPowerUpSound();
              bulletsRef.current.splice(i, 1);
              continue;
            }

            // Enemy hit
            let hitEnemy = false;
            for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
              const e = enemiesRef.current[j];
              if (!e.alive) continue;
              if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 15) {
                e.alive = false;
                scoreRef.current += ENEMY_PTS[e.type] * comboRef.current;
                comboRef.current = Math.min(comboRef.current + 1, 4);
                setScore(scoreRef.current);
                setCombo(comboRef.current);
                playScoreSound();
                createParticles(particlesRef.current, e.x, e.y, ENEMY_COLORS[e.type], 12);

                // Power-up drop (20% chance)
                if (Math.random() < 0.2) {
                  const types: Array<"pierce" | "bomb" | "blind"> = ["pierce", "bomb", "blind"];
                  powerUpsRef.current.push({
                    x: e.x, y: e.y,
                    type: types[Math.floor(Math.random() * types.length)],
                    active: true,
                  });
                }

                if (b.pierce && b.pierce > 1) {
                  b.pierce--;
                } else {
                  bulletsRef.current.splice(i, 1);
                }
                hitEnemy = true;
                break;
              }
            }
            if (!hitEnemy) {
              // Shield hit
              for (const shield of shieldsRef.current) {
                const col = Math.floor((b.x - shield.x) / 8);
                const row = Math.floor((b.y - shield.y) / 8);
                if (row >= 0 && row < 4 && col >= 0 && col < 8 && shield.blocks[row]?.[col]) {
                  shield.blocks[row][col] = false;
                  bulletsRef.current.splice(i, 1);
                  break;
                }
              }
            }
          } else {
            // Enemy bullet → player
            if (Math.abs(b.x - playerRef.current.x) < 18 && Math.abs(b.y - playerRef.current.y) < 15) {
              livesRef.current--;
              setLives(livesRef.current);
              comboRef.current = 1;
              setCombo(1);
              bulletsRef.current.splice(i, 1);
              shakeRef.current = createShake(4, 200);
              if (livesRef.current <= 0) {
                endGame();
                ctx.restore();
                return;
              }
              continue;
            }
            // Enemy bullet → shield
            for (const shield of shieldsRef.current) {
              const col = Math.floor((b.x - shield.x) / 8);
              const row = Math.floor((b.y - shield.y) / 8);
              if (row >= 0 && row < 4 && col >= 0 && col < 8 && shield.blocks[row]?.[col]) {
                shield.blocks[row][col] = false;
                bulletsRef.current.splice(i, 1);
                break;
              }
            }
          }
        }

        // Power-ups
        for (let i = powerUpsRef.current.length - 1; i >= 0; i--) {
          const p = powerUpsRef.current[i];
          if (!p.active) continue;
          p.y += 1.5 * dtN;

          // Draw
          const label = p.type === "pierce" ? "🔍" : p.type === "bomb" ? "💣" : "🙈";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(label, p.x, p.y);
          ctx.textAlign = "left";

          if (Math.abs(p.x - playerRef.current.x) < 20 && Math.abs(p.y - playerRef.current.y) < 20) {
            p.active = false;
            playPowerUpSound();
            if (p.type === "pierce") {
              bulletsRef.current.push({
                x: playerRef.current.x, y: playerRef.current.y - 20,
                playerOwned: true, pierce: 3,
              });
            } else if (p.type === "bomb") {
              enemiesRef.current.forEach(e => {
                if (e.alive) {
                  e.alive = false;
                  scoreRef.current += ENEMY_PTS[e.type];
                  createParticles(particlesRef.current, e.x, e.y, ENEMY_COLORS[e.type], 6);
                }
              });
              setScore(scoreRef.current);
            } else if (p.type === "blind") {
              blindModeRef.current = true;
              setTimeout(() => { blindModeRef.current = false; }, 5000);
            }
          }

          if (p.y > CANVAS_H) powerUpsRef.current.splice(i, 1);
        }

        // Draw shields
        shieldsRef.current.forEach(shield => {
          shield.blocks.forEach((row, r) => {
            row.forEach((alive, c) => {
              if (!alive) return;
              ctx.fillStyle = "#3ecf8e";
              ctx.globalAlpha = 0.7;
              ctx.fillRect(shield.x + c * 8, shield.y + r * 8, 7, 7);
              ctx.globalAlpha = 1;
            });
          });
        });

        // Draw enemies
        enemiesRef.current.forEach(e => {
          if (e.alive) drawEnemy(ctx, e);
        });

        // Draw player
        const px = playerRef.current.x;
        const py = playerRef.current.y;
        ctx.fillStyle = "#7c6af7";
        ctx.fillRect(px - 20, py - 8, 40, 16);
        ctx.fillRect(px - 8, py - 20, 16, 12);
        ctx.fillStyle = "#5a49c5";
        ctx.fillRect(px - 4, py - 28, 8, 8);
      }

      // Particles
      updateParticles(ctx, particlesRef.current, dt);

      // Score
      drawText(ctx, `${scoreRef.current}`, 16, 30, { font: "bold 18px monospace", color: "#e8e8ec" });
      drawText(ctx, `☰ ${livesRef.current}`, 16, 54, { font: "13px sans-serif", color: "#6b6b78" });

      // START
      if (stateRef.current === "start") {
        ctx.fillStyle = "rgba(12,12,14,0.82)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 40px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("Submission Invaders", CANVAS_W / 2, CANVAS_H / 2 - 40);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "15px sans-serif";
        ctx.fillText("Defend the arena from SPAM", CANVAS_W / 2, CANVAS_H / 2 - 8);
        const pulse = 0.5 + Math.sin(Date.now() * 0.003) * 0.5;
        ctx.fillStyle = `rgba(124,106,247,${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("SPACE to Start · Arrow Keys to Move", CANVAS_W / 2, CANVAS_H / 2 + 50);
        ctx.textAlign = "left";
      }

      // GAME OVER
      if (stateRef.current === "over") {
        ctx.fillStyle = "rgba(12,12,14,0.85)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#f56565";
        ctx.font = "bold 36px var(--font-space-grotesk, sans-serif)";
        ctx.textAlign = "center";
        ctx.fillText("SPAM WAVE WINS", CANVAS_W / 2, CANVAS_H / 2 - 50);
        ctx.fillStyle = "#e8e8ec";
        ctx.font = "bold 52px monospace";
        ctx.fillText(scoreRef.current.toString(), CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillStyle = "#6b6b78";
        ctx.font = "14px sans-serif";
        ctx.fillText("pts", CANVAS_W / 2, CANVAS_H / 2 + 34);
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
  }, [endGame]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" && stateRef.current !== "playing") {
        startGame();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  return (
    <GameLayout
      gameId="submission-invaders"
      title="Submission Invaders"
      score={score}
      lives={lives}
      maxLives={3}
      combo={combo}
      keyboardHints={["← → — Move", "SPACE — Fire", "ENTER — Start/Restart"]}
    >
      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "block", width: "100%", height: "auto", cursor: "default" }}
          onClick={() => {
            if (stateRef.current !== "playing") startGame();
            else fireBullet();
          }}
        />
      </div>
    </GameLayout>
  );
}
