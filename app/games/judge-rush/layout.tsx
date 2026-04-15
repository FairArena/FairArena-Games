import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Judge Rush | FairArena Games",
  description: "Sort 142 submissions into the right categories. Go.",
  alternates: {
    canonical: "/games/judge-rush",
  },
  openGraph: {
    title: "Judge Rush | FairArena Games",
    description: "Sort 142 submissions into the right categories. Go.",
    url: "https://games.fairarena.app/games/judge-rush",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
