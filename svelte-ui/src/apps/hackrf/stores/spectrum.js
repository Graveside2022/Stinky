import { writable, derived } from 'svelte/store';

// Spectrum data store
function createSpectrumStore() {
  const { subscribe, set, update } = writable({
    fftData: null,
    status: {
      connected: false,
      buffer_size: 0
    },
    config: {
      center_freq: null,
      samp_rate: null,
      fft_size: 1024
    },
    lastUpdate: null
  });

  return {
    subscribe,
    updateFFTData: (fftData) => update(state => ({
      ...state,
      fftData,
      lastUpdate: Date.now()
    })),
    updateStatus: (status) => update(state => ({
      ...state,
      status: { ...state.status, ...status },
      config: status.config ? { ...state.config, ...status.config } : state.config
    })),
    updateConfig: (config) => update(state => ({
      ...state,
      config: { ...state.config, ...config }
    })),
    reset: () => set({
      fftData: null,
      status: { connected: false, buffer_size: 0 },
      config: { center_freq: null, samp_rate: null, fft_size: 1024 },
      lastUpdate: null
    })
  };
}

// Signals store
function createSignalsStore() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    set,
    add: (signal) => update(signals => [...signals, signal]),
    clear: () => set([]),
    updateSignal: (id, updates) => update(signals => 
      signals.map(s => s.id === id ? { ...s, ...updates } : s)
    )
  };
}

// Scan profiles store
export const scanProfiles = writable({
  vhf: { 
    name: 'VHF (144-148 MHz)', 
    start: 144e6, 
    stop: 148e6, 
    step: 25e3 
  },
  uhf: { 
    name: 'UHF (430-440 MHz)', 
    start: 430e6, 
    stop: 440e6, 
    step: 25e3 
  },
  ism: { 
    name: 'ISM (2.4-2.5 GHz)', 
    start: 2.4e9, 
    stop: 2.5e9, 
    step: 1e6 
  },
  cell800: { 
    name: 'Cellular 800', 
    start: 824e6, 
    stop: 894e6, 
    step: 200e3 
  },
  cell1900: { 
    name: 'Cellular 1900', 
    start: 1850e6, 
    stop: 1990e6, 
    step: 200e3 
  },
  aviation: { 
    name: 'Aviation', 
    start: 118e6, 
    stop: 137e6, 
    step: 25e3 
  }
});

// Create store instances
export const spectrumStore = createSpectrumStore();
export const signalsStore = createSignalsStore();

// Derived stores
export const isConnected = derived(
  spectrumStore,
  $spectrum => $spectrum.status.connected
);

export const isRealData = derived(
  spectrumStore,
  $spectrum => $spectrum.status.connected && $spectrum.status.buffer_size > 0
);

export const centerFrequencyMHz = derived(
  spectrumStore,
  $spectrum => $spectrum.config.center_freq ? ($spectrum.config.center_freq / 1e6).toFixed(3) : 'N/A'
);

export const sampleRateMHz = derived(
  spectrumStore,
  $spectrum => $spectrum.config.samp_rate ? ($spectrum.config.samp_rate / 1e6).toFixed(3) : 'N/A'
);