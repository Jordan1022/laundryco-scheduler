import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        paper: "hsl(var(--paper))",
        ink: {
          DEFAULT: "hsl(var(--ink))",
          dim: "hsl(var(--ink-dim))",
          muted: "hsl(var(--ink-muted))",
        },
        bleach: "hsl(var(--bleach))",
        cherry: {
          DEFAULT: "hsl(var(--cherry))",
          soft: "hsl(var(--cherry-soft))",
        },
        sage: {
          DEFAULT: "hsl(var(--sage))",
          soft: "hsl(var(--sage-soft))",
        },
        ochre: {
          DEFAULT: "hsl(var(--ochre))",
          soft: "hsl(var(--ochre-soft))",
        },
        rule: "hsl(var(--rule))",
        primary: {
          DEFAULT: "hsl(var(--ink))",
          foreground: "hsl(var(--paper))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--cherry))",
          foreground: "hsl(var(--paper))",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        ticket: "0 1px 0 hsl(var(--ink) / 0.04), 0 12px 28px -14px hsl(var(--ink) / 0.2)",
        stamp: "0 1px 0 hsl(var(--ink) / 0.08), 0 0 0 1px hsl(var(--ink) / 0.05)",
      },
      keyframes: {
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.08) rotate(-2deg)' },
          '60%': { opacity: '1', transform: 'scale(0.96) rotate(0.5deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'reveal-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'stamp-in': 'stamp-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'reveal-up': 'reveal-up 500ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'marquee': 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
}
export default config
