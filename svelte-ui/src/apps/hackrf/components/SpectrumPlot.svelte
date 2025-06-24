<script>
  import { onMount, onDestroy } from 'svelte';
  import { spectrumStore } from '../stores/spectrum';

  let plotContainer;
  let plotInstance = null;
  let unsubscribe;

  onMount(() => {
    // Initialize Plotly
    initializePlot();

    // Subscribe to spectrum data updates
    unsubscribe = spectrumStore.subscribe($spectrum => {
      if ($spectrum.fftData) {
        updatePlot($spectrum.fftData);
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (plotInstance) {
      Plotly.purge(plotContainer);
    }
  });

  function initializePlot() {
    const layout = {
      title: 'Real-time Spectrum',
      xaxis: { 
        title: 'Frequency (MHz)', 
        color: '#0f0',
        gridcolor: '#333',
        zerolinecolor: '#444'
      },
      yaxis: { 
        title: 'Power (dB)', 
        color: '#0f0',
        gridcolor: '#333',
        zerolinecolor: '#444'
      },
      paper_bgcolor: '#000',
      plot_bgcolor: '#111',
      font: { color: '#0f0' },
      margin: { t: 50, r: 30, b: 50, l: 60 },
      hovermode: 'closest'
    };

    const data = [{
      x: [],
      y: [],
      type: 'scatter',
      mode: 'lines',
      line: { color: '#0f0', width: 2 },
      name: 'Spectrum',
      hovertemplate: 'Freq: %{x:.3f} MHz<br>Power: %{y:.1f} dB<extra></extra>'
    }];

    plotInstance = Plotly.newPlot(plotContainer, data, layout, {
      responsive: true,
      displayModeBar: false
    });
  }

  function updatePlot(fftData) {
    if (!fftData.data || fftData.data.length === 0) return;

    const centerFreq = fftData.center_freq / 1e6; // MHz
    const sampleRate = fftData.samp_rate / 1e6; // MHz
    const numBins = fftData.data.length;

    const freqs = [];
    const powers = fftData.data;

    for (let i = 0; i < numBins; i++) {
      const freq = centerFreq - (sampleRate / 2) + (i * sampleRate / numBins);
      freqs.push(freq);
    }

    const update = {
      x: [freqs],
      y: [powers]
    };

    Plotly.restyle(plotContainer, update, 0);
  }
</script>

<div class="spectrum-plot" bind:this={plotContainer}></div>

<style>
  .spectrum-plot {
    width: 100%;
    height: 100%;
    min-height: 400px;
    background-color: #000;
    border: 1px solid var(--border-color, #444);
  }
</style>