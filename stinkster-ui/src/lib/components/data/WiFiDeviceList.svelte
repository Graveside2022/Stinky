<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import StatusDot from '../ui/StatusDot.svelte'
  
  export let devices: Array<{
    mac: string
    ssid?: string
    manufacturer?: string
    signal?: number
    channel?: number
    encryption?: string
    lastSeen?: Date
    latitude?: number
    longitude?: number
    type?: string
  }> = []
  
  export let maxItems = 100
  export let sortBy: 'signal' | 'lastSeen' | 'ssid' | 'mac' = 'lastSeen'
  export let filterText = ''
  
  const dispatch = createEventDispatcher()
  
  $: filteredDevices = devices
    .filter(device => {
      if (!filterText) return true
      const searchText = filterText.toLowerCase()
      return device.mac.toLowerCase().includes(searchText) ||
             device.ssid?.toLowerCase().includes(searchText) ||
             device.manufacturer?.toLowerCase().includes(searchText)
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'signal':
          return (b.signal || -100) - (a.signal || -100)
        case 'lastSeen':
          return (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0)
        case 'ssid':
          return (a.ssid || a.mac).localeCompare(b.ssid || b.mac)
        case 'mac':
          return a.mac.localeCompare(b.mac)
        default:
          return 0
      }
    })
    .slice(0, maxItems)
  
  function handleDeviceClick(device: typeof devices[0]) {
    dispatch('device-select', device)
  }
  
  function getSignalStrength(signal?: number): 'strong' | 'medium' | 'weak' {
    if (!signal) return 'weak'
    if (signal > -50) return 'strong'
    if (signal > -70) return 'medium'
    return 'weak'
  }
  
  function getSignalColor(signal?: number): string {
    const strength = getSignalStrength(signal)
    switch (strength) {
      case 'strong': return 'var(--accent-success)'
      case 'medium': return 'var(--accent-warning)'
      case 'weak': return 'var(--accent-error)'
    }
  }
  
  function formatLastSeen(date?: Date): string {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }
  
  function getEncryptionIcon(encryption?: string): string {
    if (!encryption || encryption === 'Open') return '🔓'
    if (encryption.includes('WEP')) return '🔒'
    if (encryption.includes('WPA')) return '🔐'
    return '🛡️'
  }
</script>

<div class="wifi-device-list">
  <div class="list-header">
    <div class="filter-controls">
      <input 
        type="text" 
        placeholder="Filter devices..." 
        bind:value={filterText}
        class="filter-input"
      />
      <select bind:value={sortBy} class="sort-select">
        <option value="lastSeen">Last Seen</option>
        <option value="signal">Signal Strength</option>
        <option value="ssid">SSID</option>
        <option value="mac">MAC Address</option>
      </select>
    </div>
    <div class="device-count">
      {filteredDevices.length} of {devices.length} devices
    </div>
  </div>

  <div class="device-list-container">
    {#each filteredDevices as device (device.mac)}
      <div 
        class="device-item" 
        on:click={() => handleDeviceClick(device)}
        on:keydown={(e) => e.key === 'Enter' && handleDeviceClick(device)}
        role="button"
        tabindex="0"
      >
        <div class="device-header">
          <div class="device-name">
            <span class="ssid">
              {device.ssid || 'Hidden Network'}
            </span>
            <span class="encryption">
              {getEncryptionIcon(device.encryption)}
            </span>
          </div>
          <div class="signal-indicator">
            <StatusDot 
              status={getSignalStrength(device.signal) === 'weak' ? 'error' : 
                     getSignalStrength(device.signal) === 'medium' ? 'warning' : 'success'}
              size="small"
              label={device.signal ? `${device.signal} dBm` : 'No signal'}
            />
            {#if device.signal}
              <span class="signal-value" style="color: {getSignalColor(device.signal)}">
                {device.signal} dBm
              </span>
            {/if}
          </div>
        </div>

        <div class="device-details">
          <div class="mac-address">
            <span class="label">MAC:</span>
            <span class="value">{device.mac}</span>
          </div>
          
          {#if device.manufacturer}
            <div class="manufacturer">
              <span class="label">Vendor:</span>
              <span class="value">{device.manufacturer}</span>
            </div>
          {/if}
          
          <div class="metadata">
            {#if device.channel}
              <span class="channel">Ch {device.channel}</span>
            {/if}
            {#if device.type}
              <span class="device-type">{device.type}</span>
            {/if}
            <span class="last-seen">{formatLastSeen(device.lastSeen)}</span>
          </div>
          
          {#if device.latitude && device.longitude}
            <div class="location">
              <span class="label">📍</span>
              <span class="coordinates">
                {device.latitude.toFixed(6)}, {device.longitude.toFixed(6)}
              </span>
            </div>
          {/if}
        </div>
      </div>
    {/each}
    
    {#if filteredDevices.length === 0}
      <div class="no-devices">
        {#if filterText}
          No devices match filter "{filterText}"
        {:else}
          No WiFi devices detected
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .wifi-device-list {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .list-header {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-secondary);
    background: var(--bg-tertiary);
    flex-shrink: 0;
  }

  .filter-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .filter-input {
    flex: 1;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    color: var(--text-primary);
    font-size: 0.75rem;
    font-family: 'Courier New', monospace;
  }

  .filter-input:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
  }

  .sort-select {
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    padding: 0.25rem;
    color: var(--text-primary);
    font-size: 0.75rem;
    font-family: 'Courier New', monospace;
  }

  .sort-select:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  .device-count {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-align: right;
  }

  .device-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .device-item {
    background: var(--bg-panel);
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
    margin-bottom: 0.5rem;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .device-item:hover {
    border-color: var(--accent-primary);
    box-shadow: 0 0 12px rgba(0, 210, 255, 0.3);
    transform: translateY(-1px);
  }

  .device-item:active {
    transform: translateY(0);
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .device-name {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ssid {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.875rem;
  }

  .encryption {
    font-size: 0.75rem;
  }

  .signal-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .signal-value {
    font-size: 0.7rem;
    font-family: 'Courier New', monospace;
    font-weight: 600;
  }

  .device-details {
    font-size: 0.7rem;
    color: var(--text-secondary);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .mac-address, .manufacturer {
    display: flex;
    justify-content: space-between;
  }

  .label {
    color: var(--text-muted);
    min-width: 3rem;
  }

  .value {
    font-family: 'Courier New', monospace;
    color: var(--text-primary);
  }

  .metadata {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }

  .channel, .device-type, .last-seen {
    background: var(--bg-secondary);
    padding: 0.125rem 0.375rem;
    border-radius: 2px;
    font-size: 0.65rem;
    border: 1px solid var(--border-primary);
  }

  .location {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  .coordinates {
    font-family: 'Courier New', monospace;
    color: var(--accent-primary);
    font-size: 0.65rem;
  }

  .no-devices {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
    font-style: italic;
  }

  /* Custom scrollbar */
  .device-list-container::-webkit-scrollbar {
    width: 6px;
  }

  .device-list-container::-webkit-scrollbar-track {
    background: var(--bg-tertiary);
  }

  .device-list-container::-webkit-scrollbar-thumb {
    background: var(--border-primary);
    border-radius: 3px;
  }

  .device-list-container::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .list-header {
      padding: 0.5rem;
    }

    .filter-controls {
      flex-direction: column;
    }

    .device-item {
      padding: 0.5rem;
    }

    .device-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .signal-indicator {
      align-self: flex-end;
    }

    .metadata {
      gap: 0.5rem;
    }
  }
</style>