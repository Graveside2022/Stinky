# Setup Pages Assets

This directory contains all the CSS, JavaScript, and image assets extracted and organized from the original setup pages.

## Directory Structure

```
assets/
├── css/
│   └── common-styles.css      # Shared styles for all pages
├── js/
│   ├── common-utils.js        # Utility functions
│   └── kismet-control.js      # Kismet page functionality
├── images/
│   └── dot-pattern.svg        # Background pattern
├── asset-manifest.json        # Complete asset inventory
└── README.md                  # This file
```

## Usage

### CSS Integration

Include the common styles in your HTML `<head>`:

```html
<link rel="stylesheet" href="assets/css/common-styles.css">
```

### JavaScript Integration

1. **For all pages** - Include common utilities:
```html
<script src="assets/js/common-utils.js"></script>
```

2. **For Kismet control page only**:
```html
<script src="assets/js/kismet-control.js"></script>
```

### External Dependencies

The pages rely on Google Fonts (Inter). This is automatically loaded via the CSS file using `@import`.

## Key Features

### Common Styles (`common-styles.css`)
- **Responsive Design**: Mobile-first approach with breakpoints at 768px
- **Animations**: Background gradients, text glow effects, fade-in animations
- **Components**: Buttons, status indicators, grid layouts, panels
- **Dark Theme**: Consistent dark color scheme with cyan accents

### Common Utilities (`common-utils.js`)
- **Code Block Enhancement**: Adds copy buttons to all code blocks
- **Smooth Scrolling**: Navigation helper functions
- **External Link Handling**: Automatically marks and styles external links
- **Animation Support**: Fade-in animations for grid items

### Kismet Control (`kismet-control.js`)
- **API Integration**: Start/stop Kismet via REST endpoints
- **Real-time Updates**: 5-second status polling
- **Visual Feedback**: Loading states and notifications
- **Error Handling**: Graceful error management

## Color Palette

- **Primary**: `#00d2ff` (Cyan)
- **Success**: `#00ff88` (Green)
- **Error**: `#ff4444` (Red)
- **Background**: `#030610` (Dark Blue)
- **Text**: `#d0d8f0` (Light Blue)

## Performance Considerations

1. **Minimize HTTP Requests**: Consider bundling CSS/JS files
2. **Enable Caching**: Set appropriate cache headers
3. **Optimize Images**: The SVG pattern is already optimized
4. **Lazy Loading**: Implement for non-critical resources

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- ES6+ JavaScript features used

## Customization

To customize the theme:
1. Edit CSS variables in `common-styles.css`
2. Modify color values in the `:root` section
3. Adjust animation timings as needed

For API endpoints:
1. Update `API_ENDPOINTS` in `kismet-control.js`
2. Ensure CORS is properly configured