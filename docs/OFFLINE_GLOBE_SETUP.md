# Offline Globe Imagery Setup

## Current Status
The Cesium globe currently requires an internet connection to load map imagery. All providers (Esri, CartoDB, Stamen, OpenTopoMap) fetch tiles from remote servers.

## Offline Options

### 1. Pre-downloaded Tile Cache (Recommended)
- Download tiles for specific regions/zoom levels
- Store in local directory structure
- Serve via local web server
- Storage: ~1-50GB depending on coverage

### 2. Natural Earth Raster Data
- Low resolution (1:10m, 1:50m scale)
- Full world coverage
- Storage: ~500MB for basic imagery
- Good for country identification

### 3. Blue Marble NASA Imagery
- Medium resolution global imagery
- Monthly composites available
- Storage: ~2-5GB per dataset

## Implementation Steps

### Option 1: TileMill/MapProxy Cache

1. Install MapProxy:
```bash
sudo apt-get install python3-mapproxy
```

2. Configure MapProxy to cache tiles:
```yaml
# /etc/mapproxy/mapproxy.yaml
services:
  demo:
  tms:
  wmts:
  
caches:
  osm_cache:
    grids: [webmercator]
    sources: [osm_source]
    cache:
      type: file
      directory: /home/pi/map_tiles/osm
      
sources:
  osm_source:
    type: tile
    url: https://a.tile.openstreetmap.org/%(z)s/%(x)s/%(y)s.png
    
grids:
  webmercator:
    srs: EPSG:3857
    tile_size: [256, 256]
    origin: nw
```

3. Pre-download tiles for your area:
```bash
mapproxy-seed -f /etc/mapproxy/mapproxy.yaml -s /etc/mapproxy/seed.yaml
```

### Option 2: Natural Earth Integration

1. Download Natural Earth raster:
```bash
cd /home/pi/projects/stinkster_malone/stinkster/data
wget https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/raster/NE1_HR_LC_SR_W.zip
unzip NE1_HR_LC_SR_W.zip
```

2. Convert to tiles using GDAL:
```bash
gdal_translate -of vrt -expand rgba NE1_HR_LC_SR_W.tif world.vrt
gdal2tiles.py -p mercator -z 0-6 world.vrt tiles/
```

3. Serve tiles locally via Express:
```javascript
// Add to server.js
app.use('/tiles', express.static(path.join(__dirname, '../../../data/tiles')));
```

## Cesium Configuration for Offline Tiles

Update the imagery provider in your Cesium initialization:

```javascript
// For locally served tiles
const offlineProvider = new Cesium.UrlTemplateImageryProvider({
    url: '/tiles/{z}/{x}/{y}.png',
    credit: 'Offline map data',
    maximumLevel: 6,  // Depends on your tile cache
    minimumLevel: 0
});

// Add to fallback providers array
imageryProviders.unshift({
    name: 'Local Offline Tiles',
    provider: () => offlineProvider
});
```

## Storage Requirements

| Option | Coverage | Zoom Levels | Approximate Size |
|--------|----------|-------------|------------------|
| World Overview | Global | 0-5 | 500MB |
| Country Level | Global | 0-8 | 5GB |
| Regional Detail | 1 Country | 0-12 | 10GB |
| City Detail | 1 City | 0-16 | 1GB |

## Hybrid Approach (Recommended)

1. Use low-resolution offline tiles (Natural Earth) as base layer
2. Attempt to load online tiles when available
3. Fall back to offline when no internet

```javascript
// Check online status
const isOnline = navigator.onLine;

if (!isOnline || forceOffline) {
    // Use local tiles only
    cesiumViewer.imageryLayers.removeAll();
    cesiumViewer.imageryLayers.addImageryProvider(offlineProvider);
} else {
    // Try online providers with offline fallback
    tryOnlineProviders();
}
```

## Quick Setup Script

Create `/home/pi/setup-offline-globe.sh`:
```bash
#!/bin/bash
# Download minimal offline globe data

TILE_DIR="/home/pi/projects/stinkster_malone/stinkster/data/offline-tiles"
mkdir -p "$TILE_DIR"

# Download Natural Earth data
cd "$TILE_DIR"
wget https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/raster/NE1_HR_LC_SR_W.zip
unzip -o NE1_HR_LC_SR_W.zip

# Generate tiles for zoom levels 0-5 (overview)
gdal2tiles.py -p mercator -z 0-5 NE1_HR_LC_SR_W.tif tiles/

echo "Offline tiles generated in $TILE_DIR/tiles"
echo "Update your Cesium config to use: '/tiles/{z}/{x}/{y}.png'"
```

## Next Steps

1. Decide on coverage area and zoom levels needed
2. Calculate storage requirements
3. Set up tile generation/download process
4. Update Cesium configuration
5. Test offline functionality