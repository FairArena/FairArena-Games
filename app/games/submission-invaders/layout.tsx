import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submission Invaders | FairArena Games",
  description: "A SPAM WAVE floods your inbox. Defend the leaderboard.",
  alternates: {
    canonical: "/games/submission-invaders",
  },
  openGraph: {
    title: "Submission Invaders | FairArena Games",
    description: "A SPAM WAVE floods your inbox. Defend the leaderboard.",
    url: "https://games.fairarena.app/games/submission-invaders",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
