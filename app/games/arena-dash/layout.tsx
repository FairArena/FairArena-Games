import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena Dash | FairArena Games",
  description: "Endless run through hackathon chaos. Jump scope creep, slide deadlines.",
  alternates: {
    canonical: "/games/arena-dash",
  },
  openGraph: {
    title: "Arena Dash | FairArena Games",
    description: "Endless run through hackathon chaos. Jump scope creep, slide deadlines.",
    url: "https://games.fairarena.app/games/arena-dash",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
