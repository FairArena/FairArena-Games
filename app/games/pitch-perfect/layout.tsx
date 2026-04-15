import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pitch Perfect | FairArena Games",
  description: "Simon Says, hackathon edition. Nail the sequence, impress the judges.",
  alternates: {
    canonical: "/games/pitch-perfect",
  },
  openGraph: {
    title: "Pitch Perfect | FairArena Games",
    description: "Simon Says, hackathon edition. Nail the sequence, impress the judges.",
    url: "https://games.fairarena.app/games/pitch-perfect",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
