/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0b1020",
        canvas: "#edf2f7",
        surface: "#ffffff",
        "surface-muted": "#f7fafc",
        border: "#dce6ef",
        ink: "#111827",
        muted: "#475569",
        steel: "#8ba7bf",
        cyan: "#18c6d1",
        "cyan-dark": "#079eab",
        "cyan-soft": "#dff9fa",
        violet: "#6d4aff",
        "status-text": "#08727c",
        "success-foreground": "#166534",
        "success-background": "#dcfce7",
        error: "#b42318",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      borderRadius: {
        control: "10px",
        "2xl": "20px",
        "3xl": "24px",
      },
      borderWidth: {
        6: "6px",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        xs: ["0.75rem", { lineHeight: "1.125rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        md: ["0.875rem", { lineHeight: "1.3125rem" }],
        base: ["0.9375rem", { lineHeight: "1.40625rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.0625rem", { lineHeight: "1.59375rem" }],
        "2xl": ["1.375rem", { lineHeight: "2.0625rem" }],
        "3xl": ["1.5rem", { lineHeight: "2.25rem" }],
        "4xl": ["1.75rem", { lineHeight: "2.625rem" }],
        "5xl": ["2.25rem", { lineHeight: "2.75rem" }],
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 8%)",
      },
    },
  },
  plugins: [],
};
