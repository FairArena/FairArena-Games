import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Score 2048 | FairArena Games",
  description: "Merge 'Idea' into 'Grand Prize'. One swipe at a time.",
  alternates: {
    canonical: "/games/score-2048",
  },
  openGraph: {
    title: "Score 2048 | FairArena Games",
    description: "Merge 'Idea' into 'Grand Prize'. One swipe at a time.",
    url: "https://games.fairarena.app/games/score-2048",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
