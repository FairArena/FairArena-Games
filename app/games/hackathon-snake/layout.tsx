import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hackathon Snake | FairArena Games",
  description: "Eat the tech stack. Grow your team. Survive scope creep.",
  alternates: {
    canonical: "/games/hackathon-snake",
  },
  openGraph: {
    title: "Hackathon Snake | FairArena Games",
    description: "Eat the tech stack. Grow your team. Survive scope creep.",
    url: "https://games.fairarena.app/games/hackathon-snake",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
