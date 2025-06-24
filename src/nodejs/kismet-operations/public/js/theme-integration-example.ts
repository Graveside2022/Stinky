/**
 * Theme Integration Example
 * Shows how to integrate theme switching with dynamic content updates
 */

// Example: Update dynamic content when theme changes
window.addEventListener('themeChanged', (event) => {
    const { theme } = event.detail;
    console.log(`Theme changed to: ${theme}`);
    
    // Update any theme-specific dynamic content
    updateDynamicContent(theme);
    
    // Update charts/graphs if any
    updateChartColors(theme);
    
    // Update WebSocket data display
    updateWebSocketStyles(theme);
});

// Update dynamic content based on theme
function updateDynamicContent(theme) {
    // Example: Update status colors
    const statusElements = document.querySelectorAll('.dynamic-status');
    statusElements.forEach(el => {
        if (theme === 'light') {
            // Adjust colors for light theme visibility
            el.style.filter = 'brightness(0.8)';
        } else {
            el.style.filter = 'none';
        }
    });
    
    // Update any canvas or SVG elements
    updateCanvasElements(theme);
}

// Update chart colors for theme
function updateChartColors(theme) {
    const chartColors = {
        dark: {
            background: 'rgba(0, 210, 255, 0.1)',
            border: '#00d2ff',
            grid: 'rgba(255, 255, 255, 0.1)',
            text: '#d0d8f0'
        },
        light: {
            background: 'rgba(0, 120, 212, 0.1)',
            border: '#0078d4',
            grid: 'rgba(0, 0, 0, 0.1)',
            text: '#1a202c'
        }
    };
    
    // If using Chart.js or similar
    if (window.chartInstances) {
        window.chartInstances.forEach(chart => {
            const colors = chartColors[theme];
            chart.options.scales.x.grid.color = colors.grid;
            chart.options.scales.y.grid.color = colors.grid;
            chart.options.scales.x.ticks.color = colors.text;
            chart.options.scales.y.ticks.color = colors.text;
            chart.update();
        });
    }
}

// Update WebSocket data display styles
function updateWebSocketStyles(theme) {
    // Example: Update real-time data feeds
    const feedContainers = document.querySelectorAll('.data-feed');
    feedContainers.forEach(container => {
        if (theme === 'light') {
            container.classList.add('light-theme-feed');
        } else {
            container.classList.remove('light-theme-feed');
        }
    });
}

// Update canvas elements (like spectrum analyzer)
function updateCanvasElements(theme) {
    const canvasElements = document.querySelectorAll('canvas');
    canvasElements.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        if (ctx && canvas.dataset.themeAware === 'true') {
            // Store the theme in canvas for render loops
            canvas.dataset.currentTheme = theme;
            
            // Trigger redraw if there's a render function
            if (window[`render${canvas.id}`]) {
                window[`render${canvas.id}`]();
            }
        }
    });
}

// Helper function to get theme-appropriate colors
function getThemeColor(colorName) {
    const theme = window.StinksterTheme?.getTheme() || 'dark';
    const colors = {
        dark: {
            primary: '#00d2ff',
            success: '#00ff88',
            warning: '#ffaa00',
            danger: '#ff4444',
            background: '#030610',
            surface: 'rgba(12, 22, 48, 0.95)',
            text: '#d0d8f0',
            textMuted: '#7a8a9a'
        },
        light: {
            primary: '#0078d4',
            success: '#00a85a',
            warning: '#ff8800',
            danger: '#d83b01',
            background: '#f5f7fa',
            surface: 'rgba(255, 255, 255, 0.95)',
            text: '#1a202c',
            textMuted: '#718096'
        }
    };
    
    return colors[theme][colorName] || colors.dark[colorName];
}

// Example: Theme-aware notification
function showThemedNotification(message, type = 'info': string) {
    const notification = document.createElement('div');
    notification.className = 'themed-notification';
    notification.textContent = message;
    
    // Apply theme-appropriate styles
    const theme = window.StinksterTheme?.getTheme() || 'dark';
    const colors = {
        info: getThemeColor('primary'),
        success: getThemeColor('success'),
        warning: getThemeColor('warning'),
        error: getThemeColor('danger')
    };
    
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${getThemeColor('surface')};
        border: 1px solid ${colors[type]};
        color: ${colors[type]};
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Example: Initialize theme-aware components
function initializeThemeAwareComponents() {
    // Set up any theme-aware tooltips
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            const tooltip = document.createElement('div');
            tooltip.className = 'theme-tooltip';
            tooltip.textContent = e.target.dataset.tooltip;
            tooltip.style.background = getThemeColor('surface');
            tooltip.style.color = getThemeColor('text');
            tooltip.style.border = `1px solid ${getThemeColor('primary')}`;
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = e.target.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
            tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
        });
    });
}

// Export utility functions
window.ThemeIntegration = {
    getThemeColor,
    showThemedNotification,
    updateDynamicContent,
    initializeThemeAwareComponents
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThemeAwareComponents);
} else {
    initializeThemeAwareComponents();
}