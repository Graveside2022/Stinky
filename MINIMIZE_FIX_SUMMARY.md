# Minimize Button Fix Summary

## Issue
The minimize buttons in the Kismet Operations Center were not working properly. Only the Kismet Live View minimize button worked, but the others didn't respond to clicks.

## Root Cause
The inline `onclick` handlers weren't being executed properly in some cases, possibly due to:
1. Event propagation issues
2. Z-index stacking conflicts
3. JavaScript execution context problems

## Solution Implemented

### 1. Added Console Logging
Added debug logging to the `minimizeToTab` and `restoreFromTab` functions to track execution:
```javascript
console.log('minimizeToTab called:', containerId, title);
console.log('Container minimized successfully');
```

### 2. Enhanced Button Styling
Added explicit CSS rules for minimize buttons to ensure they're clickable:
```css
.box-header button {
    background: none;
    border: none;
    color: #00d2ff;
    cursor: pointer;
    padding: 0.25rem;
    transition: color 0.2s ease;
    position: relative;
    z-index: 10;
}

.box-header button:hover {
    color: #fff;
}

.box-header button:active {
    transform: scale(0.95);
}

.box-header button svg {
    pointer-events: none;
}
```

### 3. Event Listener Approach
Replaced inline `onclick` handlers with proper event listeners attached after DOM load:
```javascript
// Extract parameters from onclick attribute
const match = onclickAttr.match(/minimizeToTab\('([^']+)',\s*'([^']+)'\)/);

if (match) {
    const containerId = match[1];
    const title = match[2];
    
    // Remove inline onclick and add event listener
    btn.removeAttribute('onclick');
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Minimize button clicked:', containerId, title);
        minimizeToTab(containerId, title);
    });
}
```

### 4. Z-Index Adjustment
Reduced the z-index of the minimized tabs bar from 999 to 90 to prevent it from blocking other elements.

## Testing
Created two test files:
1. `/home/pi/projects/stinkster_malone/stinkster/test-minimize.html` - Standalone test page
2. `/home/pi/projects/stinkster_malone/stinkster/debug-minimize.js` - Browser console debug script

## Result
All minimize buttons should now work properly. The buttons will:
1. Hide their parent container when clicked
2. Add a tab to the minimized tabs bar
3. Allow restoration by clicking the minimized tab
4. Log actions to the browser console for debugging