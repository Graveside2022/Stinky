<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { services, addNotification } from '../../shared/stores'
  import StatusIndicator from './ui/StatusIndicator.svelte'

  // WiFi Data Feed state
  let devicesCount = 0
  let networksCount = 0
  let lastUpdate = '--'
  let devicesList: Array<{id: string, name: string, signal: number, timestamp: Date}> = []
  let activityFeed: Array<{message: string, timestamp: Date}> = []

  // HackRF Sweeper state
  let hackrfFrequency = '145.0 MHz'
  let hackrfBandwidth = '2.4 MHz'
  let hackrfGain = '35 dB'
  let hackrfSignals: Array<{freq: string, strength: number, type: string}> = []
  let hackrfActivity: Array<{message: string, timestamp: Date}> = []

  let websocketConnection: WebSocket | null = null
  let reconnectTimeout: number | null = null

  function initializeWebSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/kismet`
      
      websocketConnection = new WebSocket(wsUrl)
      
      websocketConnection.onopen = () => {
        console.log('WebSocket connected to Kismet')
        addNotification({
          type: 'success',
          title: 'Connection',
          message: 'Connected to Kismet data feed'
        })
      }
      
      websocketConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      websocketConnection.onclose = () => {
        console.log('WebSocket disconnected')
        addNotification({
          type: 'warning',
          title: 'Connection',
          message: 'Disconnected from Kismet data feed'
        })
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(initializeWebSocket, 5000)
      }
      
      websocketConnection.onerror = (error) => {
        console.error('WebSocket error:', error)
        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: 'Failed to connect to Kismet data feed'
        })
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
    }
  }

  function handleWebSocketMessage(data: any) {
    if (data.type === 'device_update') {
      // Update device list
      devicesCount = data.devices_count || devicesCount
      networksCount = data.networks_count || networksCount
      lastUpdate = new Date().toLocaleTimeString()
      
      // Update recent devices
      if (data.recent_devices) {
        devicesList = data.recent_devices.slice(0, 10) // Keep only last 10
      }
      
      // Add to activity feed
      if (data.message) {
        activityFeed = [
          { message: data.message, timestamp: new Date() },
          ...activityFeed.slice(0, 19) // Keep only last 20 items
        ]
      }
    } else if (data.type === 'hackrf_update') {
      // Update HackRF data
      hackrfFrequency = data.frequency || hackrfFrequency
      hackrfBandwidth = data.bandwidth || hackrfBandwidth
      hackrfGain = data.gain || hackrfGain
      
      if (data.signals) {
        hackrfSignals = data.signals.slice(0, 10)
      }
      
      if (data.message) {
        hackrfActivity = [
          { message: data.message, timestamp: new Date() },
          ...hackrfActivity.slice(0, 19)
        ]
      }
    }
  }

  function minimizeBox(boxId: string) {
    // Toggle minimize state for specific box
    console.log(`Minimizing box: ${boxId}`)
  }

  onMount(() => {
    initializeWebSocket()
    
    // Initialize with mock data for demonstration
    devicesList = [
      { id: '1', name: 'iPhone-123', signal: -45, timestamp: new Date() },
      { id: '2', name: 'Samsung-456', signal: -62, timestamp: new Date() }
    ]
    
    activityFeed = [
      { message: 'Waiting for activity...', timestamp: new Date() }
    ]

    hackrfSignals = [
      { freq: '145.50', strength: 85, type: '2M Ham' },
      { freq: '446.12', strength: 72, type: 'UHF' }
    ]

    hackrfActivity = [
      { message: 'Scanning 2M band...', timestamp: new Date() }
    ]
  })

  onDestroy(() => {
    if (websocketConnection) {
      websocketConnection.close()
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }
  })
</script>

<div class="middle-long-box">
  <!-- WiFi Data Feed -->
  <div id="wifi-data-feed" class="grid-item">
    <div class="box-header">
      <h2>Kismet Data Feed</h2>
      <div class="box-controls">
        <button class="control-button-small" on:click={() => minimizeBox('wifi-data-feed')}>▼</button>
      </div>
    </div>
    <div class="grid-item-content">
      <!-- Stats Summary -->
      <div class="stats-summary">
        <div class="stat-item">
          <div class="stat-label">Devices</div>
          <div class="stat-value">{devicesCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Networks</div>
          <div class="stat-value">{networksCount}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Last Update</div>
          <div class="stat-value">{lastUpdate}</div>
        </div>
      </div>

      <!-- Recent Devices -->
      <div class="section">
        <h3 class="section-title">Recent Devices</h3>
        <div class="devices-list">
          {#each devicesList as device (device.id)}
            <div class="feed-item">
              <span class="device-name">{device.name}</span>
              <span class="device-signal" class:strong={device.signal > -50} class:weak={device.signal < -70}>
                {device.signal} dBm
              </span>
            </div>
          {:else}
            <div class="feed-item">No devices detected</div>
          {/each}
        </div>
      </div>

      <!-- Activity Feed -->
      <div class="section">
        <h3 class="section-title">Activity Feed</h3>
        <div class="activity-feed">
          {#each activityFeed as activity}
            <div class="feed-item">
              <span class="activity-time">{activity.timestamp.toLocaleTimeString()}</span>
              <span class="activity-message">{activity.message}</span>
            </div>
          {:else}
            <div class="feed-item">Waiting for activity...</div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- HackRF Sweeper -->
  <div id="hackrf-sweeper" class="grid-item">
    <div class="box-header">
      <h2>HackRF Sweeper</h2>
      <div class="box-controls">
        <button class="control-button-small" on:click={() => minimizeBox('hackrf-sweeper')}>▼</button>
      </div>
    </div>
    <div class="grid-item-content">
      <!-- HackRF Stats -->
      <div class="stats-summary">
        <div class="stat-item">
          <div class="stat-label">Frequency</div>
          <div class="stat-value">{hackrfFrequency}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Bandwidth</div>
          <div class="stat-value">{hackrfBandwidth}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Gain</div>
          <div class="stat-value">{hackrfGain}</div>
        </div>
      </div>

      <!-- Signal Detection -->
      <div class="section">
        <h3 class="section-title">Signal Detection</h3>
        <div class="signals-list">
          {#each hackrfSignals as signal}
            <div class="feed-item">
              <span class="signal-freq">{signal.freq} MHz</span>
              <span class="signal-strength" class:strong={signal.strength > 80} class:weak={signal.strength < 50}>
                {signal.strength}%
              </span>
              <span class="signal-type">{signal.type}</span>
            </div>
          {:else}
            <div class="feed-item">No signals detected</div>
          {/each}
        </div>
      </div>

      <!-- HackRF Activity -->
      <div class="section">
        <h3 class="section-title">Sweep Activity</h3>
        <div class="activity-feed">
          {#each hackrfActivity as activity}
            <div class="feed-item">
              <span class="activity-time">{activity.timestamp.toLocaleTimeString()}</span>
              <span class="activity-message">{activity.message}</span>
            </div>
          {:else}
            <div class="feed-item">Sweeper standby...</div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .middle-long-box {
    display: grid;
    grid-template-rows: 1fr 1fr;
    height: 100%;
    gap: 10px;
    grid-column: 2;
    width: 100%;
    box-sizing: border-box;
  }

  .grid-item {
    background: var(--bg-secondary);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: all 0.3s ease;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .grid-item:hover {
    border-color: var(--accent-primary);
    box-shadow: var(--glow-primary);
  }

  .box-header {
    background: var(--bg-tertiary);
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .box-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .control-button-small {
    background: var(--bg-panel);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }

  .control-button-small:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    box-shadow: var(--glow-primary);
  }

  .grid-item-content {
    padding: 10px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .stats-summary {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .stat-item {
    text-align: center;
  }

  .stat-label {
    color: var(--accent-primary);
    font-size: 0.9em;
  }

  .stat-value {
    color: var(--text-primary);
    font-size: 1.2em;
    font-weight: bold;
  }

  .section {
    margin-bottom: 15px;
  }

  .section-title {
    color: var(--accent-primary);
    margin: 0 0 10px 0;
    font-size: 1em;
  }

  .devices-list, .signals-list, .activity-feed {
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
  }

  .feed-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    font-size: 0.9em;
    gap: 10px;
  }

  .feed-item:last-child {
    border-bottom: none;
  }

  .feed-item:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  .device-name, .signal-freq {
    font-weight: 500;
    flex: 1;
  }

  .device-signal, .signal-strength {
    font-family: 'Courier New', monospace;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.8em;
  }

  .device-signal.strong, .signal-strength.strong {
    background: var(--accent-success);
    color: var(--bg-primary);
  }

  .device-signal.weak, .signal-strength.weak {
    background: var(--accent-error);
    color: var(--text-primary);
  }

  .signal-type {
    color: var(--text-muted);
    font-size: 0.8em;
  }

  .activity-time {
    color: var(--text-muted);
    font-size: 0.8em;
    font-family: 'Courier New', monospace;
    min-width: 80px;
  }

  .activity-message {
    flex: 1;
    color: var(--text-primary);
  }

  /* Mobile responsive */
  @media (max-width: 1023px) {
    .middle-long-box {
      grid-template-rows: auto auto;
      gap: 12px;
    }

    .stats-summary {
      flex-direction: column;
      gap: 10px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      text-align: left;
    }
  }

  @media (max-width: 768px) {
    .grid-item-content {
      padding: 8px;
    }

    .feed-item {
      padding: 6px 8px;
      font-size: 0.8em;
    }

    .devices-list, .signals-list, .activity-feed {
      max-height: 120px;
    }
  }
</style>