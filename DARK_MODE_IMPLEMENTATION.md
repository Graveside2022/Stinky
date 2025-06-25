# Dark Mode Implementation for Stinkster Malone

## Overview

A complete dark mode solution has been implemented for the Kismet Operations Center using CSS custom properties (CSS variables) for seamless theme switching.

## Color Palette

### Dark Theme (Default)
- **Backgrounds:**
  - Primary: `#0a0a0a` (Deep black)
  - Secondary: `#141414` (Dark gray)
  - Tertiary: `#1a1a1a` (Medium dark gray)
  - Panel: `rgba(20, 20, 20, 0.95)` (Semi-transparent dark)

- **Text:**
  - Primary: `#ffffff` (White)
  - Secondary: `#a3a3a3` (Light gray)
  - Muted: `#737373` (Medium gray)

- **Borders:**
  - Primary: `#262626` (Dark border)
  - Secondary: `rgba(38, 38, 38, 0.5)` (Semi-transparent border)

- **Accents:**
  - Primary: `#0ea5e9` (Cyan replacement - Sky blue)
  - Success: `#10b981` (Green)
  - Error: `#ef4444` (Red)
  - Warning: `#f59e0b` (Orange)

### Light Theme
- Clean, professional light palette with appropriate contrast
- All colors adjusted for readability in bright environments

## Implementation Details

### 1. CSS Custom Properties
Located at the root of `index_mobile_optimized.html`:
```css
:root {
    --bg-primary: #0a0a0a;
    --text-primary: #ffffff;
    --accent-primary: #0ea5e9;
    /* ... more variables ... */
}

[data-theme="light"] {
    --bg-primary: #ffffff;
    --text-primary: #171717;
    --accent-primary: #0284c7;
    /* ... light theme overrides ... */
}
```

### 2. Theme Toggle Button
- Fixed position button (bottom-right corner)
- Circular design with icon
- Smooth hover effects
- Responsive sizing for mobile

### 3. JavaScript Theme Manager
Located in `/public/js/theme.js`:
- Automatic theme persistence using localStorage
- Cross-tab synchronization
- Smooth transitions
- Custom event dispatching

## Usage

### Switching Themes
1. Click the theme toggle button (bottom-right corner)
2. Theme preference is saved automatically
3. Theme persists across page reloads

### JavaScript API
```javascript
// Toggle theme
StinksterTheme.toggle();

// Set specific theme
StinksterTheme.setTheme('light');
StinksterTheme.setTheme('dark');

// Get current theme
const currentTheme = StinksterTheme.getTheme();

// Listen for theme changes
window.addEventListener('themeChanged', (e) => {
    console.log('Theme changed to:', e.detail.theme);
});
```

## Features Preserved

All existing functionality remains intact:
- ✅ Window minimize/restore
- ✅ Drag and drop (desktop)
- ✅ Window resizing
- ✅ WebSocket connections
- ✅ Service controls
- ✅ Responsive design

## Testing

### Manual Testing
1. Open `test-dark-mode.html` in a browser
2. Toggle between themes
3. Verify color changes
4. Check persistence after reload

### Functionality Testing
1. Open the main application
2. Run `test-functionality.js` in browser console
3. Verify all features work in both themes

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with responsive adjustments

## Customization

To modify colors, update the CSS variables in `:root` and `[data-theme="light"]` sections:
```css
:root {
    --accent-primary: #your-color;
}
```

## Files Modified

1. `/src/nodejs/kismet-operations/views/index_mobile_optimized.html`
   - Added CSS custom properties
   - Updated all color references to use variables
   - Added theme toggle button styles

2. `/src/nodejs/kismet-operations/public/js/theme.js`
   - Complete theme management system
   - localStorage persistence
   - Cross-tab synchronization

## Additional Files Created

1. `test-dark-mode.html` - Visual test page
2. `test-functionality.js` - Functionality verification script
3. `DARK_MODE_IMPLEMENTATION.md` - This documentation

## Future Enhancements

1. System preference detection (`prefers-color-scheme`)
2. Additional theme variants (high contrast, etc.)
3. Theme transition animations
4. Per-component theme customization