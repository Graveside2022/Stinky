/**
 * Theme utility functions for dynamic styling and CSS variable manipulation
 */

/**
 * CSS variable names for theme colors
 */
export const cssVariables = {
  // Primary colors
  primary: '--color-primary',
  primaryDark: '--color-primary-dark',
  primaryLight: '--color-primary-light',
  
  // Accent colors
  accent: '--color-accent',
  accentDark: '--color-accent-dark',
  accentLight: '--color-accent-light',
  
  // Background colors
  bgPrimary: '--color-bg-primary',
  bgSecondary: '--color-bg-secondary',
  bgTertiary: '--color-bg-tertiary',
  
  // Text colors
  textPrimary: '--color-text-primary',
  textSecondary: '--color-text-secondary',
  textTertiary: '--color-text-tertiary',
  
  // Status colors
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  info: '--color-info',
  
  // Effects
  glowIntensity: '--glow-intensity',
  blurAmount: '--blur-amount',
  opacity: '--opacity'
} as const;

/**
 * Get CSS variable value
 */
export function getCSSVariable(variable: string): string {
  const root = document.documentElement;
  return getComputedStyle(root).getPropertyValue(variable).trim();
}

/**
 * Set CSS variable value
 */
export function setCSSVariable(variable: string, value: string): void {
  document.documentElement.style.setProperty(variable, value);
}

/**
 * Set multiple CSS variables at once
 */
export function setCSSVariables(variables: Record<string, string>): void {
  Object.entries(variables).forEach(([key, value]) => {
    setCSSVariable(key, value);
  });
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Adjust color brightness
 */
export function adjustBrightness(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  const adjust = (value: number) => Math.max(0, Math.min(255, value + amount));
  
  return rgbToHex(
    adjust(rgb.r),
    adjust(rgb.g),
    adjust(rgb.b)
  );
}

/**
 * Calculate color luminance
 */
export function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Determine if color is light or dark
 */
export function isLightColor(color: string): boolean {
  return getLuminance(color) > 0.5;
}

/**
 * Generate color with opacity
 */
export function withOpacity(color: string, opacity: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Get current theme mode
 */
export function getThemeMode(): ThemeMode {
  const stored = localStorage.getItem('theme-mode');
  if (stored === 'light' || stored === 'dark') return stored;
  return 'auto';
}

/**
 * Set theme mode
 */
export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem('theme-mode', mode);
  applyThemeMode(mode);
}

/**
 * Apply theme mode to document
 */
export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  
  if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    mode = prefersDark ? 'dark' : 'light';
  }
  
  root.classList.remove('light', 'dark');
  root.classList.add(mode);
}

/**
 * Initialize theme system
 */
export function initializeTheme(): void {
  const mode = getThemeMode();
  applyThemeMode(mode);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentMode = getThemeMode();
    if (currentMode === 'auto') {
      applyThemeMode('auto');
    }
  });
}

/**
 * Create glow effect CSS
 */
export function createGlowEffect(color: string, intensity = 1): string {
  const rgb = hexToRgb(color);
  if (!rgb) return '';
  
  const spread1 = 10 * intensity;
  const spread2 = 20 * intensity;
  const spread3 = 40 * intensity;
  
  return `
    0 0 ${spread1}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5),
    0 0 ${spread2}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3),
    0 0 ${spread3}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)
  `;
}

/**
 * Create gradient from color palette
 */
export function createGradient(
  colors: string[],
  angle = 45,
  type: 'linear' | 'radial' = 'linear'
): string {
  if (colors.length === 0) return '';
  
  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${colors.join(', ')})`;
  } else {
    return `radial-gradient(circle, ${colors.join(', ')})`;
  }
}

/**
 * Cyberpunk color presets
 */
export const colorPresets = {
  neonGreen: '#00ff9d',
  neonPink: '#ff006e',
  neonBlue: '#00d4ff',
  neonPurple: '#bd00ff',
  darkBg: '#0a0e1a',
  darkerBg: '#050810',
  glowWhite: '#ffffff',
  metalGray: '#1a202c'
} as const;

/**
 * Generate complementary color
 */
export function getComplementaryColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  
  return rgbToHex(
    255 - rgb.r,
    255 - rgb.g,
    255 - rgb.b
  );
}

/**
 * Mix two colors
 */
export function mixColors(color1: string, color2: string, weight = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const mix = (v1: number, v2: number) => Math.round(v1 * (1 - weight) + v2 * weight);
  
  return rgbToHex(
    mix(rgb1.r, rgb2.r),
    mix(rgb1.g, rgb2.g),
    mix(rgb1.b, rgb2.b)
  );
}