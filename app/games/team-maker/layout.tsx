import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Maker | FairArena Games",
  description: "Match co-founder roles. Build the perfect hackathon team.",
  alternates: {
    canonical: "/games/team-maker",
  },
  openGraph: {
    title: "Team Maker | FairArena Games",
    description: "Match co-founder roles. Build the perfect hackathon team.",
    url: "https://games.fairarena.app/games/team-maker",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
