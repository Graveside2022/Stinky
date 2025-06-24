<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import AnimatedBlobs from '$lib/components/effects/AnimatedBlobs.svelte';
  import GlassPanel from '$lib/components/theme/GlassPanel.svelte';
  import MetricCard from '$lib/components/theme/MetricCard.svelte';
  import ControlSection from '$lib/components/controls/ControlSection.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import StatusIndicator from '$lib/components/ui/StatusIndicator.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { hackrfAPI } from '$lib/services/api/hackrf';
  import { hackrfWebSocket } from '$lib/services/websocket/hackrf';
  import type { SpectrumData, SignalInfo, HackRFConfig } from '$lib/types';

  // State
  let connected = false;
  let connecting = false;
  let error: string | null = null;
  let spectrumData: SpectrumData | null = null;
  let signals: SignalInfo[] = [];
  let config: HackRFConfig = {
    centerFreq: 433920000, // 433.92 MHz (ISM band)
    sampleRate: 2000000,   // 2 MHz
    gain: 30,
    enabled: false
  };
  let scanning = false;
  let openWebRXStatus = {
    connected: false,
    url: '',
    lastUpdate: ''
  };

  // Canvas for spectrum display
  let canvasElement: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number;

  // Subscribe to WebSocket updates
  const unsubscribeConnected = hackrfWebSocket.connected.subscribe(value => {
    connected = value;
  });

  const unsubscribeSpectrum = hackrfWebSocket.spectrumData.subscribe(value => {
    spectrumData = value;
    if (value && ctx) {
      drawSpectrum(value);
    }
  });

  const unsubscribeSignals = hackrfWebSocket.signals.subscribe(value => {
    signals = value;
  });

  onMount(async () => {
    // Setup canvas
    if (canvasElement) {
      ctx = canvasElement.getContext('2d');
      if (ctx) {
        // Set canvas size
        const updateCanvasSize = () => {
          const rect = canvasElement.parentElement?.getBoundingClientRect();
          if (rect) {
            canvasElement.width = rect.width;
            canvasElement.height = 400;
          }
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
      }
    }

    // Load initial config
    try {
      const status = await hackrfAPI.getStatus();
      config = status.config;
      scanning = config.enabled;
    } catch (err) {
      console.error('Failed to load HackRF status:', err);
    }

    // Subscribe to real-time updates
    hackrfWebSocket.subscribeToSpectrum();
    hackrfWebSocket.subscribeToSignals();

    // Check OpenWebRX status
    checkOpenWebRXStatus();
  });

  onDestroy(() => {
    unsubscribeConnected();
    unsubscribeSpectrum();
    unsubscribeSignals();
    hackrfWebSocket.unsubscribeFromSpectrum();
    hackrfWebSocket.unsubscribeFromSignals();
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  async function toggleScanning() {
    try {
      if (scanning) {
        await hackrfAPI.stop();
        scanning = false;
      } else {
        await hackrfAPI.start();
        scanning = true;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to toggle scanning';
    }
  }

  async function updateConfig() {
    try {
      const updatedConfig = await hackrfAPI.updateConfig(config);
      config = updatedConfig;
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update configuration';
    }
  }

  async function checkOpenWebRXStatus() {
    try {
      openWebRXStatus = await hackrfAPI.getOpenWebRXStatus();
    } catch (err) {
      console.error('Failed to check OpenWebRX status:', err);
    }
  }

  function drawSpectrum(data: SpectrumData) {
    if (!ctx || !canvasElement) return;

    const width = canvasElement.width;
    const height = canvasElement.height;

    // Clear canvas with dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height, data);

    // Draw spectrum
    const amplitudes = data.amplitude;
    const binWidth = width / amplitudes.length;

    // Create gradient for spectrum
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 0, 255, 0.8)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(0, 255, 255, 1)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < amplitudes.length; i++) {
      const x = i * binWidth;
      const amplitude = Math.max(0, Math.min(1, (amplitudes[i] + 100) / 100)); // Normalize -100 to 0 dBm
      const y = height - (amplitude * height * 0.8); // Use 80% of height for spectrum
      
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw detected signals
    drawSignals(ctx, width, height, data);

    // Add scan line effect
    if (scanning) {
      const scanX = (Date.now() % 2000) / 2000 * width;
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, data: SpectrumData) {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';

    // Vertical frequency markers
    const freqStep = data.sampleRate / 10;
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const freq = data.centerFreq - data.sampleRate / 2 + i * freqStep;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (i % 2 === 0) {
        ctx.fillText(`${(freq / 1e6).toFixed(2)} MHz`, x + 5, height - 5);
      }
    }

    // Horizontal power level markers
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * height * 0.8;
      const dbm = -100 + (1 - i / 5) * 100;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillText(`${dbm.toFixed(0)} dBm`, 5, y - 5);
    }
  }

  function drawSignals(ctx: CanvasRenderingContext2D, width: number, height: number, data: SpectrumData) {
    signals.forEach(signal => {
      const freqOffset = signal.frequency - (data.centerFreq - data.sampleRate / 2);
      const x = (freqOffset / data.sampleRate) * width;
      const power = Math.max(0, Math.min(1, (signal.power + 100) / 100));
      const y = height - (power * height * 0.8);

      // Draw signal marker
      ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
      ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
      ctx.lineWidth = 2;

      // Pulsing effect for active signals
      const pulse = Math.sin(Date.now() / 500) * 0.2 + 0.8;
      ctx.globalAlpha = pulse;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw frequency label
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '12px monospace';
      ctx.fillText(`${(signal.frequency / 1e6).toFixed(3)} MHz`, x + 10, y - 10);
      ctx.fillText(`${signal.power.toFixed(1)} dBm`, x + 10, y + 5);
    });
  }

  function formatFrequency(freq: number): string {
    if (freq >= 1e9) {
      return `${(freq / 1e9).toFixed(3)} GHz`;
    } else {
      return `${(freq / 1e6).toFixed(3)} MHz`;
    }
  }

  function formatBandwidth(bw: number): string {
    if (bw >= 1e6) {
      return `${(bw / 1e6).toFixed(1)} MHz`;
    } else {
      return `${(bw / 1e3).toFixed(0)} kHz`;
    }
  }
</script>

<style>
  .spectrum-container {
    position: relative;
    width: 100%;
    height: 400px;
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 8px;
    overflow: hidden;
  }

  .spectrum-canvas {
    width: 100%;
    height: 100%;
  }

  .frequency-input {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(0, 255, 255, 0.3);
    color: #00ffff;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-family: monospace;
    transition: all 0.3s ease;
  }

  .frequency-input:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }

  .signal-item {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 0, 255, 0.3);
    padding: 1rem;
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .signal-item:hover {
    border-color: rgba(255, 0, 255, 0.6);
    box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
</style>

<div class="min-h-screen bg-gray-900 text-white relative overflow-hidden">
  <AnimatedBlobs />
  
  <div class="relative z-10 p-6">
    <!-- Header -->
    <div class="mb-8" in:fade={{ duration: 300 }}>
      <GlassPanel class="p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
              HackRF Spectrum Analyzer
            </h1>
            <StatusIndicator status={connected ? 'success' : 'error'} size="lg" />
          </div>
          <div class="flex items-center gap-4">
            {#if openWebRXStatus.connected}
              <Badge variant="success">OpenWebRX Connected</Badge>
            {/if}
            <Button 
              variant={scanning ? 'secondary' : 'primary'}
              on:click={toggleScanning}
              disabled={!connected}
            >
              {#if scanning}
                <LoadingSpinner size="sm" class="mr-2" />
                Stop Scanning
              {:else}
                Start Scanning
              {/if}
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Spectrum Display -->
      <div class="lg:col-span-2" in:fly={{ x: -20, duration: 500, delay: 100 }}>
        <GlassPanel class="p-6">
          <h2 class="text-2xl font-semibold mb-4 text-cyan-400">Spectrum Display</h2>
          <div class="spectrum-container">
            <canvas bind:this={canvasElement} class="spectrum-canvas"></canvas>
            {#if !connected}
              <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                <div class="text-center">
                  <LoadingSpinner size="lg" class="mb-4" />
                  <p class="text-cyan-400">Connecting to HackRF...</p>
                </div>
              </div>
            {/if}
          </div>
          
          {#if spectrumData}
            <div class="mt-4 grid grid-cols-2 gap-4">
              <MetricCard
                title="Center Frequency"
                value={formatFrequency(spectrumData.centerFreq)}
                trend={0}
                icon="radio"
              />
              <MetricCard
                title="Sample Rate"
                value={formatBandwidth(spectrumData.sampleRate)}
                trend={0}
                icon="activity"
              />
            </div>
          {/if}
        </GlassPanel>
      </div>

      <!-- Controls -->
      <div class="space-y-6" in:fly={{ x: 20, duration: 500, delay: 200 }}>
        <!-- Configuration -->
        <ControlSection title="Configuration">
          <div class="space-y-4">
            <div>
              <label for="center-freq" class="block text-sm font-medium text-gray-400 mb-2">
                Center Frequency
              </label>
              <input
                id="center-freq"
                type="number"
                bind:value={config.centerFreq}
                on:change={updateConfig}
                class="frequency-input w-full"
                step="100000"
              />
            </div>
            
            <div>
              <label for="sample-rate" class="block text-sm font-medium text-gray-400 mb-2">
                Sample Rate
              </label>
              <select
                id="sample-rate"
                bind:value={config.sampleRate}
                on:change={updateConfig}
                class="frequency-input w-full"
              >
                <option value={1000000}>1 MHz</option>
                <option value={2000000}>2 MHz</option>
                <option value={5000000}>5 MHz</option>
                <option value={10000000}>10 MHz</option>
                <option value={20000000}>20 MHz</option>
              </select>
            </div>
            
            <div>
              <label for="gain" class="block text-sm font-medium text-gray-400 mb-2">
                Gain (0-47 dB)
              </label>
              <input
                id="gain"
                type="range"
                bind:value={config.gain}
                on:change={updateConfig}
                min="0"
                max="47"
                class="w-full"
              />
              <div class="text-center text-cyan-400 mt-1">{config.gain} dB</div>
            </div>
          </div>
        </ControlSection>

        <!-- Quick Presets -->
        <ControlSection title="Quick Presets">
          <div class="control-grid">
            <Button
              variant="ghost"
              size="sm"
              on:click={() => {
                config.centerFreq = 433920000;
                updateConfig();
              }}
            >
              433 MHz ISM
            </Button>
            <Button
              variant="ghost"
              size="sm"
              on:click={() => {
                config.centerFreq = 915000000;
                updateConfig();
              }}
            >
              915 MHz ISM
            </Button>
            <Button
              variant="ghost"
              size="sm"
              on:click={() => {
                config.centerFreq = 2450000000;
                updateConfig();
              }}
            >
              2.4 GHz WiFi
            </Button>
            <Button
              variant="ghost"
              size="sm"
              on:click={() => {
                config.centerFreq = 5800000000;
                updateConfig();
              }}
            >
              5.8 GHz WiFi
            </Button>
          </div>
        </ControlSection>

        <!-- Status -->
        <ControlSection title="Status">
          <div class="space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Connection</span>
              <Badge variant={connected ? 'success' : 'error'}>
                {connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Scanning</span>
              <Badge variant={scanning ? 'primary' : 'secondary'}>
                {scanning ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-400">Signals Detected</span>
              <Badge variant="info">{signals.length}</Badge>
            </div>
          </div>
        </ControlSection>
      </div>
    </div>

    <!-- Detected Signals -->
    {#if signals.length > 0}
      <div class="mt-8" in:fade={{ duration: 300, delay: 300 }}>
        <GlassPanel class="p-6">
          <h2 class="text-2xl font-semibold mb-4 text-purple-400">Detected Signals</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each signals as signal}
              <div class="signal-item">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="text-lg font-semibold text-purple-400">
                      {formatFrequency(signal.frequency)}
                    </div>
                    <div class="text-sm text-gray-400">
                      {signal.modulation || 'Unknown'}
                    </div>
                  </div>
                  <Badge variant={signal.power > -50 ? 'success' : signal.power > -70 ? 'warning' : 'error'}>
                    {signal.power.toFixed(1)} dBm
                  </Badge>
                </div>
                <div class="text-sm text-gray-500">
                  Bandwidth: {formatBandwidth(signal.bandwidth)}
                </div>
              </div>
            {/each}
          </div>
        </GlassPanel>
      </div>
    {/if}

    <!-- Error Display -->
    {#if error}
      <div class="fixed bottom-4 right-4 max-w-md" in:fly={{ y: 50, duration: 300 }}>
        <GlassPanel class="p-4 border-red-500">
          <div class="flex items-center gap-3">
            <Badge variant="error">Error</Badge>
            <p class="text-red-400">{error}</p>
          </div>
        </GlassPanel>
      </div>
    {/if}
  </div>
</div>