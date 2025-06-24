/**
 * Theme Switcher for Stinkster Malone
 * Lightweight theme switching with CSS custom properties
 */

(function () {
  'use strict';

  const THEME_KEY = 'stinkster-theme';
  const THEMES = {
    BLUE: 'blue',
    DARK: 'dark',
  };

  class ThemeManager {
    constructor() {
      this.currentTheme = this.loadTheme();
      this.init();
    }

    loadTheme() {
      // Default to original blue cyber theme
      return localStorage.getItem(THEME_KEY) || THEMES.BLUE;
    }

    saveTheme(theme) {
      localStorage.setItem(THEME_KEY, theme);
    }

    init() {
      // Apply initial theme
      this.applyTheme(this.currentTheme);

      // Create toggle button
      this.createToggleButton();

      // Listen for theme changes in other tabs
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY && e.newValue) {
          this.currentTheme = e.newValue;
          this.applyTheme(this.currentTheme);
          this.updateToggleButton();
        }
      });
    }

    applyTheme(theme) {
      // Set data-theme attribute which triggers CSS custom properties
      if (theme === THEMES.DARK) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      // Update meta theme color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      const themeColor = theme === THEMES.DARK ? '#0f172a' : '#030610';

      if (!metaThemeColor) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = themeColor;
        document.head.appendChild(meta);
      } else {
        metaThemeColor.content = themeColor;
      }
    }

    createToggleButton() {
      const button = document.createElement('button');
      button.className = 'theme-toggle-nextjs';
      button.setAttribute('aria-label', 'Toggle theme');
      button.setAttribute('title', 'Toggle between blue cyber and dark themes');

      // Add styling using CSS custom properties
      button.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                width: 40px;
                height: 40px;
                border-radius: 8px;
                border: 1px solid var(--border-accent);
                background: var(--bg-accent);
                backdrop-filter: var(--backdrop-blur);
                -webkit-backdrop-filter: var(--backdrop-blur);
                color: var(--text-accent);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease-in-out;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                outline: none;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
            `;

      // Add hover styles via CSS
      const style = document.createElement('style');
      style.textContent = `
                .theme-toggle-nextjs:hover {
                    background: var(--border-secondary) !important;
                    border-color: var(--text-accent) !important;
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px var(--border-accent) !important;
                }
                .theme-toggle-nextjs:active {
                    transform: translateY(0) !important;
                    transition: all 0.1s ease-in-out !important;
                }
                .theme-toggle-nextjs svg {
                    transition: all 0.2s ease-in-out;
                }
                @media (max-width: 768px) {
                    .theme-toggle-nextjs {
                        top: 16px !important;
                        right: 16px !important;
                        width: 36px !important;
                        height: 36px !important;
                    }
                }
            `;
      document.head.appendChild(style);

      this.toggleButton = button;
      this.updateToggleButton();

      button.addEventListener('click', () => this.toggle());

      // Add to body when DOM is ready
      if (document.body) {
        document.body.appendChild(button);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(button);
        });
      }
    }

    updateToggleButton() {
      if (!this.toggleButton) return;

      const isDark = this.currentTheme === THEMES.DARK;
      this.toggleButton.innerHTML = isDark
        ? // Sun icon for blue theme (switching back to blue)
          `<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>`
        : // Moon icon for dark theme (switching to dark)
          `<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
                </svg>`;
    }

    toggle() {
      this.currentTheme = this.currentTheme === THEMES.DARK ? THEMES.BLUE : THEMES.DARK;
      this.saveTheme(this.currentTheme);
      this.applyTheme(this.currentTheme);
      this.updateToggleButton();

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent('themeChanged', {
          detail: { theme: this.currentTheme },
        }),
      );
    }

    getTheme() {
      return this.currentTheme;
    }

    setTheme(theme) {
      if (Object.values(THEMES).includes(theme)) {
        this.currentTheme = theme;
        this.saveTheme(theme);
        this.applyTheme(theme);
        this.updateToggleButton();
      }
    }
  }

  // Initialize theme manager
  const themeManager = new ThemeManager();

  // Export to global scope
  window.StinksterTheme = {
    toggle: () => themeManager.toggle(),
    setTheme: (theme) => themeManager.setTheme(theme),
    getTheme: () => themeManager.getTheme(),
    themes: THEMES,
  };
})();
