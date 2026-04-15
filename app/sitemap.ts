import { MetadataRoute } from "next";

const GAMES = [
  "flappy-hacker",
  "submission-invaders",
  "deadline-dash",
  "pitch-perfect",
  "team-maker",
  "trivia-blitz",
  "hackathon-snake",
  "bug-whacker",
  "arena-dash",
  "judge-rush",
  "score-2048",
  "stack-wordle",
  "project-blocks",
  "leaderboard-pong",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://games.fairarena.app";

  const gameRoutes = GAMES.map((id) => ({
    url: `${baseUrl}/games/${id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...gameRoutes,
  ];
}
