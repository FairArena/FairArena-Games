import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bug Whacker | FairArena Games",
  description: "Click fast. Kill bugs. Save the FairArena demo.",
  alternates: {
    canonical: "/games/bug-whacker",
  },
  openGraph: {
    title: "Bug Whacker | FairArena Games",
    description: "Click fast. Kill bugs. Save the FairArena demo.",
    url: "https://games.fairarena.app/games/bug-whacker",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
