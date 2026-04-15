import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        "folio-bg": "#FAF7F2",
        "folio-surface": "#FFFFFF",
        "folio-border": "#E8E2D9",
        "folio-ink": "#1C1917",
        "folio-muted": "#78716C",
        "folio-accent": "#D97706",
        "folio-accent-lt": "#FEF3C7",
        "folio-user-bg": "#1C1917",
        "folio-user-fg": "#FAF7F2",
      },
    },
  },
  plugins: [],
};

export default config;
