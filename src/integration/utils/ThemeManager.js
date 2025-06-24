/**
 * Theme Manager
 * Provides consistent theming across all Stinkster applications
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.themes = this.defineThemes();
        this.listeners = new Set();
        this.customProperties = new Map();
        
        // Load saved theme
        this.loadTheme();
        
        // Setup theme sync
        this.setupThemeSync();
    }

    // Define available themes
    defineThemes() {
        return {
            dark: {
                name: 'Dark Cyber',
                type: 'dark',
                colors: {
                    // Primary colors
                    primary: '#00d2ff',
                    secondary: '#7c3aed',
                    accent: '#00ff88',
                    warning: '#ffcc00',
                    error: '#ff4444',
                    success: '#00ff00',
                    
                    // Background colors
                    bgPrimary: '#030610',
                    bgSecondary: '#0a1428',
                    bgAccent: 'rgba(20, 20, 20, 0.95)',
                    bgContent: 'rgba(20, 20, 20, 0.85)',
                    bgInput: 'rgba(26, 26, 26, 1)',
                    bgHover: 'rgba(255, 255, 255, 0.05)',
                    bgActive: 'rgba(0, 210, 255, 0.15)',
                    
                    // Text colors
                    textPrimary: '#ffffff',
                    textSecondary: '#b8c5e0',
                    textMuted: '#7a8a9a',
                    textAccent: '#00d2ff',
                    
                    // Border colors
                    borderPrimary: 'rgba(64, 64, 64, 0.3)',
                    borderSecondary: 'rgba(124, 58, 237, 0.4)',
                    borderAccent: 'rgba(0, 210, 255, 0.35)',
                    
                    // App-specific accent colors
                    kismetAccent: '#00d2ff',
                    hackrfAccent: '#00ff00',
                    wigleAccent: '#ffcc00'
                },
                gradients: {
                    primary: 'linear-gradient(135deg, #030610 0%, #0a1428 50%, #030610 100%)',
                    header: 'linear-gradient(90deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.2) 50%, rgba(124, 58, 237, 0.1) 100%)',
                    button: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)',
                    card: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.95) 100%)'
                },
                effects: {
                    glowPrimary: '0 0 20px rgba(124, 58, 237, 0.6)',
                    glowSecondary: '0 0 30px rgba(124, 58, 237, 0.9), 0 0 40px rgba(124, 58, 237, 0.6)',
                    glowAccent: '0 0 15px rgba(0, 210, 255, 0.8)',
                    backdropBlur: 'blur(12px)',
                    shadow: '0 4px 6px rgba(0, 0, 0, 0.5)',
                    shadowLarge: '0 10px 20px rgba(0, 0, 0, 0.7)'
                }
            },
            light: {
                name: 'Light Modern',
                type: 'light',
                colors: {
                    // Primary colors
                    primary: '#0066cc',
                    secondary: '#6200ea',
                    accent: '#00c853',
                    warning: '#ff9800',
                    error: '#d32f2f',
                    success: '#2e7d32',
                    
                    // Background colors
                    bgPrimary: '#ffffff',
                    bgSecondary: '#f5f5f5',
                    bgAccent: 'rgba(240, 240, 240, 0.95)',
                    bgContent: 'rgba(255, 255, 255, 0.95)',
                    bgInput: 'rgba(245, 245, 245, 1)',
                    bgHover: 'rgba(0, 0, 0, 0.04)',
                    bgActive: 'rgba(0, 102, 204, 0.1)',
                    
                    // Text colors
                    textPrimary: '#1a1a1a',
                    textSecondary: '#666666',
                    textMuted: '#999999',
                    textAccent: '#0066cc',
                    
                    // Border colors
                    borderPrimary: 'rgba(0, 0, 0, 0.12)',
                    borderSecondary: 'rgba(98, 0, 234, 0.3)',
                    borderAccent: 'rgba(0, 102, 204, 0.3)',
                    
                    // App-specific accent colors
                    kismetAccent: '#0066cc',
                    hackrfAccent: '#00c853',
                    wigleAccent: '#ff9800'
                },
                gradients: {
                    primary: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                    header: 'linear-gradient(90deg, rgba(98, 0, 234, 0.05) 0%, rgba(98, 0, 234, 0.1) 50%, rgba(98, 0, 234, 0.05) 100%)',
                    button: 'linear-gradient(135deg, rgba(98, 0, 234, 0.1) 0%, rgba(98, 0, 234, 0.05) 100%)',
                    card: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(250, 250, 250, 1) 100%)'
                },
                effects: {
                    glowPrimary: '0 0 10px rgba(98, 0, 234, 0.3)',
                    glowSecondary: '0 0 15px rgba(98, 0, 234, 0.4)',
                    glowAccent: '0 0 10px rgba(0, 102, 204, 0.4)',
                    backdropBlur: 'blur(8px)',
                    shadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    shadowLarge: '0 8px 16px rgba(0, 0, 0, 0.15)'
                }
            },
            matrix: {
                name: 'Matrix',
                type: 'dark',
                colors: {
                    primary: '#00ff00',
                    secondary: '#008f00',
                    accent: '#00ff00',
                    warning: '#ffff00',
                    error: '#ff0000',
                    success: '#00ff00',
                    
                    bgPrimary: '#000000',
                    bgSecondary: '#0a0a0a',
                    bgAccent: 'rgba(0, 20, 0, 0.95)',
                    bgContent: 'rgba(0, 10, 0, 0.9)',
                    bgInput: 'rgba(0, 30, 0, 0.8)',
                    bgHover: 'rgba(0, 255, 0, 0.05)',
                    bgActive: 'rgba(0, 255, 0, 0.1)',
                    
                    textPrimary: '#00ff00',
                    textSecondary: '#00cc00',
                    textMuted: '#008800',
                    textAccent: '#00ff00',
                    
                    borderPrimary: 'rgba(0, 255, 0, 0.3)',
                    borderSecondary: 'rgba(0, 255, 0, 0.5)',
                    borderAccent: 'rgba(0, 255, 0, 0.7)',
                    
                    kismetAccent: '#00ff00',
                    hackrfAccent: '#00ff00',
                    wigleAccent: '#ffff00'
                },
                gradients: {
                    primary: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
                    header: 'linear-gradient(90deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 255, 0, 0.2) 50%, rgba(0, 255, 0, 0.1) 100%)',
                    button: 'linear-gradient(135deg, rgba(0, 255, 0, 0.2) 0%, rgba(0, 255, 0, 0.1) 100%)',
                    card: 'linear-gradient(135deg, rgba(0, 20, 0, 0.9) 0%, rgba(0, 10, 0, 0.95) 100%)'
                },
                effects: {
                    glowPrimary: '0 0 20px rgba(0, 255, 0, 0.8)',
                    glowSecondary: '0 0 30px rgba(0, 255, 0, 1)',
                    glowAccent: '0 0 15px rgba(0, 255, 0, 0.9)',
                    backdropBlur: 'blur(4px)',
                    shadow: '0 4px 6px rgba(0, 255, 0, 0.2)',
                    shadowLarge: '0 10px 20px rgba(0, 255, 0, 0.3)'
                }
            }
        };
    }

    // Load saved theme
    loadTheme() {
        const saved = localStorage.getItem('stinkster-theme');
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        }
        
        // Apply theme immediately
        this.applyTheme(this.currentTheme);
    }

    // Setup theme synchronization
    setupThemeSync() {
        // Listen for theme changes from other tabs/apps
        window.addEventListener('storage', (event) => {
            if (event.key === 'stinkster-theme' && event.newValue) {
                if (event.newValue !== this.currentTheme) {
                    this.setTheme(event.newValue);
                }
            }
        });

        // Listen for theme change messages
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'stinkster-theme-change') {
                this.setTheme(event.data.theme);
            }
        });
    }

    // Set theme
    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`Theme not found: ${themeName}`);
            return false;
        }

        this.currentTheme = themeName;
        this.applyTheme(themeName);
        
        // Save preference
        localStorage.setItem('stinkster-theme', themeName);
        
        // Notify listeners
        this.notifyListeners();
        
        // Broadcast change
        this.broadcastThemeChange();
        
        return true;
    }

    // Apply theme to document
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;

        // Set data-theme attribute
        document.documentElement.setAttribute('data-theme', themeName);
        document.body.setAttribute('data-theme', themeName);

        // Create CSS variables
        const cssVars = this.generateCSSVariables(theme);
        
        // Apply CSS variables
        this.applyCSSVariables(cssVars);
        
        // Apply any custom properties
        this.applyCustomProperties();
    }

    // Generate CSS variables from theme
    generateCSSVariables(theme) {
        const vars = {};
        
        // Colors
        Object.entries(theme.colors).forEach(([key, value]) => {
            const varName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            vars[`--${varName}`] = value;
        });
        
        // Gradients
        Object.entries(theme.gradients).forEach(([key, value]) => {
            const varName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            vars[`--gradient-${varName}`] = value;
        });
        
        // Effects
        Object.entries(theme.effects).forEach(([key, value]) => {
            const varName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            vars[`--${varName}`] = value;
        });
        
        return vars;
    }

    // Apply CSS variables to document
    applyCSSVariables(vars) {
        const root = document.documentElement;
        
        Object.entries(vars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    }

    // Apply custom properties
    applyCustomProperties() {
        this.customProperties.forEach((value, key) => {
            document.documentElement.style.setProperty(key, value);
        });
    }

    // Get current theme
    getTheme() {
        return this.currentTheme;
    }

    // Get theme object
    getThemeData(themeName = this.currentTheme) {
        return this.themes[themeName];
    }

    // Get specific theme value
    getThemeValue(path, themeName = this.currentTheme) {
        const theme = this.themes[themeName];
        if (!theme) return null;
        
        // Navigate path (e.g., 'colors.primary')
        const parts = path.split('.');
        let value = theme;
        
        for (const part of parts) {
            value = value[part];
            if (value === undefined) return null;
        }
        
        return value;
    }

    // Set custom CSS property
    setCustomProperty(key, value) {
        this.customProperties.set(key, value);
        document.documentElement.style.setProperty(key, value);
    }

    // Add theme change listener
    onChange(callback) {
        this.listeners.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    // Notify listeners
    notifyListeners() {
        const themeData = this.getThemeData();
        
        this.listeners.forEach(callback => {
            try {
                callback(this.currentTheme, themeData);
            } catch (error) {
                console.error('Theme listener error:', error);
            }
        });
    }

    // Broadcast theme change
    broadcastThemeChange() {
        // Post to all iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                iframe.contentWindow.postMessage({
                    type: 'stinkster-theme-change',
                    theme: this.currentTheme
                }, '*');
            } catch (error) {
                console.error('Failed to post theme change to iframe:', error);
            }
        });
    }

    // Get app-specific accent color
    getAppAccent(app) {
        const theme = this.getThemeData();
        const accentKey = `${app}Accent`;
        return theme.colors[accentKey] || theme.colors.primary;
    }

    // Create theme CSS
    generateThemeCSS(themeName = this.currentTheme) {
        const theme = this.themes[themeName];
        if (!theme) return '';
        
        const vars = this.generateCSSVariables(theme);
        const cssRules = Object.entries(vars)
            .map(([key, value]) => `    ${key}: ${value};`)
            .join('\n');
        
        return `
/* Stinkster Theme: ${theme.name} */
[data-theme="${themeName}"] {
${cssRules}
}

/* Theme-specific styles */
[data-theme="${themeName}"] body {
    background: var(--bg-primary);
    color: var(--text-primary);
}

[data-theme="${themeName}"] a {
    color: var(--text-accent);
}

[data-theme="${themeName}"] button {
    background: var(--gradient-button);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
}

[data-theme="${themeName}"] input,
[data-theme="${themeName}"] select,
[data-theme="${themeName}"] textarea {
    background: var(--bg-input);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
}

[data-theme="${themeName}"] .card {
    background: var(--gradient-card);
    border: 1px solid var(--border-primary);
}
        `;
    }

    // Export all themes as CSS
    exportAllThemesCSS() {
        return Object.keys(this.themes)
            .map(themeName => this.generateThemeCSS(themeName))
            .join('\n\n');
    }
}

// Create singleton instance
const themeManager = new ThemeManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = themeManager;
} else {
    window.themeManager = themeManager;
}