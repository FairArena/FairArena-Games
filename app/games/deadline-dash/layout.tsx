import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deadline Dash | FairArena Games",
  description: "90 seconds to demo day. Tap tasks before they crash the floor.",
  alternates: {
    canonical: "/games/deadline-dash",
  },
  openGraph: {
    title: "Deadline Dash | FairArena Games",
    description: "90 seconds to demo day. Tap tasks before they crash the floor.",
    url: "https://games.fairarena.app/games/deadline-dash",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
