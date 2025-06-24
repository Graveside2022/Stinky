<script lang="ts">
  import CesiumGlobe from './CesiumGlobe.svelte'
  import { deviceList, selectedDevice, selectDevice } from '$lib/stores/websocket/kismet'
  import type { KismetDevice } from '$lib/services/websocket/types'
  
  export let height = '100%'
  export let showControls = true
  export let showDeviceList = true
  export let enableClustering = true
  
  let globeComponent: CesiumGlobe
  let searchQuery = ''
  let deviceTypeFilter: 'all' | 'wifi' | 'bluetooth' | 'other' = 'all'
  let showTrackingPaths = false
  
  // Filter devices based on search and type
  $: filteredDevices = $deviceList.filter(device => {
    const matchesSearch = !searchQuery || 
      device.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.mac?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = deviceTypeFilter === 'all' || device.type === deviceTypeFilter
    
    return matchesSearch && matchesType && device.location
  })
  
  // Group devices by signal strength
  $: devicesBySignal = filteredDevices.reduce((acc, device) => {
    const signal = device.signalStrength || -100
    let category: string
    
    if (signal > -50) category = 'strong'
    else if (signal > -70) category = 'medium'
    else category = 'weak'
    
    if (!acc[category]) acc[category] = []
    acc[category].push(device)
    
    return acc
  }, {} as Record<string, KismetDevice[]>)
  
  function handleDeviceClick(device: KismetDevice) {
    selectDevice(device)
    globeComponent?.flyToDevice(device)
  }
  
  function clearSelection() {
    selectDevice(null)
  }
  
  function toggleTracking() {
    showTrackingPaths = !showTrackingPaths
    // TODO: Implement path tracking visualization
  }
</script>

<div class="tracking-globe-container" style="height: {height};">
  <div class="globe-wrapper">
    <CesiumGlobe
      bind:this={globeComponent}
      height="100%"
      showStats={true}
      {enableClustering}
    />
  </div>
  
  {#if showControls}
    <div class="control-panel">
      <div class="control-section">
        <h3>Tracking Controls</h3>
        
        <div class="control-group">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search devices..."
            class="search-input"
          />
        </div>
        
        <div class="control-group">
          <label>Device Type:</label>
          <select bind:value={deviceTypeFilter} class="filter-select">
            <option value="all">All Types</option>
            <option value="wifi">WiFi</option>
            <option value="bluetooth">Bluetooth</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="control-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={enableClustering}
              on:change={(e) => globeComponent?.toggleClustering(e.currentTarget.checked)}
            />
            Enable Clustering
          </label>
        </div>
        
        <div class="control-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              bind:checked={showTrackingPaths}
              on:change={toggleTracking}
            />
            Show Tracking Paths
          </label>
        </div>
        
        {#if $selectedDevice}
          <div class="selected-device">
            <h4>Selected Device</h4>
            <div class="device-info">
              <p><strong>{$selectedDevice.name || 'Unknown'}</strong></p>
              <p>{$selectedDevice.mac}</p>
              <p>Signal: {$selectedDevice.signalStrength || 'N/A'} dBm</p>
            </div>
            <button on:click={clearSelection} class="clear-btn">
              Clear Selection
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  
  {#if showDeviceList}
    <div class="device-list-panel">
      <h3>Tracked Devices ({filteredDevices.length})</h3>
      
      <div class="device-categories">
        {#each Object.entries(devicesBySignal) as [category, devices]}
          <details class="device-category" open={category === 'strong'}>
            <summary class="category-header">
              <span class="category-name">{category}</span>
              <span class="category-count">{devices.length}</span>
            </summary>
            
            <div class="device-list">
              {#each devices as device}
                <button
                  class="device-item"
                  class:selected={$selectedDevice?.id === device.id}
                  on:click={() => handleDeviceClick(device)}
                >
                  <div class="device-icon {device.type}"></div>
                  <div class="device-details">
                    <div class="device-name">
                      {device.name || device.mac || device.id}
                    </div>
                    <div class="device-meta">
                      {device.type} • {device.signalStrength || 'N/A'} dBm
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </details>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .tracking-globe-container {
    display: flex;
    position: relative;
    width: 100%;
  }
  
  .globe-wrapper {
    flex: 1;
    position: relative;
  }
  
  .control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 280px;
    background: rgba(32, 35, 41, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 20px;
    color: white;
    z-index: 100;
    max-height: calc(100% - 40px);
    overflow-y: auto;
  }
  
  .control-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .control-group {
    margin-bottom: 16px;
  }
  
  .control-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }
  
  .search-input,
  .filter-select {
    width: 100%;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: white;
    font-size: 14px;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
  }
  
  .checkbox-label input {
    cursor: pointer;
  }
  
  .selected-device {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .selected-device h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
  }
  
  .device-info {
    margin-bottom: 12px;
  }
  
  .device-info p {
    margin: 4px 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .clear-btn {
    width: 100%;
    padding: 8px;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.4);
    border-radius: 4px;
    color: white;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
  }
  
  .device-list-panel {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 320px;
    background: rgba(32, 35, 41, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 20px;
    color: white;
    z-index: 100;
    max-height: calc(100% - 40px);
    overflow-y: auto;
  }
  
  .device-list-panel h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .device-categories {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .device-category {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    user-select: none;
  }
  
  .category-header:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .category-name {
    font-weight: 600;
    text-transform: capitalize;
  }
  
  .category-count {
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
  }
  
  .device-list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .device-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-align: left;
  }
  
  .device-item:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .device-item.selected {
    background: rgba(99, 102, 241, 0.2);
    border-color: rgba(99, 102, 241, 0.4);
  }
  
  .device-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  
  .device-icon.wifi {
    background: linear-gradient(135deg, #10b981, #059669);
  }
  
  .device-icon.bluetooth {
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  }
  
  .device-icon.other {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }
  
  .device-details {
    flex: 1;
    min-width: 0;
  }
  
  .device-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .device-meta {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
</style>