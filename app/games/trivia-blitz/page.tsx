"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import { playScoreSound, playDeathSound } from "@/lib/gameUtils";

type GS = "start" | "playing" | "over";

interface Question {
  q: string; opts: string[]; correct: number; category: string;
}

const ALL_QUESTIONS: Question[] = [
  { q: "What is a hackathon?", opts:["A hacking crime","A sprint building event","A marathon for coders","A security audit"], correct:1, category:"Basics" },
  { q: "FairArena is best described as a...", opts:["Social media app","Hackathon management platform","Code editor","Job board"], correct:1, category:"FairArena" },
  { q: "Which metric matters most for hackathon judges?", opts:["Lines of code","Impact & innovation","GitHub stars","Tech stack complexity"], correct:1, category:"Judging" },
  { q: "MVP stands for...", opts:["Most Valuable Player","Minimum Viable Product","Maximum Version Published","Master Validated Protocol"], correct:1, category:"Startup" },
  { q: "The best team size for a hackathon is typically...", opts:["1 person","2–5 people","10+ people","Depends on rules"], correct:3, category:"Teams" },
  { q: "What is 'scope creep'?", opts:["A game mechanic","Uncontrolled feature expansion","A security vulnerability","A Git command"], correct:1, category:"Dev" },
  { q: "Demo day best practice is to...", opts:["Show code","Show impact & working demo","Explain architecture","Read slides"], correct:1, category:"Pitching" },
  { q: "A 'pivot' in startups means...", opts:["A git merge","Changing business direction","A database migration","Frontend routing"], correct:1, category:"Startup" },
  { q: "What does CRUD stand for?", opts:["Create Run Update Delete","Create Read Update Delete","Copy Read Undo Deploy","Compile Run Upload Debug"], correct:1, category:"Dev" },
  { q: "Which is a real-time database?", opts:["PostgreSQL","Firebase Realtime DB","SQLite","COBOL DB"], correct:1, category:"Tech" },
  { q: "REST API stands for...", opts:["Remote Execution Standard Tech","Representational State Transfer","Reliable Endpoint System Transfer","Resource Endpoint Secured Transfer"], correct:1, category:"Tech" },
  { q: "Which country hosts the most hackathons?", opts:["India","USA","China","Germany"], correct:0, category:"World" },
  { q: "A pitch deck typically has how many slides?", opts:["3–5","10–15","20–25","50+"], correct:1, category:"Pitching" },
  { q: "TAM in startup means...", opts:["Total Available Market","Tech Agile Methodology","Team Asset Management","Token Asset Mapping"], correct:0, category:"Startup" },
  { q: "FairArena's leaderboard ranks teams by...", opts:["Commit count","Judge scores","Social media followers","Team size"], correct:1, category:"FairArena" },
  { q: "Git rebase is used to...", opts:["Delete commits","Linearize commit history","Merge branches","Reset passwords"], correct:1, category:"Dev" },
  { q: "Which is NOT a hackathon category?", opts:["Education","Healthcare","Blockchain","Watching Netflix"], correct:3, category:"Basics" },
  { q: "An API key should always be...", opts:["In your README","On your frontend","Kept secret in .env","Tweeted for help"], correct:2, category:"Security" },
  { q: "UI means...", opts:["Unified Interface","User Interface","Universal Input","Uniform Integration"], correct:1, category:"Tech" },
  { q: "What is a 'rubber duck debug'?", opts:["A duck library","Explaining code to an object","A type of IDE plugin","A test framework"], correct:1, category:"Dev" },
  { q: "Judges typically want to see...", opts:["Just slides","Working prototype","Perfect code","10-year roadmap"], correct:1, category:"Judging" },
  { q: "Open source means the code is...", opts:["Paid","Publicly accessible","Cloud hosted","AI-generated"], correct:1, category:"Dev" },
  { q: "A startup 'runway' refers to...", opts:["Airport metaphor","Months until out of cash","Launch timeline","Investor pitch session"], correct:1, category:"Startup" },
  { q: "What language runs in browsers natively?", opts:["Python","Rust","JavaScript","Go"], correct:2, category:"Tech" },
  { q: "FairArena helps participants...", opts:["Find co-founders only","Manage & compete in hackathons","Apply for jobs","Buy domain names"], correct:1, category:"FairArena" },
];

