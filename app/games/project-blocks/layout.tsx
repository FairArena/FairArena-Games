import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Blocks | FairArena Games",
  description: "Tetris for builders. Each piece is a feature. Don't stack overflow.",
  alternates: {
    canonical: "/games/project-blocks",
  },
  openGraph: {
    title: "Project Blocks | FairArena Games",
    description: "Tetris for builders. Each piece is a feature. Don't stack overflow.",
    url: "https://games.fairarena.app/games/project-blocks",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
