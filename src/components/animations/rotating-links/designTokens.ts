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

/** Returns CSS variable references — no flash because the browser resolves them from global.css. */
export function tokens(_dark?: boolean) {
  return {
    paperRaised: "var(--paper-raised)",
    ink: "var(--ink)",
    inkSecondary: "var(--ink-secondary)",
    inkTertiary: "var(--ink-tertiary)",
    gridTeal: "var(--grid-teal)",
    gridTealBg: "var(--grid-teal-bg)",
    rule: "var(--rule)",
  };
}

export const monoFont = "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace";
