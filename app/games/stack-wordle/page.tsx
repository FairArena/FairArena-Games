"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GameLayout } from "@/components/GameLayout";
import { useLeaderboard } from "@/lib/useLeaderboard";
import { playScoreSound, playDeathSound, seededRandom } from "@/lib/gameUtils";

const WORD_BANK = [
  "REACT", "FLASK", "SWARM", "AGENT", "QUERY", "REDUX", "NGINX", "REDIS",
  "KAFKA", "PRISM", "SOLAR", "SWIFT", "VITE", "DOCKER", "GRAPHQL".slice(0, 5),
  "MONGO", "TRPC".padEnd(5, "X").slice(0, 5), "DENO", "BENTO".slice(0, 5),
  "CARGO", "SCALA", "JULIA", "ELIXIR".slice(0, 5), "ASYNC", "AWAIT",
  "CLASS", "CONST", "PROXY", "EVENT", "FIBER", "TRAIT", "SLICE",
  "STACK", "QUEUE", "BYTES", "TOKEN", "SCOPE", "FETCH", "CHUNK",
  "BUILD", "STAGE", "WATCH", "PATCH", "MERGE", "CLONE", "STASH",
  "INDEX", "CACHE", "ROUTE", "PARSE", "SPAWN", "CORGI", "DEBUG",
].filter(w => w.length === 5).map(w => w.toUpperCase());

type CellState = "empty" | "absent" | "present" | "correct";

interface GuessRow {
  letters: string[];
  states: CellState[];
  submitted: boolean;
}

function getWordOfDay(): string {
  const date = new Date();
  const daysSinceEpoch = Math.floor(date.getTime() / 86400000);
  const rand = seededRandom(daysSinceEpoch);
  return WORD_BANK[Math.floor(rand() * WORD_BANK.length)];
}

const STATE_COLORS: Record<CellState, string> = {
  empty: "#1c1c21",
  absent: "#2a2a35",
  present: "#ecc94b",
  correct: "#3ecf8e",
};

const STATE_BORDER: Record<CellState, string> = {
  empty: "rgba(255,255,255,0.07)",
  absent: "rgba(255,255,255,0.04)",
  present: "rgba(236,201,75,0.4)",
  correct: "rgba(62,207,142,0.4)",
};

const KEYBOARD_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["⌫", ..."ZXCVBNM".split(""), "↵"],
];

