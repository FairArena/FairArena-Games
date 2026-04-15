"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LeaderboardEntry {
  score: number;
  date: string;
  combo: number;
  initials?: string;
}

interface GameStore {
  scores: Record<string, LeaderboardEntry[]>;
  addScore: (gameId: string, entry: LeaderboardEntry) => void;
  getTopScores: (gameId: string) => LeaderboardEntry[];
  getPersonalBest: (gameId: string) => number;
  clearScores: (gameId: string) => void;

  // Pong match history
  pongHistory: Array<{ won: boolean; date: string }>;
  addPongResult: (won: boolean) => void;
  getPongRecord: () => { wins: number; losses: number };

  // Wordle streak
  wordleStreak: number;
  wordleBestStreak: number;
  incrementWordleStreak: () => void;
  resetWordleStreak: () => void;
}

export const useLeaderboard = create<GameStore>()(
  persist(
    (set, get) => ({
      scores: {},
      pongHistory: [],
      wordleStreak: 0,
      wordleBestStreak: 0,

      addScore: (gameId, entry) => {
        set((state) => {
          const existing = state.scores[gameId] ?? [];
          const updated = [...existing, entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // top 5 only
          return {
            scores: { ...state.scores, [gameId]: updated },
          };
        });
      },

      getTopScores: (gameId) => {
        return get().scores[gameId] ?? [];
      },

      getPersonalBest: (gameId) => {
        const scores = get().scores[gameId] ?? [];
        return scores.length > 0 ? scores[0].score : 0;
      },

      clearScores: (gameId) => {
        set((state) => {
          const { [gameId]: _, ...rest } = state.scores;
          return { scores: rest };
        });
      },

      addPongResult: (won) => {
        set((state) => ({
          pongHistory: [
            ...state.pongHistory.slice(-49),
            { won, date: new Date().toISOString() },
          ],
        }));
      },

      getPongRecord: () => {
        const history = get().pongHistory;
        return {
          wins: history.filter((h) => h.won).length,
          losses: history.filter((h) => !h.won).length,
        };
      },

      incrementWordleStreak: () => {
        set((state) => {
          const newStreak = state.wordleStreak + 1;
          return {
            wordleStreak: newStreak,
            wordleBestStreak: Math.max(newStreak, state.wordleBestStreak),
          };
        });
      },

      resetWordleStreak: () => {
        set({ wordleStreak: 0 });
      },
    }),
    {
      name: "fairarena-games-store",
      version: 1,
    }
  )
);
