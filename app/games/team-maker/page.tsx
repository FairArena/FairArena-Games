"use client";
import React, { useState, useCallback, useEffect } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import { playScoreSound, playDeathSound, playPowerUpSound } from "@/lib/gameUtils";

// 24 cards = 12 pairs of hackathon co-founder roles
const CARD_PAIRS = [
  { id: "cto", emoji: "💻", label: "CTO" },
  { id: "ceo", emoji: "🎯", label: "CEO" },
  { id: "designer", emoji: "🎨", label: "Designer" },
  { id: "ml", emoji: "🤖", label: "ML Eng" },
  { id: "fullstack", emoji: "⚡", label: "Full Stack" },
  { id: "devops", emoji: "🐳", label: "DevOps" },
  { id: "pm", emoji: "📋", label: "Product" },
  { id: "mobile", emoji: "📱", label: "Mobile Dev" },
  { id: "data", emoji: "📊", label: "Data Sci" },
  { id: "sec", emoji: "🔐", label: "Security" },
  { id: "ux", emoji: "✨", label: "UX Lead" },
  { id: "pitch", emoji: "🎤", label: "Pitcher" },
];

const COLORS: Record<string, string> = {
  cto:"#7c6af7", ceo:"#3ecf8e", designer:"#ecc94b", ml:"#4db6f4",
  fullstack:"#f56565", devops:"#3ecf8e", pm:"#e53e83", mobile:"#7c6af7",
  data:"#ecc94b", sec:"#f56565", ux:"#4db6f4", pitch:"#ecc94b",
};

interface Card {
  id: string; pairId: string; emoji: string; label: string;
  revealed: boolean; matched: boolean; flipAnim: number; // 0..1
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function buildDeck(): Card[] {
  const cards: Card[] = [];
  CARD_PAIRS.forEach(p => {
    for (let i=0;i<2;i++) {
      cards.push({ id: `${p.id}-${i}`, pairId: p.id, emoji: p.emoji, label: p.label, revealed: false, matched: false, flipAnim: 0 });
    }
  });
  return shuffle(cards);
}

const COLS = 6, ROWS = 4;

export default function TeamMakerPage() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [running, setRunning] = useState(false);
  const addScore = useLeaderboard(s => s.addScore);

