import { writable, derived, get } from 'svelte/store';
import { createWebSocket } from './websocket.js';

// Spectrum analyzer state
export const fftData = writable([]);
export const centerFrequency = writable(145000000); // Hz
export const sampleRate = writable(2400000); // Hz
export const isScanning = writable(false);
export const scanProfile = writable('vhf');
export const dataMode = writable('demo'); // 'demo' or 'real'

// Signal detection state
export const signalDetections = writable(new Map());
export const selectedSignal = writable(null);
export const signalHistory = writable([]);

// HackRF status
export const hackrfStatus = writable({
    connected: false,
    openwebrx_connected: false,
    fft_buffer_size: 0,
    config: null
});

// Scan profiles configuration
export const scanProfiles = writable({
    vhf: {
        name: 'VHF Amateur',
        start_freq: 144000000,
        end_freq: 148000000,
        step: 100000
    },
    uhf: {
        name: 'UHF Amateur',
        start_freq: 420000000,
        end_freq: 450000000,
        step: 100000
    },
    ism: {
        name: 'ISM Band',
        start_freq: 2400000000,
        end_freq: 2500000000,
        step: 1000000
    }
});

// WebSocket connection for spectrum data
let spectrumWS = null;

export function initializeSpectrumWebSocket() {
    if (spectrumWS) {
        return spectrumWS;
    }

    spectrumWS = createWebSocket('/spectrum', {
        useSocketIO: true,
        socketIOOptions: {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        }
    });

    // Register event handlers
    spectrumWS.on('fft_data', handleFFTData);
    spectrumWS.on('status', handleStatusUpdate);
    spectrumWS.on('signal_detected', handleSignalDetection);
    spectrumWS.on('scan_complete', handleScanComplete);

    // Connect
    spectrumWS.connect().catch(error => {
        console.error('Failed to connect to spectrum WebSocket:', error);
    });

    return spectrumWS;
}

function handleFFTData(data) {
    fftData.set(data.data || []);
    centerFrequency.set(data.center_freq);
    sampleRate.set(data.samp_rate);
    
    // Update data mode based on source
    if (data.source === 'openwebrx') {
        dataMode.set('real');
    }
}

function handleStatusUpdate(status) {
    hackrfStatus.set(status);
    
    // Update data mode
    if (status.real_data) {
        dataMode.set('real');
    } else {
        dataMode.set('demo');
    }
}

function handleSignalDetection(signal) {
    signalDetections.update(signals => {
        const updated = new Map(signals);
        updated.set(signal.id, {
            ...signal,
            timestamp: Date.now(),
            frequency_mhz: signal.frequency,
            frequency_hz: signal.frequency * 1e6
        });
        return updated;
    });

    // Add to history
    signalHistory.update(history => {
        const updated = [...history, {
            ...signal,
            detected_at: new Date().toISOString()
        }];
        // Keep last 100 detections
        return updated.slice(-100);
    });
}

function handleScanComplete(result) {
    isScanning.set(false);
    
    // Process scan results
    if (result.signals && Array.isArray(result.signals)) {
        const detections = new Map();
        result.signals.forEach((signal, index) => {
            detections.set(`scan_${index}`, {
                ...signal,
                id: `scan_${index}`,
                timestamp: Date.now()
            });
        });
        signalDetections.set(detections);
    }
}

// Actions
export async function startScan(profile = null) {
    if (get(isScanning)) return;
    
    isScanning.set(true);
    if (profile) {
        scanProfile.set(profile);
    }
    
    try {
        const response = await fetch(`/api/scan/${profile || get(scanProfile)}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`Scan failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        handleScanComplete(result);
        return result;
    } catch (error) {
        console.error('Scan error:', error);
        isScanning.set(false);
        throw error;
    }
}

export async function stopScan() {
    isScanning.set(false);
    
    try {
        await fetch('/api/scan/stop', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to stop scan:', error);
    }
}

export async function tuneToFrequency(freq_hz) {
    try {
        const response = await fetch('/api/tune', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ frequency: freq_hz })
        });
        
        if (!response.ok) {
            throw new Error(`Tune failed: ${response.statusText}`);
        }
        
        centerFrequency.set(freq_hz);
    } catch (error) {
        console.error('Failed to tune frequency:', error);
        throw error;
    }
}

// Derived stores
export const frequencyMHz = derived(
    centerFrequency,
    $freq => ($freq / 1e6).toFixed(3)
);

export const sampleRateMHz = derived(
    sampleRate,
    $rate => ($rate / 1e6).toFixed(3)
);

export const activeSignals = derived(
    signalDetections,
    $signals => {
        const now = Date.now();
        const active = [];
        
        $signals.forEach(signal => {
            // Consider signals active if detected within last 30 seconds
            if (now - signal.timestamp < 30000) {
                active.push(signal);
            }
        });
        
        // Sort by signal strength
        return active.sort((a, b) => b.strength - a.strength);
    }
);

export const signalCount = derived(
    activeSignals,
    $signals => $signals.length
);

// Spectrum data processing
export const processedFFT = derived(
    [fftData, centerFrequency, sampleRate],
    ([$fft, $center, $rate]) => {
        if (!$fft || $fft.length === 0) {
            return { frequencies: [], powers: [] };
        }
        
        const numBins = $fft.length;
        const frequencies = [];
        const powers = [];
        
        for (let i = 0; i < numBins; i++) {
            const freq = $center - ($rate / 2) + (i * $rate / numBins);
            frequencies.push(freq / 1e6); // Convert to MHz
            powers.push($fft[i]);
        }
        
        return { frequencies, powers };
    }
);

// Cleanup function
export function cleanupSpectrumWebSocket() {
    if (spectrumWS) {
        spectrumWS.disconnect();
        spectrumWS = null;
    }
}