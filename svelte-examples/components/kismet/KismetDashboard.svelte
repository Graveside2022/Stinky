<script>
    import { onMount, onDestroy } from 'svelte';
    import GridLayout from '$lib/components/layout/GridLayout.svelte';
    import SystemStatus from './SystemStatus.svelte';
    import DevicesFeed from './DevicesFeed.svelte';
    import SignalVisualization from './SignalVisualization.svelte';
    import CesiumGlobe from './CesiumGlobe.svelte';
    import KismetFrame from './KismetFrame.svelte';
    import { initializeKismetWebSocket, cleanupKismetWebSocket } from '$lib/stores/kismet.js';
    
    let dashboardReady = false;
    
    // Dashboard layout configuration
    const gridItems = [
        {
            id: 'system-status',
            component: SystemStatus,
            x: 0,
            y: 0,
            w: 4,
            h: 2,
            minW: 3,
            minH: 2,
            title: 'System Status'
        },
        {
            id: 'devices-feed',
            component: DevicesFeed,
            x: 4,
            y: 0,
            w: 4,
            h: 4,
            minW: 3,
            minH: 3,
            title: 'Devices Feed'
        },
        {
            id: 'signal-viz',
            component: SignalVisualization,
            x: 8,
            y: 0,
            w: 4,
            h: 4,
            minW: 3,
            minH: 3,
            title: 'Signal Detection'
        },
        {
            id: 'cesium-globe',
            component: CesiumGlobe,
            x: 0,
            y: 2,
            w: 4,
            h: 4,
            minW: 3,
            minH: 3,
            title: '3D Globe'
        },
        {
            id: 'kismet-frame',
            component: KismetFrame,
            x: 0,
            y: 6,
            w: 12,
            h: 4,
            minW: 6,
            minH: 3,
            title: 'Kismet Interface'
        }
    ];
    
    onMount(() => {
        initializeKismetWebSocket();
        dashboardReady = true;
    });
    
    onDestroy(() => {
        cleanupKismetWebSocket();
    });
</script>

<div class="kismet-dashboard">
    <header class="dashboard-header">
        <h1>Kismet Operations Center</h1>
        <div class="header-controls">
            <button class="control-btn" on:click={() => window.location.reload()}>
                🔄 Refresh
            </button>
            <button class="control-btn" on:click={() => document.documentElement.requestFullscreen()}>
                🖥️ Fullscreen
            </button>
        </div>
    </header>
    
    {#if dashboardReady}
        <GridLayout items={gridItems} />
    {:else}
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Initializing Operations Center...</p>
        </div>
    {/if}
</div>

<style>
    .kismet-dashboard {
        min-height: 100vh;
        background: var(--bg-primary, #030610);
        color: var(--text-primary, #d0d8f0);
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    
    .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: linear-gradient(90deg, rgba(0, 210, 255, 0.1) 0%, rgba(0, 210, 255, 0.2) 50%, rgba(0, 210, 255, 0.1) 100%);
        border-bottom: 1px solid rgba(0, 210, 255, 0.3);
    }
    
    .dashboard-header h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
        background: linear-gradient(135deg, #00d2ff 0%, #00a8cc 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    .header-controls {
        display: flex;
        gap: 10px;
    }
    
    .control-btn {
        background: rgba(0, 210, 255, 0.1);
        border: 1px solid rgba(0, 210, 255, 0.3);
        color: #00d2ff;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
    }
    
    .control-btn:hover {
        background: rgba(0, 210, 255, 0.2);
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
    }
    
    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 50vh;
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 3px solid rgba(0, 210, 255, 0.1);
        border-top-color: #00d2ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>