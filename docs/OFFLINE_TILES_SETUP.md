# Offline Tiles Setup Guide

This guide explains how to set up and use offline map tiles with the Cesium globe in Stinkster Malone.

## Overview

Offline tiles allow the Cesium globe to work without an internet connection by using pre-downloaded map imagery stored locally. This is useful for field operations where internet connectivity may be limited or unavailable.

## Initial Setup

### 1. Install Required Tools

The system requires GDAL tools for tile generation:

```bash
sudo apt-get update
sudo apt-get install -y gdal-bin python3-gdal
```

### 2. Generate Basic Tiles

Basic tiles have already been generated and are located at:
```
/home/pi/projects/stinkster_malone/stinkster/data/offline-tiles/tiles/
```

### 3. Download Better Quality Tiles (Optional)

To download and generate higher quality tiles:

```bash
cd /home/pi/projects/stinkster_malone/stinkster/data/offline-tiles
./download-better-tiles.sh
```

This script will attempt to download Natural Earth imagery or other public domain world maps and convert them to tiles.

## How It Works

### Tile Structure

Tiles are organized in a standard XYZ tile structure:
```
tiles/
├── 0/          # Zoom level 0 (whole world)
│   └── 0/
│       └── 0.png
├── 1/          # Zoom level 1
│   └── ...
├── 2/          # Zoom level 2
│   └── ...
└── ...         # Up to zoom level 5 or 6
```

### Integration with Cesium

1. **Server Configuration**: The Express server automatically serves tiles from `/offline-tiles/*` if the tiles directory exists.

2. **Client Configuration**: The `cesium-offline-config.js` module:
   - Checks if offline tiles are available
   - Creates appropriate imagery providers
   - Falls back to online tiles if offline tiles are unavailable

3. **Automatic Detection**: The Cesium globe automatically detects and uses offline tiles when available.

## Testing Offline Tiles

### 1. Test Page

Access the test page at:
```
http://localhost:8002/test-offline-tiles.html
```

This page allows you to:
- Verify offline tiles are loading
- Toggle between online and offline imagery
- Test individual tile URLs

### 2. Check Tile Availability

```bash
# Count tiles
find /home/pi/projects/stinkster_malone/stinkster/data/offline-tiles/tiles -name "*.png" | wc -l

# Check disk usage
du -sh /home/pi/projects/stinkster_malone/stinkster/data/offline-tiles/tiles
```

### 3. View Tile Directly

Test a specific tile by accessing:
```
http://localhost:8002/offline-tiles/tiles/2/1/1.png
```

## Creating Custom Tiles

### From GeoTIFF Images

If you have a GeoTIFF image:

```bash
gdal2tiles.py -p mercator -z 0-6 -w none input.tif tiles/
```

### From Regular Images

For non-georeferenced images:

```bash
# Add georeferencing
gdal_translate -of GTiff -a_srs EPSG:4326 -a_ullr -180 90 180 -90 input.jpg georeferenced.tif

# Generate tiles
gdal2tiles.py -p mercator -z 0-6 -w none georeferenced.tif tiles/
```

## Configuration Options

### Modify Zoom Levels

Edit `cesium-offline-config.js` to change the maximum zoom level:

```javascript
maximumLevel: 5,  // Change to desired zoom level (0-18)
```

### Change Tile Source

To use different offline tiles, update the URL pattern in `cesium-offline-config.js`:

```javascript
url: '/offline-tiles/tiles/{z}/{x}/{reverseY}.png',
```

## Troubleshooting

### Tiles Not Loading

1. Check server logs:
   ```bash
   tail -f /home/pi/projects/stinkster_malone/stinkster/logs/kismet-operations.log | grep offline
   ```

2. Verify tile directory exists:
   ```bash
   ls -la /home/pi/projects/stinkster_malone/stinkster/data/offline-tiles/tiles/
   ```

3. Test tile URL directly in browser:
   ```
   http://localhost:8002/offline-tiles/tiles/0/0/0.png
   ```

### Performance Issues

- Limit maximum zoom level to reduce tile count
- Use lower resolution source images
- Consider using tile caching in the browser

### Disk Space

Monitor disk usage:
```bash
df -h /home/pi/projects/stinkster_malone/stinkster/data/offline-tiles
```

Remove old backup tiles:
```bash
rm -rf /home/pi/projects/stinkster_malone/stinkster/data/offline-tiles/tiles.backup.*
```

## Advanced Options

### Multiple Tile Sets

You can maintain multiple tile sets for different purposes:

1. Create separate directories:
   ```bash
   mkdir -p tiles-satellite
   mkdir -p tiles-terrain
   mkdir -p tiles-street
   ```

2. Generate tiles for each set
3. Modify the server to serve different sets based on URL paths
4. Update client configuration to switch between sets

### Partial Coverage

For specific regions only:
1. Crop source image to desired area
2. Generate tiles only for that region
3. Configure Cesium to use online tiles outside the coverage area

## Maintenance

### Regular Updates

1. Check for updated imagery quarterly
2. Regenerate tiles if better source data becomes available
3. Clean up old backup directories

### Backup

Important directories to backup:
```bash
/home/pi/projects/stinkster_malone/stinkster/data/offline-tiles/tiles/
/home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations/public/js/cesium-offline-config.js
```

## Resources

- [GDAL2Tiles Documentation](https://gdal.org/programs/gdal2tiles.html)
- [Natural Earth Data](https://www.naturalearthdata.com/)
- [Cesium Imagery Providers](https://cesium.com/learn/cesiumjs/ref-doc/ImageryProvider.html)
- [Web Map Tile Service (WMTS)](https://en.wikipedia.org/wiki/Web_Map_Tile_Service)