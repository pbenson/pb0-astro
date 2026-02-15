import { inDarkMode } from "../../../utils/darkMode";

export function tokens() {
  const dark = inDarkMode();
  return {
    paperRaised: dark ? "#26261f" : "#faf8f3",
    ink: dark ? "#e2dfd8" : "#2a2a28",
    inkSecondary: dark ? "#a8a49c" : "#5c5a54",
    inkTertiary: dark ? "#706d66" : "#8a8780",
    gridTeal: dark ? "hsl(165, 45%, 48%)" : "hsl(165, 45%, 38%)",
    rule: dark ? "rgba(200, 195, 185, 0.10)" : "rgba(90, 85, 75, 0.12)",
  };
}

export const monoFont = "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
