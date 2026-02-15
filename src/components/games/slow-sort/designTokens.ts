import { useState, useEffect } from "react";

function isDark(): boolean {
  if (typeof document === 'undefined') return true; // default to dark (site default)
  return document.documentElement.classList.contains('dark');
}

/** Hook that returns true in dark mode, re-evaluates after hydration and on theme toggle. */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() => isDark());

  useEffect(() => {
    // Re-evaluate after mount (SSR may have guessed wrong)
    setDark(isDark());

    // Watch for theme toggles via class changes on <html>
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

export function tokens(dark: boolean) {
  return {
    paperRaised: dark ? "#26261f" : "#faf8f3",
    ink: dark ? "#e2dfd8" : "#2a2a28",
    inkSecondary: dark ? "#a8a49c" : "#5c5a54",
    inkTertiary: dark ? "#706d66" : "#8a8780",
    gridTeal: dark ? "hsl(165, 45%, 48%)" : "hsl(165, 45%, 38%)",
    gridTealBg: dark ? "hsla(165, 45%, 48%, 0.1)" : "hsla(165, 45%, 38%, 0.1)",
    rule: dark ? "rgba(200, 195, 185, 0.10)" : "rgba(90, 85, 75, 0.12)",
  };
}

export const monoFont = "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
