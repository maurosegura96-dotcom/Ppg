// High-contrast dark palette tuned for direct-sunlight readability in the
// cockpit; see docs/PRODUCT_SPEC.md section 2.1.
export const colors = {
  background: "#0B0F14",
  surface: "#151B23",
  surfaceRaised: "#1E2630",
  border: "#2A3542",
  textPrimary: "#F5F7FA",
  textSecondary: "#9AA7B5",
  accent: "#38BDF8",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const typography = {
  hudValue: { fontSize: 44, fontWeight: "700" as const, fontVariant: ["tabular-nums" as const] },
  hudLabel: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
};

export function flyabilityColor(level: "green" | "yellow" | "red"): string {
  return level === "green" ? colors.green : level === "yellow" ? colors.amber : colors.red;
}
