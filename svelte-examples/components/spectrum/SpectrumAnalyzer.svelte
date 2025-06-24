<script>
    import { onMount, onDestroy } from 'svelte';
    import { 
        initializeSpectrumWebSocket, 
        cleanupSpectrumWebSocket,
        isScanning,
        dataMode,
        hackrfStatus,
        startScan,
        stopScan
    } from '$lib/stores/spectrum.js';
    import SpectrumDisplay from './SpectrumDisplay.svelte';
    import SignalList from './SignalList.svelte';
    import ScanControls from './ScanControls.svelte';
    import StatusPanel from './StatusPanel.svelte';
    
    // Initialize WebSocket connection on mount
    onMount(() => {
        initializeSpectrumWebSocket();
    });
    
    // Cleanup on unmount
    onDestroy(() => {
        cleanupSpectrumWebSocket();
    });
    
    // Handle scan toggle
    async function handleScanToggle() {
        if ($isScanning) {
            await stopScan();
        } else {
            await startScan();
        }
    }
</script>

<div class="spectrum-analyzer">
    <header class="analyzer-header">
        <h1>🛡️ HackRF Spectrum Analyzer</h1>
        <p class="subtitle">Real-time Signal Detection with OpenWebRX Integration</p>
    </header>
    
    <StatusPanel 
        mode={$dataMode}
        status={$hackrfStatus}
    />
    
    <ScanControls 
        scanning={$isScanning}
        on:toggle={handleScanToggle}
    />
    
    <div class="analyzer-grid">
        <div class="spectrum-section">
            <SpectrumDisplay />
        </div>
        
        <div class="signals-section">
            <SignalList />
        </div>
    </div>
</div>

<style>
    .spectrum-analyzer {
        background: #000;
        color: #0f0;
        font-family: 'Courier New', monospace;
        min-height: 100vh;
        padding: 20px;
    }
    
    .analyzer-header {
        text-align: center;
        margin-bottom: 20px;
    }
    
    .analyzer-header h1 {
        color: #0f0;
        margin: 0;
        font-size: 2rem;
        text-shadow: 0 0 10px #0f0;
    }
    
    .subtitle {
        color: #0a0;
        opacity: 0.8;
        margin: 5px 0 0 0;
    }
    
    .analyzer-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        margin-top: 20px;
    }
    
    .spectrum-section,
    .signals-section {
        background: #111;
        border: 2px solid #0f0;
        border-radius: 5px;
        padding: 15px;
    }
    
    @media (max-width: 768px) {
        .analyzer-grid {
            grid-template-columns: 1fr;
        }
    }
</style>