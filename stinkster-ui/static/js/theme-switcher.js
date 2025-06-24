/**
 * Theme Switcher Module for Stinkster Malone
 * Handles dark/light theme switching with localStorage persistence
 */

(function() {
    'use strict';

    // Theme constants
    const THEME_KEY = 'stinkster-theme';
    const THEMES = {
        DARK: 'dark',
        LIGHT: 'light'
    };

    // Default theme - Blue Cyber Theme (dark theme is the primary Stinkster theme)
    const DEFAULT_THEME = THEMES.DARK;

    // CSS custom properties for themes
    const themeProperties = {
        dark: {
            // Primary colors
            '--bg-primary': '#030610',
            '--bg-secondary': '#0a1628',
            '--bg-surface': 'rgba(10, 22, 40, 0.95)',
            '--bg-surface-alt': 'rgba(10, 22, 40, 0.85)',
            '--bg-input': 'rgba(15, 30, 50, 1)',
            
            // Text colors
            '--text-primary': '#d0d8f0',
            '--text-secondary': '#b8c5e0',
            '--text-muted': '#7a8a9a',
            '--text-bright': '#ffffff',
            
            // Accent colors
            '--accent-primary': '#00d2ff',
            '--accent-success': '#00ff88',
            '--accent-warning': '#ffaa00',
            '--accent-danger': '#ff4444',
            
            // Border colors
            '--border-primary': 'rgba(0, 210, 255, 0.3)',
            '--border-secondary': 'rgba(0, 210, 255, 0.2)',
            '--border-active': '#00d2ff',
            
            // Gradient backgrounds
            '--gradient-bg': 'linear-gradient(135deg, #030610 0%, #0a1628 50%, #030610 100%)',
            '--gradient-surface': 'linear-gradient(90deg, rgba(0, 210, 255, 0.1) 0%, rgba(0, 210, 255, 0.2) 50%, rgba(0, 210, 255, 0.1) 100%)',
            
            // Shadow effects
            '--shadow-glow': '0 0 20px rgba(0, 220, 255, 0.6)',
            '--shadow-glow-intense': '0 0 30px rgba(0, 220, 255, 0.9), 0 0 40px rgba(0, 220, 255, 0.6)',
            
            // Status colors
            '--status-online': '#00ff88',
            '--status-offline': '#525252',
            '--status-error': '#ff4444'
        },
        light: {
            // Primary colors
            '--bg-primary': '#f5f7fa',
            '--bg-secondary': '#ffffff',
            '--bg-surface': 'rgba(255, 255, 255, 0.95)',
            '--bg-surface-alt': 'rgba(248, 249, 251, 0.95)',
            '--bg-input': 'rgba(255, 255, 255, 1)',
            
            // Text colors
            '--text-primary': '#1a202c',
            '--text-secondary': '#4a5568',
            '--text-muted': '#718096',
            '--text-bright': '#000000',
            
            // Accent colors
            '--accent-primary': '#0078d4',
            '--accent-success': '#00a85a',
            '--accent-warning': '#ff8800',
            '--accent-danger': '#d83b01',
            
            // Border colors
            '--border-primary': 'rgba(0, 120, 212, 0.3)',
            '--border-secondary': 'rgba(0, 120, 212, 0.4)',
            '--border-active': '#0078d4',
            
            // Gradient backgrounds
            '--gradient-bg': 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 50%, #f5f7fa 100%)',
            '--gradient-surface': 'linear-gradient(90deg, rgba(0, 120, 212, 0.05) 0%, rgba(0, 120, 212, 0.1) 50%, rgba(0, 120, 212, 0.05) 100%)',
            
            // Shadow effects
            '--shadow-glow': '0 0 10px rgba(0, 120, 212, 0.2)',
            '--shadow-glow-intense': '0 0 15px rgba(0, 120, 212, 0.3), 0 0 20px rgba(0, 120, 212, 0.2)',
            
            // Status colors
            '--status-online': '#00a85a',
            '--status-offline': '#a0a0a0',
            '--status-error': '#d83b01'
        }
    };

    // Theme manager class
    class ThemeManager {
        constructor() {
            this.currentTheme = this.loadTheme();
            this.initializeTheme();
            this.setupEventListeners();
            this.createThemeToggle();
        }

        /**
         * Load theme from localStorage or use default (Blue Cyber Theme)
         */
        loadTheme() {
            const savedTheme = localStorage.getItem(THEME_KEY);
            if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
                return savedTheme;
            }
            
            // Always default to Blue Cyber Theme (dark theme) - this is the primary Stinkster theme
            // We ignore system preference to ensure users see the signature blue cyber aesthetic
            return DEFAULT_THEME;
        }

        /**
         * Save theme to localStorage
         */
        saveTheme(theme) {
            localStorage.setItem(THEME_KEY, theme);
        }

        /**
         * Initialize theme on page load
         */
        initializeTheme() {
            this.applyTheme(this.currentTheme);
        }

        /**
         * Apply theme to document
         */
        applyTheme(theme) {
            // Set data-theme attribute
            document.documentElement.setAttribute('data-theme', theme);
            document.body.setAttribute('data-theme', theme);

            // Apply CSS custom properties
            const properties = themeProperties[theme];
            Object.entries(properties).forEach(([property, value]) => {
                document.documentElement.style.setProperty(property, value);
            });

            // Update theme-specific elements
            this.updateThemeElements(theme);

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
        }

        /**
         * Update theme-specific elements
         */
        updateThemeElements(theme) {
            // Update meta theme-color
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.content = theme === THEMES.DARK ? '#030610' : '#f5f7fa';
            }

            // Update scrollbar styles
            this.updateScrollbarStyles(theme);

            // Update iframe content if needed
            this.updateIframeThemes(theme);
        }

        /**
         * Update scrollbar styles for the theme
         */
        updateScrollbarStyles(theme) {
            const scrollbarStyle = document.getElementById('theme-scrollbar-style') || document.createElement('style');
            scrollbarStyle.id = 'theme-scrollbar-style';
            
            if (theme === THEMES.DARK) {
                scrollbarStyle.textContent = `
                    /* Dark theme scrollbar */
                    ::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }
                    ::-webkit-scrollbar-track {
                        background: rgba(3, 6, 16, 0.5);
                    }
                    ::-webkit-scrollbar-thumb {
                        background: rgba(0, 210, 255, 0.3);
                        border-radius: 4px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 210, 255, 0.5);
                    }
                `;
            } else {
                scrollbarStyle.textContent = `
                    /* Light theme scrollbar */
                    ::-webkit-scrollbar {
                        width: 8px;
                        height: 8px;
                    }
                    ::-webkit-scrollbar-track {
                        background: #f1f1f1;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #c1c1c1;
                        border-radius: 4px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #a1a1a1;
                    }
                `;
            }
            
            if (!scrollbarStyle.parentNode) {
                document.head.appendChild(scrollbarStyle);
            }
        }

        /**
         * Update iframe themes
         */
        updateIframeThemes(theme) {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    // Only update if same origin
                    if (iframe.contentDocument) {
                        iframe.contentDocument.documentElement.setAttribute('data-theme', theme);
                    }
                } catch (e) {
                    // Cross-origin iframe, skip
                }
            });
        }

        /**
         * Toggle between themes
         */
        toggleTheme() {
            this.currentTheme = this.currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
            this.saveTheme(this.currentTheme);
            this.applyTheme(this.currentTheme);
            this.updateToggleButton();
        }

        /**
         * Create theme toggle button
         */
        createThemeToggle() {
            // Check if button already exists
            let toggleButton = document.getElementById('theme-toggle');
            
            if (!toggleButton) {
                // Create button
                toggleButton = document.createElement('button');
                toggleButton.id = 'theme-toggle';
                toggleButton.className = 'theme-toggle-button';
                toggleButton.setAttribute('aria-label', 'Toggle theme');
                toggleButton.setAttribute('title', 'Toggle dark/light theme');
                
                // Add button styles
                const buttonStyles = `
                    .theme-toggle-button {
                        position: fixed;
                        top: 1rem;
                        right: 1rem;
                        z-index: 1000;
                        background: var(--bg-surface, rgba(10, 22, 40, 0.95));
                        border: 1px solid var(--border-primary, rgba(0, 210, 255, 0.3));
                        border-radius: 50%;
                        width: 44px;
                        height: 44px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: var(--shadow-glow, 0 0 20px rgba(0, 220, 255, 0.6));
                    }
                    
                    .theme-toggle-button:hover {
                        background: var(--bg-surface-alt, rgba(10, 22, 40, 0.85));
                        border-color: var(--border-active, #00d2ff);
                        transform: scale(1.1);
                    }
                    
                    .theme-toggle-button:active {
                        transform: scale(0.95);
                    }
                    
                    .theme-toggle-button svg {
                        width: 24px;
                        height: 24px;
                        fill: var(--accent-primary, #00d2ff);
                        transition: all 0.3s ease;
                    }
                    
                    .theme-toggle-button:hover svg {
                        fill: var(--text-bright, #fff);
                    }
                    
                    /* Mobile adjustments */
                    @media (max-width: 768px) {
                        .theme-toggle-button {
                            top: 0.5rem;
                            right: 0.5rem;
                            width: 40px;
                            height: 40px;
                        }
                        
                        .theme-toggle-button svg {
                            width: 20px;
                            height: 20px;
                        }
                    }
                `;
                
                // Add styles if not already present
                if (!document.getElementById('theme-toggle-styles')) {
                    const styleSheet = document.createElement('style');
                    styleSheet.id = 'theme-toggle-styles';
                    styleSheet.textContent = buttonStyles;
                    document.head.appendChild(styleSheet);
                }
                
                // Add to page
                document.body.appendChild(toggleButton);
            }
            
            this.toggleButton = toggleButton;
            this.updateToggleButton();
        }

        /**
         * Update toggle button icon
         */
        updateToggleButton() {
            if (!this.toggleButton) return;
            
            const isDark = this.currentTheme === THEMES.DARK;
            
            // Update icon
            this.toggleButton.innerHTML = isDark ? `
                <!-- Sun icon for light mode -->
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                </svg>
            ` : `
                <!-- Moon icon for dark mode -->
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
                </svg>
            `;
            
            // Update aria-label
            this.toggleButton.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
        }

        /**
         * Setup event listeners
         */
        setupEventListeners() {
            // Theme toggle click
            document.addEventListener('click', (e) => {
                if (e.target.closest('#theme-toggle')) {
                    this.toggleTheme();
                }
            });

            // Listen for system theme changes
            if (window.matchMedia) {
                const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
                darkModeQuery.addEventListener('change', (e) => {
                    // Only auto-switch if user hasn't manually set a preference
                    if (!localStorage.getItem(THEME_KEY)) {
                        this.currentTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
                        this.applyTheme(this.currentTheme);
                        this.updateToggleButton();
                    }
                });
            }

            // Listen for storage events (theme changed in another tab)
            window.addEventListener('storage', (e) => {
                if (e.key === THEME_KEY && e.newValue) {
                    this.currentTheme = e.newValue;
                    this.applyTheme(this.currentTheme);
                    this.updateToggleButton();
                }
            });
        }

        /**
         * Get current theme
         */
        getTheme() {
            return this.currentTheme;
        }

        /**
         * Set theme programmatically
         */
        setTheme(theme) {
            if (Object.values(THEMES).includes(theme)) {
                this.currentTheme = theme;
                this.saveTheme(theme);
                this.applyTheme(theme);
                this.updateToggleButton();
            }
        }
    }

    // Initialize theme manager when DOM is ready
    let themeManager;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            themeManager = new ThemeManager();
        });
    } else {
        themeManager = new ThemeManager();
    }

    // Export to global scope for programmatic access
    window.StinksterTheme = {
        manager: () => themeManager,
        toggle: () => themeManager?.toggleTheme(),
        setTheme: (theme) => themeManager?.setTheme(theme),
        getTheme: () => themeManager?.getTheme(),
        themes: THEMES
    };

})();