  const startGame = useCallback(() => {
    setDeck(buildDeck());
    setSelected([]); setLocked(false); setMoves(0); setMatched(0);
    setScore(0); setDone(false); setTimeMs(0); setRunning(true);
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  // Timer
  useEffect(() => {
    if (!running || done) return;
    const id = setInterval(() => setTimeMs(t => t + 100), 100);
    return () => clearInterval(id);
  }, [running, done]);

  function flipCard(cardId: string) {
    if (locked || done) return;
    const card = deck.find(c => c.id === cardId);
    if (!card || card.revealed || card.matched) return;
    if (selected.includes(cardId)) return;

    playPowerUpSound();
    const newSelected = [...selected, cardId];
    setDeck(prev => prev.map(c => c.id === cardId ? { ...c, revealed: true } : c));
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setLocked(true);
      setMoves(m => m+1);
      const [a, b] = newSelected.map(id => deck.find(c => c.id === id)!);
      if (a.pairId === b.pairId) {
        // Match!
        playScoreSound();
        setTimeout(() => {
          setDeck(prev => prev.map(c => newSelected.includes(c.id) ? { ...c, matched: true } : c));
          const newMatched = matched + 1;
          setMatched(newMatched);
          const pts = Math.max(100, 500 - moves * 10);
          setScore(s => s + pts);
          setSelected([]); setLocked(false);
          if (newMatched === CARD_PAIRS.length) {
            setDone(true); setRunning(false);
            playPowerUpSound();
            const total = Math.max(100, 500-moves*10) * CARD_PAIRS.length + Math.max(0, 10000 - Math.floor(timeMs/100)*10);
            setScore(total);
            addScore("team-maker", { score: total, date: new Date().toISOString(), combo: moves });
          }
        }, 600);
      } else {
        // No match
        playDeathSound();
        setTimeout(() => {
          setDeck(prev => prev.map(c => newSelected.includes(c.id) ? { ...c, revealed: false } : c));
          setSelected([]); setLocked(false);
        }, 900);
      }
    }
  }

  const timeStr = `${Math.floor(timeMs/60000)}:${String(Math.floor(timeMs/1000)%60).padStart(2,"0")}`;

  return (
    <GameLayout gameId="team-maker" title="Team Maker" score={score}
      keyboardHints={["CLICK cards to flip", "Find matching co-founder roles", "Fewer moves = higher score"]}
    >
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"16px" }}>
        {/* HUD */}
        <div style={{ display:"flex", gap:"20px", alignItems:"center", justifyContent:"center", flexWrap:"wrap" }}>
          {[
            { label:"Moves", val:moves },
            { label:"Pairs", val:`${matched}/${CARD_PAIRS.length}` },
            { label:"Time", val:timeStr },
          ].map(({label,val}) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"22px", fontWeight:700, color:"#e8e8ec", lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:"10px", color:"#6b6b78", marginTop:"2px", letterSpacing:"0.06em", textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
          <button className="btn-secondary" onClick={startGame} style={{fontSize:"12px",padding:"5px 12px"}}>New Game</button>
        </div>

        {/* Board */}
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(${COLS}, 1fr)`,
          gap:"6px",
          width:"100%",
          maxWidth:"600px",
        }}>
          {deck.map(card => {
            const isUp = card.revealed || card.matched;
            const color = COLORS[card.pairId] ?? "#7c6af7";
            return (
              <div
                key={card.id}
                onClick={() => flipCard(card.id)}
                className="no-select"
                style={{
                  aspectRatio:"3/4",
                  borderRadius:"10px",
                  cursor: card.matched ? "default" : isUp ? "default" : "pointer",
                  border: card.matched ? `1.5px solid ${color}60` : isUp ? `1.5px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                  background: card.matched ? `${color}14` : isUp ? `${color}22` : "#141417",
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:"4px",
                  transition:"all 0.25s ease",
                  transform: isUp ? "rotateY(0deg)" : "rotateY(180deg)",
                  position:"relative",
                  overflow:"hidden",
                }}
              >
                {isUp ? (
                  <>
                    <span style={{ fontSize:"clamp(16px,4vw,28px)" }}>{card.emoji}</span>
                    <span style={{ fontSize:"clamp(7px,1.5vw,10px)", color, fontWeight:700, letterSpacing:"0.04em", textAlign:"center", padding:"0 4px" }}>{card.label}</span>
                    {card.matched && (
                      <div style={{ position:"absolute", inset:0, background:`${color}10`, borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:"20px" }}>✓</span>
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize:"clamp(14px,3.5vw,22px)" }}>🎮</span>
                )}
              </div>
            );
          })}
        </div>

        {done && (
          <div style={{
            background:"#141417", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px",
            padding:"20px 28px", textAlign:"center", animation:"slide-up 0.3s ease forwards",
          }}>
            <div style={{ fontSize:"28px", marginBottom:"8px" }}>🏆</div>
            <div style={{ fontFamily:"var(--font-space-grotesk),sans-serif", fontWeight:700, fontSize:"22px", color:"#ecc94b" }}>Team Assembled!</div>
            <div style={{ color:"#6b6b78", fontSize:"13px", marginTop:"6px" }}>{moves} moves · {timeStr}</div>
            <div style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"32px", fontWeight:700, color:"#7c6af7", marginTop:"12px" }}>{score.toLocaleString()}</div>
            <div style={{ color:"#6b6b78", fontSize:"12px" }}>pts</div>
            <button className="btn-primary" onClick={startGame} style={{ marginTop:"14px" }}>Play Again</button>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
