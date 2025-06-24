<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { deviceList, selectedDevice } from '$lib/stores/websocket/kismet'
  import type { KismetDevice } from '$lib/services/websocket/types'
  import {
    Viewer,
    Cartesian3,
    Color,
    HeadingPitchRange,
    ScreenSpaceEventType,
    ScreenSpaceEventHandler,
    Entity,
    BillboardGraphics,
    LabelGraphics,
    PointGraphics,
    VerticalOrigin,
    HorizontalOrigin,
    Cartographic,
    Math as CesiumMath,
    Ion,
    type DataSource,
    CustomDataSource,
    EntityCluster,
    PinBuilder,
    defined,
    JulianDate,
    ClockRange,
    ClockStep,
    PathGraphics,
    PolylineGlowMaterialProperty,
    SampledPositionProperty,
    TimeIntervalCollection,
    TimeInterval,
    ConstantProperty
  } from 'cesium'
  import 'cesium/Build/Cesium/Widgets/widgets.css'
  
  export let height = '100%'
  export let showStats = true
  export let enableClustering = true
  export let clusterPixelRange = 50
  export let clusterMinimumSize = 2
  export let cesiumToken: string | null = null
  
  let container: HTMLDivElement
  let viewer: Viewer
  let dataSource: CustomDataSource
  let eventHandler: ScreenSpaceEventHandler
  let deviceEntities = new Map<string, Entity>()
  let pinBuilder: PinBuilder
  
  // Camera presets
  const cameraPresets = {
    global: {
      destination: Cartesian3.fromDegrees(0, 0, 15000000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-90),
        roll: 0
      }
    },
    northAmerica: {
      destination: Cartesian3.fromDegrees(-98, 40, 5000000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-45),
        roll: 0
      }
    },
    europe: {
      destination: Cartesian3.fromDegrees(10, 50, 3000000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-45),
        roll: 0
      }
    },
    local: {
      destination: Cartesian3.fromDegrees(-122.4, 37.8, 10000),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-45),
        roll: 0
      }
    }
  }
  
  onMount(() => {
    // Set Cesium Ion token if provided
    if (cesiumToken) {
      Ion.defaultAccessToken = cesiumToken
    }
    
    // Initialize Cesium viewer
    viewer = new Viewer(container, {
      terrainProvider: undefined, // Use default terrain
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      creditContainer: document.createElement('div'), // Hide credits
      shadows: false,
      shouldAnimate: true
    })
    
    // Remove default double-click behavior
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
    
    // Create custom data source for devices
    dataSource = new CustomDataSource('kismetDevices')
    viewer.dataSources.add(dataSource)
    
    // Configure clustering if enabled
    if (enableClustering) {
      dataSource.clustering.enabled = true
      dataSource.clustering.pixelRange = clusterPixelRange
      dataSource.clustering.minimumClusterSize = clusterMinimumSize
      
      // Custom cluster styling
      dataSource.clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {
        cluster.label.show = true
        cluster.billboard.show = true
        cluster.billboard.verticalOrigin = VerticalOrigin.BOTTOM
        
        const count = clusteredEntities.length
        
        // Size based on count
        let size = 40
        if (count >= 50) size = 60
        else if (count >= 20) size = 50
        
        cluster.billboard.image = pinBuilder.fromText(count.toString(), Color.WHITE, size).toDataURL()
        cluster.label.text = undefined
      })
    }
    
    // Initialize pin builder for custom markers
    pinBuilder = new PinBuilder()
    
    // Set up click handler
    eventHandler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    eventHandler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position)
      if (defined(pickedObject) && defined(pickedObject.id) && pickedObject.id instanceof Entity) {
        const device = pickedObject.id.properties?.device?.getValue()
        if (device) {
          selectDevice(device)
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK)
    
    // Subscribe to device updates
    const unsubscribe = deviceList.subscribe(devices => {
      updateDeviceMarkers(devices)
    })
    
    // Set initial camera position
    viewer.camera.setView(cameraPresets.global)
    
    // Store unsubscribe for cleanup
    viewer.entities.collectionChanged.addEventListener(() => {
      // Force clustering update when entities change
      if (dataSource.clustering.enabled) {
        dataSource.clustering.enabled = false
        dataSource.clustering.enabled = true
      }
    })
    
    return () => {
      unsubscribe()
    }
  })
  
  onDestroy(() => {
    if (eventHandler) {
      eventHandler.destroy()
    }
    if (viewer) {
      viewer.destroy()
    }
  })
  
  function updateDeviceMarkers(devices: KismetDevice[]) {
    if (!viewer || !dataSource) return
    
    // Track which devices to keep
    const currentDeviceIds = new Set(devices.map(d => d.id))
    
    // Remove entities for devices that no longer exist
    deviceEntities.forEach((entity, id) => {
      if (!currentDeviceIds.has(id)) {
        dataSource.entities.remove(entity)
        deviceEntities.delete(id)
      }
    })
    
    // Add or update device markers
    devices.forEach(device => {
      if (device.location?.latitude && device.location?.longitude) {
        const position = Cartesian3.fromDegrees(
          device.location.longitude,
          device.location.latitude,
          device.location.altitude || 0
        )
        
        let entity = deviceEntities.get(device.id)
        
        if (!entity) {
          // Create new entity
          entity = dataSource.entities.add({
            id: device.id,
            position: position,
            properties: {
              device: device
            }
          })
          deviceEntities.set(device.id, entity)
        } else {
          // Update existing entity position
          entity.position = new ConstantProperty(position)
        }
        
        // Update visual properties based on device type and signal strength
        updateEntityAppearance(entity, device)
      }
    })
  }
  
  function updateEntityAppearance(entity: Entity, device: KismetDevice) {
    const signalStrength = device.signalStrength || -80
    const normalizedSignal = Math.max(0, Math.min(1, (signalStrength + 100) / 60))
    
    // Color based on device type
    let baseColor = Color.CYAN
    switch (device.type) {
      case 'wifi':
        baseColor = Color.GREEN
        break
      case 'bluetooth':
        baseColor = Color.BLUE
        break
      default:
        baseColor = Color.YELLOW
    }
    
    // Adjust brightness based on signal strength
    const color = Color.multiplyByScalar(baseColor, 0.3 + normalizedSignal * 0.7, new Color())
    
    // Billboard (icon)
    entity.billboard = new BillboardGraphics({
      image: pinBuilder.fromColor(color, 32).toDataURL(),
      verticalOrigin: VerticalOrigin.BOTTOM,
      heightReference: 0, // Clamp to ground
      scale: 0.8 + normalizedSignal * 0.4
    })
    
    // Point (for when zoomed in close)
    entity.point = new PointGraphics({
      color: color,
      pixelSize: 8 + normalizedSignal * 8,
      outlineColor: Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    })
    
    // Label
    entity.label = new LabelGraphics({
      text: device.name || device.mac || device.id,
      font: '12px sans-serif',
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 2,
      verticalOrigin: VerticalOrigin.TOP,
      pixelOffset: new Cartesian3(0, -20, 0),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      distanceDisplayCondition: { near: 0, far: 50000 } // Only show labels when close
    })
    
    // Update description for info box
    entity.description = new ConstantProperty(`
      <div style="font-family: sans-serif;">
        <h3>${device.name || 'Unknown Device'}</h3>
        <table style="width: 100%;">
          <tr><td><b>MAC:</b></td><td>${device.mac || 'Unknown'}</td></tr>
          <tr><td><b>Type:</b></td><td>${device.type}</td></tr>
          <tr><td><b>Signal:</b></td><td>${signalStrength} dBm</td></tr>
          <tr><td><b>Channel:</b></td><td>${device.channel || 'N/A'}</td></tr>
          <tr><td><b>Manufacturer:</b></td><td>${device.manufacturer || 'Unknown'}</td></tr>
          <tr><td><b>Last Seen:</b></td><td>${new Date(device.lastSeen).toLocaleString()}</td></tr>
        </table>
      </div>
    `)
  }
  
  // Camera control functions
  export function flyToDevice(device: KismetDevice) {
    if (!viewer || !device.location) return
    
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        device.location.longitude,
        device.location.latitude,
        1000 // 1km altitude
      ),
      orientation: {
        heading: 0,
        pitch: CesiumMath.toRadians(-45),
        roll: 0
      },
      duration: 2
    })
  }
  
  export function setCameraPreset(preset: keyof typeof cameraPresets) {
    if (!viewer) return
    viewer.camera.flyTo(cameraPresets[preset])
  }
  
  export function toggleClustering(enabled: boolean) {
    if (!dataSource) return
    dataSource.clustering.enabled = enabled
  }
  
  // Subscribe to selected device changes
  $: if ($selectedDevice && viewer) {
    flyToDevice($selectedDevice)
  }
