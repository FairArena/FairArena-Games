import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trivia Blitz | FairArena Games",
  description: "Test your hackathon IQ. 15 questions, 15 seconds each.",
  alternates: {
    canonical: "/games/trivia-blitz",
  },
  openGraph: {
    title: "Trivia Blitz | FairArena Games",
    description: "Test your hackathon IQ. 15 questions, 15 seconds each.",
    url: "https://games.fairarena.app/games/trivia-blitz",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
