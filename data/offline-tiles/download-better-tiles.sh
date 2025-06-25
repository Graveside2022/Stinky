#!/bin/bash

# Script to download better quality world imagery for offline tiles

echo "Downloading better quality world imagery..."

# Option 1: Download Natural Earth II imagery (smaller, good quality)
echo "Attempting to download Natural Earth II imagery..."
wget -c --progress=dot:giga "https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/raster/NE2_LR_LC_SR_W.zip" -O NE2_world.zip 2>/dev/null

if [ $? -eq 0 ] && [ -f NE2_world.zip ]; then
    echo "Natural Earth II downloaded successfully!"
    unzip -o NE2_world.zip
    rm -f NE2_world.zip
    
    # Find the TIFF file
    TIFF_FILE=$(find . -name "*.tif" -o -name "*.tiff" | head -1)
    
    if [ -n "$TIFF_FILE" ]; then
        echo "Converting $TIFF_FILE to tiles..."
        # Backup existing tiles
        if [ -d tiles ]; then
            mv tiles tiles.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # Generate new tiles
        gdal2tiles.py -p mercator -z 0-6 -w none "$TIFF_FILE" tiles/
        
        echo "Tiles generated successfully!"
    else
        echo "No TIFF file found in download"
    fi
else
    echo "Natural Earth download failed, trying alternative sources..."
    
    # Option 2: Create a better placeholder using NASA Blue Marble or similar
    echo "Creating improved placeholder world map..."
    
    # Try to download a public domain world map
    wget -c "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Whole_world_-_land_and_oceans_12000.jpg/2560px-Whole_world_-_land_and_oceans_12000.jpg" -O world_map.jpg
    
    if [ $? -eq 0 ] && [ -f world_map.jpg ]; then
        echo "Downloaded world map from Wikimedia"
        
        # Convert to proper projection
        gdal_translate -of GTiff -a_srs EPSG:4326 -a_ullr -180 90 180 -90 world_map.jpg world_map_geo.tif
        
        # Backup existing tiles
        if [ -d tiles ]; then
            mv tiles tiles.backup.$(date +%Y%m%d_%H%M%S)
        fi
        
        # Generate tiles
        gdal2tiles.py -p mercator -z 0-6 -w none world_map_geo.tif tiles/
        
        echo "Tiles generated from Wikimedia world map!"
    else
        echo "All download attempts failed. Keeping existing tiles."
    fi
fi

# Display tile statistics
if [ -d tiles ]; then
    echo ""
    echo "Tile statistics:"
    echo "Total tiles: $(find tiles -name "*.png" | wc -l)"
    echo "Disk usage: $(du -sh tiles | cut -f1)"
    echo ""
    echo "Tiles are ready at: $(pwd)/tiles"
else
    echo "Error: No tiles directory found!"
fi