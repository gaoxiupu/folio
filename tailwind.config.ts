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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        "folio-bg": "#FFFFFF",
        "folio-surface": "#F7F6F3",
        "folio-border": "#E8E7E4",
        "folio-ink": "#37352F",
        "folio-muted": "#9B9A97",
        "folio-accent": "#37352F",
        "folio-accent-lt": "#F7F6F3",
        "folio-user-bg": "#37352F",
        "folio-user-fg": "#FFFFFF",
      },
    },
  },
  plugins: [],
};

export default config;
