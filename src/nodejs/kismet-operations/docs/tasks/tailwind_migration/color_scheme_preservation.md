# Color Scheme Preservation Documentation

This document captures all color schemes from the current Kismet Operations Center implementation that must be preserved in the Tailwind CSS migration.

## 1. Button Colors

### Cyber Green (Primary Action Buttons)
- **Background Gradient**: `linear-gradient(135deg, #00ff41 0%, #00d633 100%)`
- **Text Color**: `#001100`
- **Border**: `2px solid #00ff41`
- **Box Shadow**: `0 0 20px rgba(0, 255, 65, 0.5)`
- **Hover State**: Background colors become `#00ff41` and `#00e639`

### Cyber Blue (Standard Control Buttons)
- **Background Gradient**: `linear-gradient(90deg, #00d2ff 0%, #222 100%)`
- **Text Color**: `#fff`
- **Border Radius**: `8px`
- **Box Shadow**: `0 4px 16px rgba(0, 210, 255, 0.15)`
- **Hover State**: Gradient reverses to `linear-gradient(90deg, #222 0%, #00d2ff 100%)`
- **Hover Shadow**: `0 8px 32px rgba(0, 210, 255, 0.25)`

### Cyber Red (Stop/Danger Actions)
- **Background Gradient**: `linear-gradient(135deg, #ff0041 0%, #d60033 100%)`
- **Text Color**: `#110000`
- **Border**: `2px solid #ff0041`
- **Box Shadow**: `0 0 20px rgba(255, 0, 65, 0.5)`

### Cyber Orange (Warning/Starting State)
- **Background**: `#ffaa00`
- **Box Shadow**: `0 0 10px #ffaa00`
- **Usage**: Service starting indicators

### Cyber Yellow (Highlight/Alert)
- **Background**: `#ffdd57`
- **Border Color**: `#ffdd57`
- **Box Shadow**: `0 0 5px rgba(255, 221, 87, 0.3)`
- **Usage**: Feed item blinking animation

## 2. Status Indicator Colors

### Running/Success
- **Background**: `#44ff44`
- **Box Shadow**: `0 0 10px #44ff44`

### Stopped/Error
- **Background**: `#ff4444`
- **Box Shadow**: `none`

### Starting/Warning
- **Background**: `#ffaa00`
- **Box Shadow**: `0 0 10px #ffaa00`

## 3. Background Gradients and Effects

### Body Background
- **Base Color**: `#030610` (Very dark blue-black)
- **Text Color**: `#d0d8f0` (Soft light blue)

### Main Container Gradient
- **Gradient**: `linear-gradient(135deg, #0a192f 0%, #020c1b 100%)`

### Grid Pattern Overlay (body::before)
- **Pattern**: Diagonal lines at 45deg and -45deg
- **Color**: `rgba(0, 200, 220, 0.02)`
- **Size**: `70px 70px`
- **Opacity**: `0.4`

### Starfield Effect (body::after)
- **Dots Color**: `#203050`
- **Pattern**: Random dots of varying sizes (0.1-0.4)
- **Opacity**: `0.08`

### Top Banner
- **Background**: 
  ```
  linear-gradient(90deg,
    rgba(10, 15, 30, 0.95) 0%,
    rgba(10, 15, 30, 0.85) 50%,
    rgba(10, 15, 30, 0.95) 100%)
  ```
- **Backdrop Filter**: `blur(12px)`
- **Border Bottom**: `2px solid rgba(0, 220, 255, 0.4)`
- **Box Shadow**: 
  - `0 2px 20px rgba(0, 220, 255, 0.35)`
  - `0 0 40px rgba(0, 220, 255, 0.15)`

### Box Headers
- **Background Gradient**:
  ```
  linear-gradient(90deg, 
    rgba(0, 190, 215, 0.05) 0%, 
    rgba(0, 190, 215, 0.15) 25%,
    rgba(0, 220, 255, 0.2) 50%,
    rgba(0, 190, 215, 0.15) 75%,
    rgba(0, 190, 215, 0.05) 100%)
  ```
- **Border**: `1px solid rgba(0, 220, 255, 0.3)`
- **Border Bottom**: `2px solid rgba(0, 220, 255, 0.4)`
- **Box Shadow**: 
  - `0 0 15px rgba(0, 220, 255, 0.2)`
  - `inset 0 0 20px rgba(0, 220, 255, 0.1)`

## 4. Text Colors and Effects

### Primary Text
- **Color**: `#d0d8f0` (Soft light blue)

