import { useEffect, useState } from 'react';

/**
 * Chart colors for the finance visualizations.
 *
 * These are resolved hex values rather than CSS variable references because d3
 * interpolates them — a `var(--x)` string cannot be mixed or darkened. They sit
 * in the same hue families as the site tokens (graph-paper teal, blueprint blue,
 * birch amber) but are snapped to the nearest step that clears the palette
 * checks: OKLCH lightness band, chroma floor, CVD separation, and contrast
 * against each mode's surface.
 *
 * Verified with the dataviz palette validator against surfaces #f5f2eb (light)
 * and #1e1e1c (dark); worst-case CVD separation between the diverging poles is
 * ΔE 20.3 light / 22.4 dark under protanopia.
 */
export interface ChartPalette {
  /** Single hue for every histogram panel — see note on identity below. */
  readonly distribution: string;
  /** Diverging poles for correlation: cool = negative, warm = positive. */
  readonly negative: string;
  readonly positive: string;
  /** Scatter marks: neutral ink, never a series color. */
  readonly mark: string;
  readonly rule: string;
  readonly ruleEmphasis: string;
  readonly ink: string;
  readonly inkSecondary: string;
  readonly inkTertiary: string;
  readonly surface: string;
}

const LIGHT: ChartPalette = {
  distribution: '#1d8a6f',
  negative: '#226ba0',
  positive: '#a5731d',
  mark: '#5c5a54',
  rule: 'rgba(90, 85, 75, 0.12)',
  ruleEmphasis: 'rgba(90, 85, 75, 0.25)',
  ink: '#2a2a28',
  inkSecondary: '#5c5a54',
  inkTertiary: '#8a8780',
  surface: '#f5f2eb',
};

const DARK: ChartPalette = {
  distribution: '#3ba286',
  negative: '#3b91ce',
  positive: '#bd8829',
  mark: '#a8a49c',
  rule: 'rgba(200, 195, 185, 0.10)',
  ruleEmphasis: 'rgba(200, 195, 185, 0.20)',
  ink: '#e2dfd8',
  inkSecondary: '#a8a49c',
  inkTertiary: '#706d66',
  surface: '#1e1e1c',
};

function isDark(): boolean {
  if (typeof document === 'undefined') return true; // dark is the site default
  return document.documentElement.classList.contains('dark');
}

/** Tracks the site theme toggle, which flips a class on <html>. */
export function useChartPalette(): ChartPalette {
  // Seed with the server's assumption rather than reading the DOM, so the first
  // client render reproduces the server HTML exactly. Reading the real theme
  // here instead would make hydration disagree on every fill attribute, and
  // React 19 leaves mismatched attributes in place — after which the effect
  // below computes the value this render already used, no state changes, and
  // the dark palette stays stranded on a light page.
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(isDark()); // the server had to guess; correct it now

    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return dark ? DARK : LIGHT;
}
