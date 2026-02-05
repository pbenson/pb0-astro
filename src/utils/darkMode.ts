/**
 * Dark mode utilities using browser's prefers-color-scheme
 * Works with CSS variables defined in global.css
 */

export function inDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function bgColor(): string {
  return inDarkMode() ? '#1a1a1a' : '#ffffff';
}

export function fgColor(): string {
  return inDarkMode() ? '#FFA500' : '#ffffff';
}

export function strokeColor(): string {
  return inDarkMode() ? '#FFA500' : '#000000';
}

export function strokeColorRgb(): number[] {
  return inDarkMode() ? [255, 165, 0] : [0, 0, 0];
}

/**
 * Subscribe to dark mode changes
 */
export function onDarkModeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
