"use client";

import React from "react";

interface DifficultyBadgeProps {
  difficulty: "EASY" | "MEDIUM" | "HARD" | "BRUTAL";
}

const DIFFICULTY_CLASSES: Record<string, string> = {
  EASY: "badge-easy",
  MEDIUM: "badge-medium",
  HARD: "badge-hard",
  BRUTAL: "badge-brutal",
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span className={`badge ${DIFFICULTY_CLASSES[difficulty] ?? "badge"}`}>
      {difficulty}
    </span>
  );
}
