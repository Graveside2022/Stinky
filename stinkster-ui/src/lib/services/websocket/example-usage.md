# WebSocket Service Layer Usage Examples

## Basic WebSocket Client Usage

```typescript
import { WebSocketClient } from '$lib/services/websocket'
import type { WebSocketMessage } from '$shared/types'

// Create a WebSocket client
const wsClient = new WebSocketClient({
  url: 'ws://localhost:8080',
  reconnection: true,
  reconnectionAttempts: 5
}, {
  onConnect: () => console.log('Connected!'),
  onMessage: (message: WebSocketMessage) => {
    console.log('Received:', message)
  },
  onError: (error) => console.error('Error:', error)
})

// Send a message
wsClient.send('update', { data: 'test' })

// Emit custom event
wsClient.emit('custom-event', { value: 42 })

// Disconnect
wsClient.disconnect()
```

## Using HackRF Store in Svelte Component

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { 
    connectHackRF, 
    disconnectHackRF,
    spectrumData,
    hackrfStatus,
    isConnected,
    updateHackRFConfig
  } from '$lib/stores/websocket/hackrf'
  
  onMount(() => {
    // Connect to HackRF WebSocket
    connectHackRF('ws://localhost:8092')
  })
  
  onDestroy(() => {
    // Clean up connection
    disconnectHackRF()
  })
  
  function changeFrequency(freq: number) {
    updateHackRFConfig({ frequency: freq })
  }
</script>

<div>
  {#if $isConnected}
    <p>Connected to HackRF</p>
    {#if $hackrfStatus}
      <p>Frequency: {$hackrfStatus.frequency} Hz</p>
      <p>Sample Rate: {$hackrfStatus.sampleRate}</p>
    {/if}
    
    {#if $spectrumData}
      <!-- Render spectrum visualization -->
      <canvas>
        <!-- Spectrum display implementation -->
      </canvas>
    {/if}
  {:else}
    <p>Disconnected</p>
  {/if}
</div>
```

## Using Wigle Store for Device Tracking

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    connectWigle,
    disconnectWigle,
    deviceList,
    scanStatus,
    startScan,
    stopScan,
    isConnected
  } from '$lib/stores/websocket/wigle'
  
  onMount(() => {
    connectWigle()
  })
  
  onDestroy(() => {
    disconnectWigle()
  })
</script>

<div>
  {#if $isConnected}
    <button onclick={startScan}>Start Scan</button>
    <button onclick={stopScan}>Stop Scan</button>
    
    {#if $scanStatus}
      <p>Scanning: {$scanStatus.active}</p>
      <p>Devices Found: {$scanStatus.devicesFound}</p>
    {/if}
    
    <ul>
      {#each $deviceList as device}
        <li>
          {device.name || device.mac} - {device.signalStrength}dBm
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

## Using Kismet Store with Alerts

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    connectKismet,
    disconnectKismet,
    devicesByType,
    criticalAlerts,
    systemStatus,
    acknowledgeAlert,
    isConnected
  } from '$lib/stores/websocket/kismet'
  
  onMount(() => {
    connectKismet()
  })
  
  onDestroy(() => {
    disconnectKismet()
  })
</script>

<div>
  {#if $isConnected}
    {#if $systemStatus}
      <div>
        <p>Devices: {$systemStatus.devices}</p>
        <p>Packets: {$systemStatus.packets}</p>
        <p>CPU: {$systemStatus.cpuUsage}%</p>
      </div>
    {/if}
    
    {#if $criticalAlerts.length > 0}
      <div class="alerts">
        {#each $criticalAlerts as alert}
          <div class="alert critical">
            {alert.message}
            <button onclick={() => acknowledgeAlert(alert.id)}>
              Dismiss
            </button>
          </div>
        {/each}
      </div>
    {/if}
    
    <div>
      {#each [...$devicesByType.entries()] as [type, devices]}
        <h3>{type} Devices ({devices.length})</h3>
        <ul>
          {#each devices as device}
            <li>{device.name || device.mac}</li>
          {/each}
        </ul>
      {/each}
    </div>
  {/if}
</div>
```

## Multiple Concurrent Connections

```typescript
import { onMount, onDestroy } from 'svelte'
import { connectHackRF, disconnectHackRF } from '$lib/stores/websocket/hackrf'
import { connectWigle, disconnectWigle } from '$lib/stores/websocket/wigle'
import { connectKismet, disconnectKismet } from '$lib/stores/websocket/kismet'

// Connect to all services
onMount(() => {
  connectHackRF()
  connectWigle()
  connectKismet()
})

// Disconnect from all services
onDestroy(() => {
  disconnectHackRF()
  disconnectWigle()
  disconnectKismet()
})
```