export default function StackWordlePage() {
  const [word, setWord] = useState(() => getWordOfDay());
  const [guesses, setGuesses] = useState<GuessRow[]>(
    Array.from({ length: 6 }, () => ({ letters: [], states: [], submitted: false }))
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [currentLetters, setCurrentLetters] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<"won" | "lost" | null>(null);
  const [score, setScore] = useState(0);
  const [mode, setMode] = useState<"daily" | "random">("daily");
  const [shake, setShake] = useState<number | null>(null);
  const [revealRow, setRevealRow] = useState<number | null>(null);

  const addScore = useLeaderboard((s) => s.addScore);
  const { incrementWordleStreak, resetWordleStreak, wordleStreak, wordleBestStreak } = useLeaderboard();

  function newRandomGame() {
    const w = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
    setWord(w);
    setGuesses(Array.from({ length: 6 }, () => ({ letters: [], states: [], submitted: false })));
    setCurrentRow(0);
    setCurrentLetters([]);
    setGameOver(null);
    setScore(0);
    setMode("random");
  }

  function evaluateGuess(guess: string[], target: string): CellState[] {
    const states: CellState[] = Array(5).fill("absent");
    const targetArr = target.split("");
    const usedTarget = Array(5).fill(false);

    // First pass: correct
    guess.forEach((letter, i) => {
      if (letter === targetArr[i]) {
        states[i] = "correct";
        usedTarget[i] = true;
      }
    });

    // Second pass: present
    guess.forEach((letter, i) => {
      if (states[i] === "correct") return;
      const targetIdx = targetArr.findIndex((t, ti) => t === letter && !usedTarget[ti]);
      if (targetIdx !== -1) {
        states[i] = "present";
        usedTarget[targetIdx] = true;
      }
    });

    return states;
  }

  const submit = useCallback(() => {
    if (currentLetters.length !== 5) {
      setShake(currentRow);
      setTimeout(() => setShake(null), 400);
      return;
    }

    const guessWord = currentLetters.join("");
    if (!WORD_BANK.includes(guessWord) && guessWord !== word) {
      setShake(currentRow);
      setTimeout(() => setShake(null), 400);
      return;
    }

    const states = evaluateGuess(currentLetters, word);
    const newGuesses = [...guesses];
    newGuesses[currentRow] = { letters: currentLetters, states, submitted: true };
    setGuesses(newGuesses);
    setRevealRow(currentRow);
    setTimeout(() => setRevealRow(null), 500);

    const won = states.every(s => s === "correct");
    if (won) {
      const pts = (6 - currentRow) * 100 + 50;
      setScore(pts);
      setGameOver("won");
      playScoreSound();
      incrementWordleStreak();
      addScore("stack-wordle", { score: pts, date: new Date().toISOString(), combo: currentRow + 1 });
    } else if (currentRow === 5) {
      setGameOver("lost");
      playDeathSound();
      resetWordleStreak();
    } else {
      setCurrentRow(r => r + 1);
      setCurrentLetters([]);
    }
  }, [currentLetters, currentRow, guesses, word, addScore, incrementWordleStreak, resetWordleStreak]);

  const type = useCallback((letter: string) => {
    if (gameOver) return;
    if (letter === "⌫" || letter === "BACKSPACE") {
      setCurrentLetters(l => l.slice(0, -1));
    } else if (letter === "↵" || letter === "ENTER") {
      submit();
    } else if (currentLetters.length < 5 && /^[A-Z]$/.test(letter)) {
      setCurrentLetters(l => [...l, letter]);
    }
  }, [gameOver, currentLetters, submit]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      type(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [type]);

  // Build keyboard letter states
  const letterStates: Record<string, CellState> = {};
  guesses.forEach(row => {
    if (!row.submitted) return;
    row.letters.forEach((l, i) => {
      const current = letterStates[l];
      const state = row.states[i];
      if (!current || (state === "correct") || (state === "present" && current === "absent")) {
        letterStates[l] = state;
      }
    });
  });

  function getCellDisplay(rowIdx: number, colIdx: number) {
    const row = guesses[rowIdx];
    const isCurrent = rowIdx === currentRow && !row.submitted;
    const letter = isCurrent ? (currentLetters[colIdx] ?? "") : (row.letters[colIdx] ?? "");
    const state: CellState = row.submitted ? row.states[colIdx] : (letter ? "empty" : "empty");
    const isRevealing = revealRow === rowIdx && row.submitted;
    const delay = isRevealing ? colIdx * 80 : 0;
    return { letter, state, delay };
  }

  return (
    <GameLayout
      gameId="stack-wordle"
      title="Stack Wordle"
      score={score}
      keyboardHints={["Type — Enter letters", "ENTER — Submit guess", "BACKSPACE — Delete"]}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        {/* Mode + streak */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="btn-secondary"
            onClick={() => { setMode("daily"); setWord(getWordOfDay()); setGuesses(Array.from({ length: 6 }, () => ({ letters: [], states: [], submitted: false }))); setCurrentRow(0); setCurrentLetters([]); setGameOver(null); }}
            style={{ fontSize: "12px", padding: "5px 12px", opacity: mode === "daily" ? 1 : 0.5 }}
          >
            Daily
          </button>
          <button className="btn-secondary" onClick={newRandomGame}
            style={{ fontSize: "12px", padding: "5px 12px", opacity: mode === "random" ? 1 : 0.5 }}>
            Random
          </button>
          <div style={{ display: "flex", gap: "8px", marginLeft: "8px" }}>
            <span style={{ fontSize: "12px", color: "#6b6b78" }}>Streak:</span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "14px", fontWeight: 700, color: "#ecc94b" }}>
              {wordleStreak}
            </span>
            <span style={{ fontSize: "12px", color: "#6b6b78" }}>Best:</span>
            <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "14px", fontWeight: 700, color: "#7c6af7" }}>
              {wordleBestStreak}
            </span>
          </div>
        </div>

        {/* Game board */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: "flex", gap: "6px",
                animation: shake === rowIdx ? "shake 0.3s ease" : "none",
              }}
            >
              {Array.from({ length: 5 }).map((_, colIdx) => {
                const { letter, state, delay } = getCellDisplay(rowIdx, colIdx);
                const isRevealing = revealRow === rowIdx && guesses[rowIdx].submitted;
                return (
                  <div
                    key={colIdx}
                    style={{
                      width: "56px",
                      height: "56px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      border: `1px solid ${STATE_BORDER[state]}`,
                      background: STATE_COLORS[state],
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "#e8e8ec",
                      transition: `background 0.2s ${delay}ms ease, border-color 0.2s ${delay}ms ease`,
                      transform: isRevealing ? "rotateX(360deg)" : "rotateX(0deg)",
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Game over */}
        {gameOver && (
          <div style={{
            padding: "16px 24px",
            background: "#141417",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            textAlign: "center",
            animation: "slide-up 0.3s ease forwards",
          }}>
            {gameOver === "won" ? (
              <>
                <div style={{ fontSize: "24px", marginBottom: "4px" }}>🎉</div>
                <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, color: "#3ecf8e", fontSize: "18px" }}>
                  Nice one!
                </div>
                <div style={{ color: "#6b6b78", fontSize: "13px", marginTop: "4px" }}>
                  Solved in guess #{currentRow + 1} · +{score} pts
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>😔</div>
                <div style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, color: "#f56565", fontSize: "18px" }}>
                  The word was
                </div>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "24px", fontWeight: 700, color: "#e8e8ec", marginTop: "4px", letterSpacing: "0.1em" }}>
                  {word}
                </div>
              </>
            )}
            {mode === "random" && (
              <button className="btn-primary" onClick={newRandomGame} style={{ marginTop: "12px", fontSize: "13px" }}>
                Play Again
              </button>
            )}
          </div>
        )}

        {/* Keyboard */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", marginTop: "8px" }}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: "5px" }}>
              {row.map((key) => {
                const state = letterStates[key];
                return (
                  <button
                    key={key}
                    onClick={() => type(key)}
                    style={{
                      minWidth: key.length > 1 ? "52px" : "36px",
                      height: "42px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: state ? STATE_COLORS[state] : "#1c1c21",
                      color: "#e8e8ec",
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: key.length > 1 ? "14px" : "15px",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: "0 6px",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </GameLayout>
  );
}
