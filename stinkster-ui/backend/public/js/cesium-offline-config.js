// Cesium Offline Tile Configuration
// This module provides configuration for using offline tiles with Cesium

window.CesiumOfflineConfig = {
    // Path to offline tiles relative to the web root
    offlineTilesPath: '/offline-tiles/tiles',
    
    // Check if offline tiles are available
    checkOfflineTiles: async function() {
        try {
            const response = await fetch('/offline-tiles/0/0/0.png');
            return response.ok;
        } catch (error) {
            console.warn('Offline tiles not available:', error);
            return false;
        }
    },
    
    // Create offline imagery provider
    createOfflineImageryProvider: function() {
        return new Cesium.UrlTemplateImageryProvider({
            url: '/offline-tiles/{z}/{x}/{reverseY}.png',
            credit: 'Offline World Map',
            tilingScheme: new Cesium.WebMercatorTilingScheme(),
            minimumLevel: 0,
            maximumLevel: 5,
            customTags: {
                reverseY: function(imageryProvider, x, y, level) {
                    const yTiles = imageryProvider.tilingScheme.getNumberOfYTilesAtLevel(level);
                    return yTiles - y - 1;
                }
            }
        });
    },
    
    // Create online imagery provider (fallback)
    createOnlineImageryProvider: function() {
        return new Cesium.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            credit: 'Tiles © Esri',
            maximumLevel: 19
        });
    },
    
    // Initialize Cesium with appropriate imagery provider
    initializeImagery: async function(viewer) {
        const useOffline = await this.checkOfflineTiles();
        
        viewer.imageryLayers.removeAll();
        
        if (useOffline) {
            console.log('Using offline tiles');
            const offlineProvider = this.createOfflineImageryProvider();
            viewer.imageryLayers.addImageryProvider(offlineProvider);
            
            // Add online imagery as a toggle option
            const onlineProvider = this.createOnlineImageryProvider();
            const onlineLayer = viewer.imageryLayers.addImageryProvider(onlineProvider);
            onlineLayer.show = false; // Hidden by default
            
            // Return info about available layers
            return {
                offline: true,
                offlineLayer: viewer.imageryLayers.get(0),
                onlineLayer: onlineLayer
            };
        } else {
            console.log('Using online tiles (offline not available)');
            const onlineProvider = this.createOnlineImageryProvider();
            viewer.imageryLayers.addImageryProvider(onlineProvider);
            
            return {
                offline: false,
                offlineLayer: null,
                onlineLayer: viewer.imageryLayers.get(0)
            };
        }
    }
};