import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class", "class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "cyber-cyan": "#e5e5e5",
        "digital-yellow": "#e5e5e5",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        spotlight: {
          "0%": {
            background: "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.04) 0%, transparent 50%)",
          },
          "25%": {
            background: "radial-gradient(circle at 100% 0%, rgba(255,255,255,0.04) 0%, transparent 50%)",
          },
          "50%": {
            background: "radial-gradient(circle at 100% 100%, rgba(255,255,255,0.04) 0%, transparent 50%)",
          },
          "75%": {
            background: "radial-gradient(circle at 0% 100%, rgba(255,255,255,0.04) 0%, transparent 50%)",
          },
          "100%": {
            background: "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.04) 0%, transparent 50%)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "line-flow": {
          "0%": { strokeDashoffset: "0" },
          "100%": { strokeDashoffset: "-1600" },
        },
      },
      animation: {
        spotlight: "spotlight 8s ease-in-out infinite",
        "fade-in": "fade-in 1s ease-out forwards",
        "line-flow": "line-flow 20s linear infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
