import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0c0c0e",
        surface: "#141417",
        "surface-2": "#1c1c21",
        border: "rgba(255,255,255,0.07)",
        text: "#e8e8ec",
        "text-muted": "#6b6b78",
        accent: "#7c6af7",
        "accent-2": "#3ecf8e",
        danger: "#f56565",
        warning: "#ecc94b",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "score-float": {
          "0%": { opacity: "0.08", transform: "translateY(0px)" },
          "50%": { opacity: "0.15", transform: "translateY(-20px)" },
          "100%": { opacity: "0.08", transform: "translateY(-40px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease forwards",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "score-float": "score-float 4s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease forwards",
        shimmer: "shimmer 2s linear infinite",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)",
        "card-hover":
          "0 2px 8px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)",
        elevated: "0 4px 24px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
