/**
 * Dark mode utilities using document class (matches site theme toggle)
 */

export function inDarkMode(): boolean {
  if (typeof document === 'undefined') return true; // default to dark (site default)
  return document.documentElement.classList.contains('dark');
}

export function bgColor(): string {
  if (typeof document === 'undefined') return '#1e1e1c';
  return getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || (inDarkMode() ? '#1e1e1c' : '#f5f2eb');
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
 * Subscribe to dark mode changes via class mutations on <html>
 */
export function onDarkModeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const observer = new MutationObserver(() => callback(inDarkMode()));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
