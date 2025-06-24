<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { KismetDevice } from '$lib/services/websocket/types'
  import {
    Viewer,
    Cartesian3,
    Color,
    Entity,
    EllipseGraphics,
    ColorMaterialProperty,
    Math as CesiumMath,
    CustomDataSource
  } from 'cesium'
  
  export let viewer: Viewer
  export let devices: KismetDevice[]
  export let visible = true
  export let radius = 1000 // Radius in meters
  export let intensity = 0.6
  
  let heatmapDataSource: CustomDataSource | null = null
  let heatmapEntities: Entity[] = []
  
  // Normalize signal strength to 0-1 range
  function normalizeSignalStrength(signal: number): number {
    // Signal typically ranges from -100 dBm (weak) to -30 dBm (strong)
    const normalized = (signal + 100) / 70
    return Math.max(0, Math.min(1, normalized))
  }
  
  // Get color based on signal strength
  function getHeatmapColor(normalizedValue: number): Color {
    // Gradient from blue (weak) to red (strong)
    if (normalizedValue < 0.2) {
      return Color.BLUE.withAlpha(0.3 * intensity)
    } else if (normalizedValue < 0.4) {
      return Color.CYAN.withAlpha(0.4 * intensity)
    } else if (normalizedValue < 0.6) {
      return Color.GREEN.withAlpha(0.5 * intensity)
    } else if (normalizedValue < 0.8) {
      return Color.YELLOW.withAlpha(0.6 * intensity)
    } else {
      return Color.RED.withAlpha(0.7 * intensity)
    }
  }
  
  // Create heatmap visualization using ellipses
  function createHeatmap() {
    if (!viewer) return
    
    // Create data source if it doesn't exist
    if (!heatmapDataSource) {
      heatmapDataSource = new CustomDataSource('deviceHeatmap')
      viewer.dataSources.add(heatmapDataSource)
    }
    
    // Clear existing entities
    heatmapDataSource.entities.removeAll()
    heatmapEntities = []
    
    // Create heat circles for each device
    devices.forEach(device => {
      if (device.location?.latitude && device.location?.longitude) {
        const normalizedSignal = normalizeSignalStrength(device.signalStrength || -80)
        const color = getHeatmapColor(normalizedSignal)
        
        const entity = heatmapDataSource.entities.add({
          position: Cartesian3.fromDegrees(
            device.location.longitude,
            device.location.latitude
          ),
          ellipse: new EllipseGraphics({
            semiMajorAxis: radius * (0.5 + normalizedSignal * 0.5),
            semiMinorAxis: radius * (0.5 + normalizedSignal * 0.5),
            material: new ColorMaterialProperty(color),
            height: 0,
            outline: false,
            show: visible
          })
        })
        
        heatmapEntities.push(entity)
      }
    })
  }
  
  // Update heatmap with new data
  function updateHeatmap() {
    if (!viewer) return
    createHeatmap()
  }
  
  // Toggle heatmap visibility
  export function toggle() {
    visible = !visible
    if (heatmapDataSource) {
      heatmapDataSource.show = visible
    }
  }
  
  // Update intensity
  export function setIntensity(value: number) {
    intensity = Math.max(0, Math.min(1, value))
    updateHeatmap()
  }
  
  // Update radius
  export function setRadius(value: number) {
    radius = Math.max(100, Math.min(5000, value))
    updateHeatmap()
  }
  
  // React to device changes
  $: if (viewer && devices.length > 0) {
    updateHeatmap()
  }
  
  // React to visibility changes
  $: if (heatmapDataSource) {
    heatmapDataSource.show = visible
  }
  
  onMount(() => {
    if (viewer && devices.length > 0) {
      createHeatmap()
    }
  })
  
  onDestroy(() => {
    if (heatmapDataSource && viewer) {
      viewer.dataSources.remove(heatmapDataSource)
    }
  })
</script>

<!-- Since this component manages Cesium entities, it doesn't render HTML -->
<style>
  /* No styles needed for this component */
</style>