const QUESTION_TIME = 15; // seconds each

export default function TriviaBlitzPage() {
  const [gs, setGs] = useState<GS>("start");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [correct, setCorrect] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const addScore = useLeaderboard(s => s.addScore);

  function shufflePool(): Question[] {
    return [...ALL_QUESTIONS].sort(() => Math.random()-0.5).slice(0, 15);
  }

  const startGame = useCallback(() => {
    const pool = shufflePool();
    setQuestions(pool); setQIdx(0); setSelected(null);
    setScore(0); setStreak(0); setTimeLeft(QUESTION_TIME);
    setCorrect(0); setGs("playing");
  }, []);

  // Timer countdown
  useEffect(() => {
    if (gs !== "playing") return;
    if (selected !== null) return; // paused while showing result
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // timeout = wrong
          handleAnswer(-1);
          return QUESTION_TIME;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gs, qIdx, selected]);

  function handleAnswer(optIdx: number) {
    if (selected !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(optIdx);
    const q = questions[qIdx];
    if (optIdx === q.correct) {
      const timeBonus = timeLeft * 5;
      const newStreak = streak + 1;
      const pts = 100 + timeBonus + (newStreak >= 3 ? 50 * (newStreak-2) : 0);
      setScore(s => s + pts);
      setStreak(newStreak);
      setCorrect(c => c+1);
      playScoreSound();
    } else {
      setStreak(0);
      if (optIdx !== -1) playDeathSound();
    }
    // Advance after 1.5s
    setTimeout(() => {
      const next = qIdx + 1;
      if (next >= questions.length) {
        setGs("over");
        addScore("trivia-blitz", { score: score + (optIdx===q.correct?(100+timeLeft*5):0), date: new Date().toISOString(), combo: streak+1 });
      } else {
        setQIdx(next);
        setSelected(null);
        setTimeLeft(QUESTION_TIME);
      }
    }, 1400);
  }

  const q = questions[qIdx];
  const pct = timeLeft / QUESTION_TIME;

  if (gs === "start" || !q) {
    return (
      <GameLayout gameId="trivia-blitz" title="Trivia Blitz" score={score}>
        <div style={{
          background:"#141417", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px",
          padding:"40px 32px", textAlign:"center", maxWidth:"500px", margin:"0 auto",
        }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>🧠</div>
          <h2 style={{ fontFamily:"var(--font-space-grotesk),sans-serif", fontSize:"28px", fontWeight:700, color:"#e8e8ec", marginBottom:"12px" }}>
            Trivia Blitz
          </h2>
          <p style={{ color:"#6b6b78", fontSize:"14px", lineHeight:1.6, marginBottom:"28px", maxWidth:"340px", margin:"0 auto 28px" }}>
            15 questions · 15 seconds each · FairArena & hackathon knowledge. Answer fast for time bonuses!
          </p>
          <button className="btn-primary" onClick={startGame} style={{ fontSize:"16px", padding:"12px 32px" }}>
            Start Game
          </button>
        </div>
      </GameLayout>
    );
  }

  if (gs === "over") {
    const pctCorrect = Math.round((correct / questions.length) * 100);
    return (
      <GameLayout gameId="trivia-blitz" title="Trivia Blitz" score={score}>
        <div style={{
          background:"#141417", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"16px",
          padding:"40px 32px", textAlign:"center", maxWidth:"500px", margin:"0 auto",
          animation:"slide-up 0.3s ease forwards",
        }}>
          <div style={{ fontSize:"48px", marginBottom:"12px" }}>
            {pctCorrect >= 80 ? "🏆" : pctCorrect >= 60 ? "🎉" : "📚"}
          </div>
          <div style={{ fontFamily:"var(--font-space-grotesk),sans-serif", fontSize:"22px", fontWeight:700, color:"#e8e8ec", marginBottom:"8px" }}>
            {pctCorrect >= 80 ? "Hackathon Expert!" : pctCorrect >= 60 ? "Solid Knowledge!" : "Keep Learning!"}
          </div>
          <div style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"48px", fontWeight:700, color:"#7c6af7", margin:"16px 0 8px" }}>
            {score.toLocaleString()}
          </div>
          <div style={{ color:"#6b6b78", fontSize:"13px", marginBottom:"20px" }}>
            {correct}/{questions.length} correct · {pctCorrect}% accuracy
          </div>
          <div style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
            <button className="btn-primary" onClick={startGame}>Play Again</button>
          </div>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout gameId="trivia-blitz" title="Trivia Blitz" score={score}>
      <div style={{ maxWidth:"600px", margin:"0 auto", display:"flex", flexDirection:"column", gap:"16px" }}>
        {/* Progress + timer */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ flex:1, height:"4px", background:"#1c1c21", borderRadius:"2px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(qIdx/questions.length)*100}%`, background:"#7c6af7", transition:"width 0.3s ease" }} />
          </div>
          <span style={{ color:"#6b6b78", fontSize:"12px", whiteSpace:"nowrap" }}>{qIdx+1}/{questions.length}</span>
          {streak >= 3 && (
            <span style={{ color:"#ecc94b", fontSize:"12px", fontWeight:700 }}>🔥 ×{streak}</span>
          )}
        </div>

        {/* Timer bar */}
        <div style={{ height:"6px", background:"#1c1c21", borderRadius:"3px", overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${pct*100}%`,
            background: pct > 0.5 ? "#3ecf8e" : pct > 0.25 ? "#ecc94b" : "#f56565",
            transition:"width 1s linear",
          }} />
        </div>

        {/* Category + time */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"11px", color:"#7c6af7", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase",
            background:"rgba(124,106,247,0.1)", padding:"3px 8px", borderRadius:"4px" }}>
            {q.category}
          </span>
          <span style={{ fontFamily:"var(--font-jetbrains-mono),monospace", fontSize:"14px", color: timeLeft <= 5 ? "#f56565" : "#6b6b78", fontWeight:700 }}>
            ⏱ {timeLeft}s
          </span>
        </div>

        {/* Question */}
        <div style={{
          background:"#141417", border:"1px solid rgba(255,255,255,0.07)", borderRadius:"14px",
          padding:"24px 20px", fontSize:"clamp(16px,3vw,20px)", fontFamily:"var(--font-space-grotesk),sans-serif",
          fontWeight:600, color:"#e8e8ec", lineHeight:1.4, textAlign:"center",
        }}>
          {q.q}
        </div>

        {/* Options */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          {q.opts.map((opt, i) => {
            let bg = "#141417", border = "rgba(255,255,255,0.07)", color = "#e8e8ec";
            if (selected !== null) {
              if (i === q.correct) { bg="#3ecf8e18"; border="#3ecf8e"; color="#3ecf8e"; }
              else if (i === selected && i !== q.correct) { bg="#f5656518"; border="#f56565"; color="#f56565"; }
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className="no-select"
                style={{
                  background:bg, border:`1.5px solid ${border}`, borderRadius:"12px",
                  padding:"14px 12px", color, fontSize:"clamp(12px,2.5vw,14px)",
                  fontFamily:"var(--font-inter),sans-serif", fontWeight:500, cursor: selected!==null?"default":"pointer",
                  textAlign:"left", transition:"all 0.2s ease", lineHeight:1.4,
                  minHeight:"60px", display:"flex", alignItems:"center",
                  WebkitTapHighlightColor:"transparent",
                }}
              >
                <span style={{ color:"#6b6b78", fontWeight:700, marginRight:"8px", fontFamily:"monospace" }}>
                  {["A","B","C","D"][i]}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </GameLayout>
  );
}
