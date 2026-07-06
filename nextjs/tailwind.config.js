/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // Liquid helpers are server-only HTML/string transforms; including them in Tailwind scans has caused Turbopack + postcss ENOENT on Windows (phantom paths under this folder).
    "!./src/lib/storefront/liquid/**",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        /* Water Ice Express public site: `font-display` headings */
        display: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
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
        /** Marketing home (paperflight-nextjs-home): zip used v4 @theme; v3 uses oklch + alpha here */
        brand: {
          DEFAULT: "oklch(0.7 0.14 240 / <alpha-value>)",
          foreground: "oklch(1 0 0 / <alpha-value>)",
        },
        cta: {
          DEFAULT: "oklch(0.7 0.14 240 / <alpha-value>)",
          foreground: "oklch(1 0 0 / <alpha-value>)",
        },
        ink: {
          DEFAULT: "oklch(0.25 0.06 250 / <alpha-value>)",
          foreground: "oklch(0.98 0 0 / <alpha-value>)",
        },
        /** Water Ice Express events page palette (ported from waterice-project.zip @theme) */
        "event-page": "oklch(0.985 0.006 87.469 / <alpha-value>)",
        "event-surface": "oklch(1 0 0 / <alpha-value>)",
        "event-surface-soft": "oklch(0.965 0.012 87.47 / <alpha-value>)",
        "event-border": "oklch(0.885 0.019 88.15 / <alpha-value>)",
        "event-navy": "oklch(0.246 0.073 285.79 / <alpha-value>)",
        "event-muted": "oklch(0.496 0.028 285.74 / <alpha-value>)",
        "event-orange": "hsl(355 72% 51% / <alpha-value>)",
        "event-blue": "oklch(0.546 0.198 264.24 / <alpha-value>)",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

