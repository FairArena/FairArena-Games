import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flappy Hacker | FairArena Games",
  description: "Dodge PR review gates. Don't let merge conflicts end your run.",
  alternates: {
    canonical: "/games/flappy-hacker",
  },
  openGraph: {
    title: "Flappy Hacker | FairArena Games",
    description: "Dodge PR review gates. Don't let merge conflicts end your run.",
    url: "https://games.fairarena.app/games/flappy-hacker",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
