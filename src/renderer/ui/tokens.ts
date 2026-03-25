/**
 * Design tokens for Consulta Simples CSV.
 * Inspired by Twenty UI design system (--t-*) with local brand customization.
 */

export const tokens = {
  // Brand colors (preserved from original)
  brand: {
    accent: "#8bb3ff",
    accentStrong: "#5d7df2",
  },

  // Semantic colors
  semantic: {
    success: "#32c48d",
    danger: "#f87171",
    muted: "#98a7be",
    text: "#edf4ff",
  },

  // Background layers
  background: {
    base: "#07101c",
    elevated: "rgba(12, 18, 33, 0.8)",
    surface: "rgba(14, 21, 38, 0.9)",
    surfaceStrong: "rgba(18, 27, 48, 0.98)",
  },

  // Border colors
  border: {
    default: "rgba(148, 163, 184, 0.16)",
    strong: "rgba(148, 163, 184, 0.22)",
  },

  // Shadows
  shadow: {
    default: "0 20px 64px rgba(2, 6, 23, 0.45)",
    strong: "0 30px 120px rgba(2, 6, 23, 0.68)",
  },

  // Spacing scale (base 4px, following Twenty's --t-spacing-*)
  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    7: "28px",
    8: "32px",
  },

  // Border radius scale (following Twenty's --t-border-radius-*)
  radius: {
    sm: "4px",
    md: "8px",
    lg: "14px",
    xl: "20px",
    xxl: "24px",
    pill: "999px",
  },

  // Font families
  fontFamily: {
    sans: '"Avenir Next", "Aptos", "Segoe UI Variable", "Segoe UI", sans-serif',
    mono: '"DM Mono", "Fira Code", "Consolas", monospace',
  },

  // Font sizes (following Twenty's --t-font-size-*)
  fontSize: {
    xxs: "0.625rem",
    xs: "0.78rem",
    sm: "0.84rem",
    md: "0.95rem",
    lg: "1rem",
    xl: "1.08rem",
    xxl: "1.23rem",
  },

  // Font weights
  fontWeight: {
    regular: "400",
    medium: "500",
    semiBold: "700",
  },

  // Animation durations (following Twenty's --t-animation-duration-*)
  animation: {
    fast: "140ms",
    normal: "300ms",
    slow: "420ms",
  },

  // Input heights
  input: {
    height: "48px",
    padding: "0 14px",
  },

  // Button heights
  button: {
    height: "48px",
    padding: "0 16px",
  },
} as const;

export type Tokens = typeof tokens;
