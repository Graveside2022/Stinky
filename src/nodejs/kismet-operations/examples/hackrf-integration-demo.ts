/**
 * HackRF Integration Demo
 * Example showing how to use the HackRF backend integration
 */

import { HackRFIntegration } from '../lib/hackrf';
import type { 
  HackRFFFTData, 
  HackRFSignal, 
  HackRFStatus,
  SignalDetection 
} from '../types';

async function main() {
  console.log('🚀 Starting HackRF Integration Demo\n');

  // Create integration instance
  const hackrf = new HackRFIntegration({
    backendUrl: 'http://localhost:8092',
    enableAutoReconnect: true,
    fftBufferSize: 100,
    signalHistorySize: 500,
    enableBinaryMode: true,
    // Optional GPS provider
    gpsProvider: async () => {
      // In real implementation, this would fetch from GPSD
      return { lat: 40.7128, lon: -74.0060 }; // NYC coordinates
    }
  });

  // Register event handlers
  hackrf.registerHandlers({
    onConnect: () => {
      console.log('✅ Connected to HackRF backend');
    },
    
    onDisconnect: (reason) => {
      console.log(`❌ Disconnected: ${reason}`);
    },
    
    onFFTData: (data) => {
      console.log(`📊 FFT Data: ${data.fft_size} bins @ ${data.frequency / 1e6} MHz`);
    },
    
    onSignalDetected: (signals) => {
      if (Array.isArray(signals)) {
        signals.forEach(signal => {
          console.log(`📡 Signal detected: ${signal.frequency / 1e6} MHz @ ${signal.signal_strength} dBm`);
        });
      }
    },
    
    onStatusUpdate: (status) => {
      console.log(`📋 Status: ${status.connected ? 'Connected' : 'Disconnected'}`);
    },
    
    onError: (error) => {
      console.error(`❗ Error: ${error.message}`);
    }
  });

  try {
    // Initialize connection
    console.log('Initializing HackRF integration...');
    await hackrf.initialize();

    // Get initial status
    const status = await hackrf.getStatus();
    console.log('\n📊 HackRF Status:');
    console.log(`  Connected: ${status.connected}`);
    console.log(`  Device: ${status.device_info?.serial || 'N/A'}`);
    console.log(`  Uptime: ${status.uptime}s`);

    // Get current configuration
    const config = await hackrf.getConfig();
    console.log('\n⚙️  Current Configuration:');
    console.log(`  Center Freq: ${config.center_freq / 1e6} MHz`);
    console.log(`  Sample Rate: ${config.sample_rate / 1e6} MS/s`);
    console.log(`  LNA Gain: ${config.gain.lna} dB`);
    console.log(`  VGA Gain: ${config.gain.vga} dB`);

    // Update configuration example
    console.log('\n🔧 Updating configuration...');
    const newConfig = await hackrf.updateConfig({
      center_freq: 145000000, // 145 MHz
      gain: {
        lna: 32,
        vga: 40
      }
    });
    console.log(`  New Center Freq: ${newConfig.center_freq / 1e6} MHz`);

    // Set up real-time monitoring
    let fftCount = 0;
    let signalCount = 0;

    hackrf.on('fft', (data) => {
      fftCount++;
      if (fftCount % 100 === 0) {
        console.log(`\n📈 Received ${fftCount} FFT frames`);
        
        // Process for display (example)
        const processed = hackrf.processSpectrumForDisplay(
          data as any, // Type assertion for demo
          256, // Target size
          true // Smoothing
        );
        
        console.log(`  Processed ${processed.powers.length} points`);
        console.log(`  Frequency range: ${processed.frequencies[0] / 1e6} - ${processed.frequencies[processed.frequencies.length - 1] / 1e6} MHz`);
      }
    });

    hackrf.on('signal', (signal: SignalDetection) => {
      signalCount++;
      console.log(`\n🎯 Signal #${signalCount}:`);
      console.log(`  Frequency: ${(signal.frequency || 0) / 1e6} MHz`);
      console.log(`  Strength: ${signal.signal_strength} dBm`);
      console.log(`  Location: ${signal.lat}, ${signal.lon}`);
      if (signal.metadata) {
        console.log(`  Bandwidth: ${signal.metadata.bandwidth} Hz`);
        console.log(`  SNR: ${signal.metadata.snr} dB`);
      }
    });

    // Example: Start frequency scan
    console.log('\n🔍 Starting frequency scan...');
    const scanId = await hackrf.startFrequencyScan(
      144000000, // 144 MHz
      148000000, // 148 MHz
      500000     // 500 kHz steps
    );
    console.log(`  Scan ID: ${scanId}`);

    // Monitor for 30 seconds
    console.log('\n⏱️  Monitoring for 30 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Get scan results
    try {
      const scanResults = await hackrf.getScanResults(scanId);
      console.log('\n📊 Scan Results:');
      console.log(`  Frequencies scanned: ${scanResults.frequencies.length}`);
      console.log(`  Signals detected: ${scanResults.detected_signals.length}`);
      
      // Show top 5 strongest signals
      const topSignals = scanResults.detected_signals
        .sort((a: HackRFSignal, b: HackRFSignal) => b.power - a.power)
        .slice(0, 5);
        
      console.log('\n🏆 Top 5 Strongest Signals:');
      topSignals.forEach((sig: HackRFSignal, i: number) => {
        console.log(`  ${i + 1}. ${sig.frequency / 1e6} MHz @ ${sig.power} dBm (BW: ${sig.bandwidth} Hz)`);
      });
    } catch (error) {
      console.log('  Scan still in progress or failed');
    }

    // Show statistics
    console.log('\n📊 Session Statistics:');
    console.log(`  FFT Frames: ${fftCount}`);
    console.log(`  Signals Detected: ${signalCount}`);
    console.log(`  FFT Buffer Size: ${hackrf.getFFTBuffer().length}`);
    console.log(`  Signal History: ${hackrf.getSignalHistory().length}`);

    // Example: Check metrics
    const metrics = await hackrf.apiClient.getMetrics();
    console.log('\n📈 Backend Metrics:');
    console.log(`  FFT Rate: ${metrics.fft_rate} Hz`);
    console.log(`  CPU Usage: ${metrics.cpu_usage}%`);
    console.log(`  Memory Usage: ${metrics.memory_usage}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean shutdown
    console.log('\n🛑 Shutting down...');
    await hackrf.shutdown();
    console.log('✅ Shutdown complete');
  }
}

// Advanced example: Custom signal processing
async function advancedProcessing() {
  const hackrf = new HackRFIntegration();
  
  // Custom FFT processing
  hackrf.on('rawFFT', (fftData: HackRFFFTData) => {
    // Access raw FFT data for custom processing
    const peakIndex = fftData.fft_data.reduce((maxIdx, val, idx, arr) => 
      val > arr[maxIdx] ? idx : maxIdx, 0);
    
    const peakFreq = fftData.center_freq + 
      (peakIndex - fftData.fft_size / 2) * (fftData.sample_rate / fftData.fft_size);
    
    console.log(`Peak at ${peakFreq / 1e6} MHz: ${fftData.fft_data[peakIndex]} dB`);
  });
  
  await hackrf.initialize();
  
  // Custom signal filtering
  hackrf.on('signalBatch', (signals: SignalDetection[]) => {
    // Filter signals by strength and frequency
    const strongSignals = signals.filter(sig => 
      sig.signal_strength > -60 && 
      sig.frequency && sig.frequency > 144e6 && sig.frequency < 148e6
    );
    
    if (strongSignals.length > 0) {
      console.log(`Found ${strongSignals.length} strong signals in 2m band`);
    }
  });
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}