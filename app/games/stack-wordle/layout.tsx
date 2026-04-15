import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stack Wordle | FairArena Games",
  description: "Guess today's 5-letter tech word. Daily challenge from the stack.",
  alternates: {
    canonical: "/games/stack-wordle",
  },
  openGraph: {
    title: "Stack Wordle | FairArena Games",
    description: "Guess today's 5-letter tech word. Daily challenge from the stack.",
    url: "https://games.fairarena.app/games/stack-wordle",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
