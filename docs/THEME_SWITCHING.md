# Theme Switching Implementation

This document describes the theme switching functionality implemented for the Stinkster Malone application.

## Overview

The theme switching system provides a seamless dark/light mode toggle with:
- Automatic theme detection based on system preferences
- Persistent theme selection using localStorage
- Smooth transitions between themes
- Comprehensive styling for all UI components
- Cross-tab synchronization

## Implementation Files

### Core Theme Switcher
- **Location**: `/src/nodejs/kismet-operations/public/js/theme.js`
- **Purpose**: Main theme switching logic and UI toggle button
- **Features**:
  - Lightweight implementation with minimal dependencies
  - CSS-in-JS approach for dynamic theme application
  - Floating toggle button with sun/moon icons
  - Event-driven architecture for extensibility

### Integration Example
- **Location**: `/src/nodejs/kismet-operations/public/js/theme-integration-example.js`
- **Purpose**: Shows how to integrate theme switching with dynamic content
- **Use Cases**:
  - Updating chart colors
  - Adjusting canvas rendering
  - Theme-aware notifications
  - Dynamic content styling

### Demo Page
- **Location**: `/src/nodejs/kismet-operations/public/theme-demo.html`
- **Purpose**: Visual demonstration of theme switching
- **Access**: `http://localhost:8002/theme-demo.html`

## Usage

### Basic Integration

1. Add the theme script to your HTML:
```html
<script src="/js/theme.js"></script>
```

2. The theme switcher will automatically:
   - Initialize with the saved theme or system preference
   - Add a toggle button to the page
   - Apply theme styles
   - Handle all theme switching logic

### Programmatic Access

```javascript
// Toggle theme
window.StinksterTheme.toggle();

// Set specific theme
window.StinksterTheme.setTheme('light');
window.StinksterTheme.setTheme('dark');

// Get current theme
const currentTheme = window.StinksterTheme.getTheme(); // 'dark' or 'light'

// Available theme constants
const themes = window.StinksterTheme.themes; // { DARK: 'dark', LIGHT: 'light' }
```

### Event Handling

Listen for theme changes:
```javascript
window.addEventListener('themeChanged', (event) => {
    const { theme } = event.detail;
    console.log(`Theme changed to: ${theme}`);
    // Update any theme-dependent content
});
```

## Styling

### CSS Classes and Attributes

The theme is applied using the `data-theme` attribute on the document root:
- `[data-theme="dark"]` - Dark theme active
- `[data-theme="light"]` - Light theme active

### Color Palette

#### Dark Theme
- Primary: `#00d2ff` (Cyan)
- Success: `#00ff88` (Green)
- Warning: `#ffaa00` (Orange)
- Danger: `#ff4444` (Red)
- Background: `#030610` (Deep blue-black)
- Surface: `rgba(12, 22, 48, 0.95)` (Dark blue)
- Text: `#d0d8f0` (Light blue-gray)

#### Light Theme
- Primary: `#0078d4` (Azure)
- Success: `#00a85a` (Green)
- Warning: `#ff8800` (Orange)
- Danger: `#d83b01` (Red-orange)
- Background: `#f5f7fa` (Light gray)
- Surface: `rgba(255, 255, 255, 0.95)` (White)
- Text: `#1a202c` (Dark gray)

### Component Styling

All major components have theme-specific styles:
- Navigation bars and tabs
- Buttons and form controls
- Cards and panels
- Status indicators
- Data feeds and tables
- Modals and notifications

## Advanced Features

### Dynamic Content Updates

Use the theme integration utilities:
```javascript
// Get theme-appropriate color
const primaryColor = window.ThemeIntegration.getThemeColor('primary');

// Show themed notification
window.ThemeIntegration.showThemedNotification('Success!', 'success');

// Update dynamic content
window.ThemeIntegration.updateDynamicContent(theme);
```

### Canvas and Chart Updates

For canvas-based visualizations:
```javascript
// Mark canvas as theme-aware
canvas.dataset.themeAware = 'true';

// In your render loop, check theme
const theme = canvas.dataset.currentTheme || 'dark';
const colors = theme === 'dark' ? darkColors : lightColors;
```

### WebSocket and Real-time Data

The theme system works seamlessly with:
- WebSocket connections
- Real-time data feeds
- Dynamic UI updates
- Service status indicators

## Best Practices

1. **Use CSS Variables**: Leverage the provided CSS custom properties for consistency
2. **Smooth Transitions**: Apply transitions to color and background changes
3. **Accessible Contrast**: Ensure sufficient contrast ratios in both themes
4. **Test Both Themes**: Always verify UI elements look good in both modes
5. **Handle Dynamic Content**: Update dynamically generated content when theme changes

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch-friendly toggle button

## Performance

The theme switcher is optimized for performance:
- Minimal DOM manipulation
- CSS-based transitions
- Efficient event handling
- No external dependencies
- Small file size (~10KB uncompressed)

## Troubleshooting

### Theme Not Persisting
- Check localStorage is enabled
- Verify no browser extensions blocking storage
- Check console for errors

### Styling Issues
- Ensure theme script loads before other scripts
- Check for CSS specificity conflicts
- Verify all theme styles are applied

### Cross-Origin Issues
- Theme changes in iframes require same-origin
- External content may not reflect theme changes

## Future Enhancements

Potential improvements:
- Additional theme options (high contrast, custom themes)
- Theme scheduling (auto-switch at certain times)
- Per-component theme overrides
- Theme animation options
- Accessibility improvements