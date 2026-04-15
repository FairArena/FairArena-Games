import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://games.fairarena.app"),
  title: {
    template: "%s | FairArena Games",
    default: "FairArena Games — Procrastinate Responsibly",
  },
  description:
    "Play 14 free web-based arcade games while waiting for hackathon submissions. Built with love for the FairArena community.",
  keywords: ["arcade games", "fairarena", "hackathon", "browser games", "HTML5 games", "free online games", "puzzle", "action", "retro"],
  authors: [{ name: "FairArena", url: "https://fairarena.app" }],
  creator: "FairArena",
  publisher: "FairArena",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "FairArena Games",
    description: "Procrastinate responsibly. Play 14 free high-quality arcade games.",
    url: "https://games.fairarena.app",
    siteName: "FairArena Games",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FairArena Games",
    description: "Procrastinate responsibly. Play 14 free high-quality arcade games.",
    creator: "@FairArena",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  themeColor: "#0c0c0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <Analytics />
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
