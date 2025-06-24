# Center on Me Button Implementation

## Summary
Added a "Center on Me" button to the Cesium globe controls in the Kismet Operations Center that allows users to center the map on their current GPS position.

## Changes Made

### 1. HTML - Added Button to Map Controls
- Added a new button with id `center-on-me` after the zoom controls
- Styled with `btn-cyber btn-blue` classes for consistent appearance
- Includes a location pin SVG icon
- Has tooltip: "Center map on current GPS position"

### 2. JavaScript - Added Click Handler
- Checks if GPS position is available via `lastGpsUpdate` variable
- If GPS available:
  - Uses `Cesium.Camera.flyTo()` to smoothly center on position
  - Sets altitude to 1000m for a good view
  - Sets pitch to -45 degrees for angled view
  - Shows success notification
- If GPS not available:
  - Shows error notification

### 3. Position Tracking
- Leverages existing `lastGpsUpdate` variable that's updated by `updateGlobePosition()` function
- GPS position is automatically updated when new GPS data is received
- Position display at bottom-left shows current coordinates

## Features
- Smooth camera animation to GPS position
- Error handling for missing GPS data
- Visual feedback via notifications
- Consistent styling with existing controls
- Tooltip for user guidance

## Usage
1. Ensure GPS service is running
2. Click the location pin button in the map controls
3. Map will fly to current GPS position at 1000m altitude
4. If no GPS data available, an error message will appear