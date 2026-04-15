import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard Pong | FairArena Games",
  description: "First to 11 wins the leaderboard. Rubber-band AI. Power-ups.",
  alternates: {
    canonical: "/games/leaderboard-pong",
  },
  openGraph: {
    title: "Leaderboard Pong | FairArena Games",
    description: "First to 11 wins the leaderboard. Rubber-band AI. Power-ups.",
    url: "https://games.fairarena.app/games/leaderboard-pong",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
