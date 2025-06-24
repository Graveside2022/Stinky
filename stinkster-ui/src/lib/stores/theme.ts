import { writable, derived } from 'svelte/store';
import type { ThemeConfig } from '../types';

export type Theme = 'light' | 'dark' | 'system';

// Get initial theme config from localStorage or defaults
function getInitialThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') {
    return {
      mode: 'system',
      primaryColor: '#3b82f6',
      accentColor: '#10b981',
      fontSize: 'md',
      density: 'comfortable'
    };
  }
  
  const stored = localStorage.getItem('themeConfig');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as ThemeConfig;
      return {
        mode: parsed.mode && ['light', 'dark', 'system'].includes(parsed.mode) ? parsed.mode : 'system',
        primaryColor: parsed.primaryColor || '#3b82f6',
        accentColor: parsed.accentColor || '#10b981',
        fontSize: parsed.fontSize && ['sm', 'md', 'lg'].includes(parsed.fontSize) ? parsed.fontSize : 'md',
        density: parsed.density && ['compact', 'comfortable', 'spacious'].includes(parsed.density) ? parsed.density : 'comfortable'
      };
    } catch {
      // Fall back to defaults if parsing fails
    }
  }
  
  return {
    mode: 'system',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    fontSize: 'md',
    density: 'comfortable'
  };
}

// Get initial theme from localStorage or default to system
function getInitialTheme(): Theme {
  return getInitialThemeConfig().mode;
}

// Create the theme stores
export const theme = writable<Theme>(getInitialTheme());
export const themeConfig = writable<ThemeConfig>(getInitialThemeConfig());

// Subscribe to theme changes and update localStorage + document class
theme.subscribe((value) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('theme', value);
  updateDocumentTheme(value);
});

// Subscribe to theme config changes and update localStorage
themeConfig.subscribe((config) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('themeConfig', JSON.stringify(config));
  updateDocumentTheme(config.mode);
  updateDocumentConfig(config);
});

// Derived store for the actual theme (resolving 'system' to light/dark)
export const resolvedTheme = derived(theme, ($theme) => {
  if ($theme !== 'system') return $theme;
  
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});

// Update document class based on theme
function updateDocumentTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  
  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_e) => {
    theme.update((currentTheme) => {
      if (currentTheme === 'system') {
        updateDocumentTheme('system');
      }
      return currentTheme;
    });
  });
}

// Update document config (CSS custom properties)
function updateDocumentConfig(config: ThemeConfig) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Update CSS custom properties
  root.style.setProperty('--primary-color', config.primaryColor);
  root.style.setProperty('--accent-color', config.accentColor);
  
  // Update font size class
  root.classList.remove('text-sm', 'text-md', 'text-lg');
  root.classList.add(`text-${config.fontSize}`);
  
  // Update density class
  root.classList.remove('density-compact', 'density-comfortable', 'density-spacious');
  root.classList.add(`density-${config.density}`);
}

// Derived stores for easy access to theme config properties
export const primaryColor = derived(themeConfig, ($config) => $config.primaryColor);
export const accentColor = derived(themeConfig, ($config) => $config.accentColor);
export const fontSize = derived(themeConfig, ($config) => $config.fontSize);
export const density = derived(themeConfig, ($config) => $config.density);

// Theme config update functions
export function updateThemeMode(mode: Theme) {
  theme.set(mode);
  themeConfig.update(config => ({ ...config, mode }));
}

export function updatePrimaryColor(color: string) {
  themeConfig.update(config => ({ ...config, primaryColor: color }));
}

export function updateAccentColor(color: string) {
  themeConfig.update(config => ({ ...config, accentColor: color }));
}

export function updateFontSize(size: 'sm' | 'md' | 'lg') {
  themeConfig.update(config => ({ ...config, fontSize: size }));
}

export function updateDensity(density: 'compact' | 'comfortable' | 'spacious') {
  themeConfig.update(config => ({ ...config, density }));
}

export function resetThemeConfig() {
  themeConfig.set({
    mode: 'system',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    fontSize: 'md',
    density: 'comfortable'
  });
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const initialConfig = getInitialThemeConfig();
  updateDocumentTheme(initialConfig.mode);
  updateDocumentConfig(initialConfig);
}