# Module Fix: MGRS.js Export Declaration Error

## Problem Analysis

The error "export declarations may only appear at top level" is occurring because the mgrs.js library is being loaded as a regular script instead of as an ES module. The library uses ES6 module syntax with export declarations, but the HTML is loading it with a standard `<script>` tag without the `type="module"` attribute.

### Error Location
- **File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html`
- **Line**: 1217
- **Current Code**: `<script src="https://unpkg.com/mgrs@1.0.0/mgrs.js"></script>`

## Root Cause Identification

1. The mgrs.js library from unpkg is an ES6 module that contains export declarations
2. The script is being loaded without `type="module"` which causes the browser to treat it as a regular script
3. Regular scripts cannot contain ES6 module syntax like `export`
4. The library needs to be loaded either as a module or using a UMD/browser-compatible version

## Exact Code Changes

### Option 1: Use the Browser-Compatible Version (Recommended)

The mgrs library provides a browser-compatible version that doesn't use ES6 modules. Change line 1217:

**File**: `/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/views/hi.html`
**Line**: 1217

**Old**:
```html
<script src="https://unpkg.com/mgrs@1.0.0/mgrs.js"></script>
```

**New**:
```html
<script src="https://unpkg.com/mgrs@1.0.0/dist/mgrs.min.js"></script>
```

### Option 2: Load as ES6 Module (Alternative)

If you need to use the ES6 module version, you would need to:

1. Change the script tag to use module type:
```html
<script type="module">
import mgrs from 'https://unpkg.com/mgrs@1.0.0/mgrs.js';
window.mgrs = mgrs; // Make it globally available
</script>
```

2. Then update the latLonToMGRS function (lines 1387-1407) to handle the module import properly.

However, **Option 1 is recommended** as it requires minimal changes and maintains compatibility.

## Script Tag Updates

After implementing Option 1, no other script tag updates are needed. The mgrs library will be available globally as before, and the `latLonToMGRS` function (lines 1387-1407) will continue to work without modifications.

## Testing Verification Steps

1. **Clear Browser Cache**: Force refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

2. **Check Console**: Open browser developer tools and verify no "export declarations" error appears

3. **Test MGRS Conversion**: 
   - The System Status box should display MGRS Grid coordinates
   - When GPS coordinates are available, verify MGRS conversion works
   - Example: Lat 40.7128, Lon -74.0060 should convert to something like "18T WL 8371 0611"

4. **Verify Library Loading**:
   ```javascript
   // In browser console, test if mgrs is available:
   console.log(typeof mgrs); // Should output: "object"
   console.log(mgrs.forward([-74.0060, 40.7128], 4)); // Should output MGRS string
   ```

5. **Check Network Tab**: Verify the mgrs.min.js file loads successfully (200 status)

## Summary

The fix is simple: change the script source from `mgrs.js` to `mgrs.min.js` on line 1217. This loads the browser-compatible minified version instead of the ES6 module version, eliminating the export declaration error while maintaining all functionality.