</script>

<div bind:this={container} class="cesium-container" style="height: {height};">
  {#if showStats}
    <div class="stats-overlay">
      <div class="stat">
        Devices: {$deviceList.length}
      </div>
      <div class="stat">
        Visible: {deviceEntities.size}
      </div>
    </div>
  {/if}
  
  <div class="camera-controls">
    <button on:click={() => setCameraPreset('global')} class="preset-btn">
      Global
    </button>
    <button on:click={() => setCameraPreset('northAmerica')} class="preset-btn">
      N. America
    </button>
    <button on:click={() => setCameraPreset('europe')} class="preset-btn">
      Europe
    </button>
    <button on:click={() => setCameraPreset('local')} class="preset-btn">
      Local
    </button>
  </div>
</div>

<style>
  .cesium-container {
    position: relative;
    width: 100%;
    overflow: hidden;
  }
  
  .stats-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 10;
  }
  
  .stat {
    margin-bottom: 5px;
  }
  
  .stat:last-child {
    margin-bottom: 0;
  }
  
  .camera-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 10;
  }
  
  .preset-btn {
    background: rgba(48, 51, 57, 0.9);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }
  
  .preset-btn:hover {
    background: rgba(70, 73, 79, 0.9);
    border-color: rgba(255, 255, 255, 0.4);
  }
  
  :global(.cesium-viewer) {
    font-family: inherit !important;
  }
  
  :global(.cesium-viewer-toolbar) {
    top: auto !important;
    left: auto !important;
    right: 10px !important;
    bottom: 30px !important;
  }
  
  :global(.cesium-viewer-bottom) {
    display: none !important;
  }
</style>