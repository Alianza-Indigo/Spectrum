import type { Config } from "tailwindcss";

/**
 * SPECTRUM design system.
 * Dark graphite / night-blue base with spectral accents (indigo, violet, cyan, magenta).
 * Colors are exposed as CSS variables in globals.css so a light theme can override them.
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS variables.
        base: "rgb(var(--spx-base) / <alpha-value>)",
        surface: "rgb(var(--spx-surface) / <alpha-value>)",
        "surface-raised": "rgb(var(--spx-surface-raised) / <alpha-value>)",
        border: "rgb(var(--spx-border) / <alpha-value>)",
        foreground: "rgb(var(--spx-foreground) / <alpha-value>)",
        muted: "rgb(var(--spx-muted) / <alpha-value>)",
        // Spectral palette.
        indigo: "rgb(var(--spx-indigo) / <alpha-value>)",
        violet: "rgb(var(--spx-violet) / <alpha-value>)",
        cyan: "rgb(var(--spx-cyan) / <alpha-value>)",
        magenta: "rgb(var(--spx-magenta) / <alpha-value>)",
        // States.
        success: "rgb(var(--spx-success) / <alpha-value>)",
        warning: "rgb(var(--spx-warning) / <alpha-value>)",
        danger: "rgb(var(--spx-danger) / <alpha-value>)",
        info: "rgb(var(--spx-info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        spectral: "0 0 0 1px rgb(var(--spx-border) / 0.6), 0 18px 60px -25px rgb(var(--spx-indigo) / 0.55)",
      },
      backgroundImage: {
        "spectral-line":
          "linear-gradient(90deg, rgb(var(--spx-indigo)), rgb(var(--spx-violet)), rgb(var(--spx-cyan)), rgb(var(--spx-magenta)))",
      },
      keyframes: {
        "spectral-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.55" },
          "50%": { transform: "translate3d(2%, -3%, 0) scale(1.08)", opacity: "0.8" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "spectral-drift": "spectral-drift 18s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