### Headings (H1/H2)
- **Base Color**: `#fff`
- **Text Shadow**: 
  - `0 0 10px rgba(0, 220, 255, 0.8)`
  - `0 0 20px rgba(0, 220, 255, 0.6)`
  - `0 0 30px rgba(0, 220, 255, 0.4)`
  - `0 0 40px rgba(0, 220, 255, 0.2)`
- **Gradient Effect**:
  ```
  background: linear-gradient(90deg, 
    #fff 0%,
    #00d2ff 25%,
    #fff 50%,
    #00d2ff 75%,
    #fff 100%)
  ```
  With `-webkit-background-clip: text` and animated shine effect

### Accent Text
- **Color**: `#00d2ff` (Bright cyan)
- **Color**: `#a0e0ff` (Light cyan for H2)
- **Color**: `#00e2ff` (System messages)

### Feed Items
- **Default**: `#c0e8ff`
- **Hover**: `#e0f8ff`
- **Active**: `#ffffff`

## 5. Border Colors and Shadows

### Grid Items
- **Background**: `rgba(12, 22, 48, 0.65)`
- **Backdrop Filter**: `blur(12px)`
- **Border**: `1px solid rgba(0, 190, 215, 0.35)`
- **Box Shadow**: 
  - `inset 0 0 12px rgba(0, 220, 255, 0.15)`
  - `0 0 10px rgba(0, 150, 180, 0.1)`

### Feed Items
- **Background**: `rgba(0, 50, 80, 0.55)`
- **Border Left**: `3px solid #00bcd4`
- **Hover Border**: `#00f2ff`
- **Border Radius**: `0 4px 4px 0`

### Notification Styles
- **Info Border**: `rgba(0, 220, 255, 0.4)`
- **Success Border**: `rgba(68, 255, 68, 0.4)`
- **Error Border**: `rgba(255, 68, 68, 0.4)`

### Footer
- **Background**: `rgba(12, 22, 48, 0.85)`
- **Border Top**: `1px solid rgba(0, 190, 215, 0.35)`
- **Box Shadow**: `0 -2px 10px rgba(0, 150, 180, 0.1)`

## 6. Special Effects

### Glow Dots (Box Headers)
- **Size**: `8px` diameter circles
- **Color**: `rgba(0, 220, 255, 0.9)`
- **Animation**: Pulsing scale(1) to scale(1.2) with varying box shadows

### Scanning Animation (Headers/Banners)
- **Gradient**: Moving light beam effect
- **Colors**: Transparent to `rgba(0, 220, 255, 0.2)` and back

### Pulse Glow (System Messages)
- **Animation**: Text shadow from `6px` to `12px` spread
- **Opacity**: `0.8` to `1`

### Scrollbar Styling
- **Track**: `rgba(3, 6, 16, 0.3)`
- **Thumb**: `rgba(0, 220, 255, 0.4)` with `1px solid rgba(0, 220, 255, 0.2)` border
- **Thumb Hover**: `rgba(0, 220, 255, 0.6)`

## Implementation Notes

1. All colors should be defined as CSS custom properties for easy theming
2. Gradient effects should be preserved using Tailwind's gradient utilities where possible
3. Complex animations may need to remain as custom CSS
4. Box shadows and text shadows should use Tailwind's shadow utilities with custom values
5. Backdrop filters require careful browser compatibility consideration
6. The animated background grid and starfield effects are critical to the aesthetic

## Color Palette Summary

```css
/* Primary Colors */
--cyber-primary: #00d2ff;      /* Main cyan */
--cyber-secondary: #00bcd4;    /* Secondary cyan */
--cyber-accent: #00f2ff;       /* Bright cyan */

/* Background Colors */
--bg-darkest: #030610;         /* Body background */
--bg-dark: #0a192f;           /* Container dark */
--bg-darker: #020c1b;         /* Container darker */
--bg-panel: rgba(12, 22, 48, 0.65); /* Panel background */

/* Text Colors */
--text-primary: #d0d8f0;       /* Main text */
--text-heading: #fff;          /* Headings */
--text-accent: #00d2ff;        /* Accent text */
--text-light: #a0e0ff;         /* Light accent */
--text-feed: #c0e8ff;          /* Feed items */

/* Status Colors */
--status-success: #44ff44;     /* Running/Success */
--status-error: #ff4444;       /* Stopped/Error */
--status-warning: #ffaa00;     /* Starting/Warning */
--status-highlight: #ffdd57;   /* Highlight/Alert */

/* Action Colors */
--action-primary: #00ff41;     /* Primary action */
--action-danger: #ff0041;      /* Danger action */
--action-secondary: #00d633;   /* Secondary action */
```

This color scheme creates the distinctive cyberpunk aesthetic and must be carefully preserved during the migration to maintain the visual identity of the application.