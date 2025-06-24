<script>
    import { onMount, onDestroy } from 'svelte';
    import { processedFFT, frequencyMHz, sampleRateMHz } from '$lib/stores/spectrum.js';
    
    let plotContainer;
    let plotly;
    let resizeObserver;
    
    // Plotly configuration
    const layout = {
        title: {
            text: 'Real-time Spectrum',
            font: { color: '#0f0' }
        },
        xaxis: { 
            title: 'Frequency (MHz)', 
            color: '#0f0',
            gridcolor: '#333'
        },
        yaxis: { 
            title: 'Power (dB)', 
            color: '#0f0',
            gridcolor: '#333'
        },
        paper_bgcolor: '#000',
        plot_bgcolor: '#111',
        font: { color: '#0f0' },
        margin: {
            l: 60,
            r: 20,
            t: 40,
            b: 60
        },
        showlegend: false,
        autosize: true
    };
    
    const config = {
        responsive: true,
        displayModeBar: false
    };
    
    onMount(async () => {
        // Dynamically import Plotly
        const module = await import('plotly.js-dist-min');
        plotly = module.default;
        
        // Initialize the plot
        initializePlot();
        
        // Setup resize observer
        resizeObserver = new ResizeObserver(() => {
            if (plotly && plotContainer) {
                plotly.Plots.resize(plotContainer);
            }
        });
        resizeObserver.observe(plotContainer);
    });
    
    onDestroy(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        if (plotly && plotContainer) {
            plotly.purge(plotContainer);
        }
    });
    
    function initializePlot() {
        const data = [{
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            line: { 
                color: '#0f0',
                width: 1
            },
            name: 'Spectrum'
        }];
        
        plotly.newPlot(plotContainer, data, layout, config);
    }
    
    // Update plot when FFT data changes
    $: if (plotly && plotContainer && $processedFFT) {
        updatePlot($processedFFT);
    }
    
    function updatePlot(data) {
        const update = {
            x: [data.frequencies],
            y: [data.powers]
        };
        
        plotly.restyle(plotContainer, update, 0);
    }
</script>

<div class="spectrum-display">
    <div class="spectrum-header">
        <span>Center: {$frequencyMHz} MHz</span>
        <span>Sample Rate: {$sampleRateMHz} MHz</span>
    </div>
    <div class="plot-container" bind:this={plotContainer}></div>
</div>

<style>
    .spectrum-display {
        display: flex;
        flex-direction: column;
        height: 400px;
    }
    
    .spectrum-header {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        background: #000;
        border-bottom: 1px solid #0f0;
        font-size: 14px;
    }
    
    .plot-container {
        flex: 1;
        min-height: 0;
    }
</style>