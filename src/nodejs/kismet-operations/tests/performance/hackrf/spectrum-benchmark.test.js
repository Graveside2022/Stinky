const SpectrumAnalyzer = require('../../../lib/spectrumCore');
const { performance } = require('perf_hooks');

describe('Spectrum Analyzer Performance Benchmarks', () => {
  let analyzer;
  const BENCHMARK_ITERATIONS = 1000;
  const FFT_SIZE = 4096;
  const SIGNAL_COUNT = 50;

  beforeEach(() => {
    analyzer = new SpectrumAnalyzer({
      fft_size: FFT_SIZE,
      center_freq: 145000000,
      samp_rate: 10000000,
      signal_threshold: -70
    });
  });

  afterEach(() => {
    if (analyzer) {
      analyzer.disconnect();
    }
  });

  describe('FFT Data Processing Performance', () => {
    it('should parse FFT data within performance threshold', () => {
      const buffer = Buffer.alloc(FFT_SIZE * 4);
      
      // Fill with realistic FFT data
      for (let i = 0; i < FFT_SIZE; i++) {
        const value = Math.random() * 0.001 + 0.0001; // -60 to -80 dB range
        buffer.writeFloatLE(value, i * 4);
      }
      
      const startTime = performance.now();
      
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        analyzer.parseFFTData(buffer);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / BENCHMARK_ITERATIONS;
      
      console.log(`FFT Parsing Performance (${FFT_SIZE} bins):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time: ${avgTime.toFixed(3)}ms`);
      console.log(`  Throughput: ${(BENCHMARK_ITERATIONS / (totalTime / 1000)).toFixed(0)} FFTs/second`);
      
      // Performance assertion - should process within 1ms on average
      expect(avgTime).toBeLessThan(1);
    });

    it('should handle various FFT sizes efficiently', () => {
      const sizes = [256, 512, 1024, 2048, 4096, 8192];
      const results = [];
      
      sizes.forEach(size => {
        const buffer = Buffer.alloc(size * 4);
        for (let i = 0; i < size; i++) {
          buffer.writeFloatLE(Math.random() * 0.001, i * 4);
        }
        
        const startTime = performance.now();
        
        for (let i = 0; i < 100; i++) {
          analyzer.parseFFTData(buffer);
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / 100;
        
        results.push({
          size,
          avgTime,
          throughput: 1000 / avgTime
        });
      });
      
      console.log('\nFFT Size vs Performance:');
      results.forEach(r => {
        console.log(`  ${r.size} bins: ${r.avgTime.toFixed(3)}ms (${r.throughput.toFixed(0)} FFTs/s)`);
      });
      
      // Verify linear scaling
      const scalingFactor = results[results.length - 1].avgTime / results[0].avgTime;
      const sizeFactor = sizes[sizes.length - 1] / sizes[0];
      
      // Should scale roughly linearly with size
      expect(scalingFactor).toBeLessThan(sizeFactor * 1.5);
    });
  });

  describe('Signal Detection Performance', () => {
    beforeEach(() => {
      // Create complex FFT data with multiple signals
      const fftData = {
        timestamp: Date.now(),
        data: new Array(FFT_SIZE).fill(-90),
        center_freq: 145000000,
        samp_rate: 10000000
      };
      
      // Add random signals
      for (let i = 0; i < SIGNAL_COUNT; i++) {
        const bin = Math.floor(Math.random() * (FFT_SIZE - 10)) + 5;
        const power = -65 + Math.random() * 20; // -65 to -45 dB
        
        // Create signal with bandwidth
        for (let j = -2; j <= 2; j++) {
          fftData.data[bin + j] = power - Math.abs(j) * 3;
        }
      }
      
      analyzer.fft_buffer = [fftData];
    });

    it('should detect signals within performance threshold', () => {
      const startTime = performance.now();
      let totalSignals = 0;
      
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        const signals = analyzer.detectSignals();
        totalSignals += signals.length;
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / BENCHMARK_ITERATIONS;
      
      console.log(`\nSignal Detection Performance (${FFT_SIZE} bins, ~${SIGNAL_COUNT} signals):`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time: ${avgTime.toFixed(3)}ms`);
      console.log(`  Average signals detected: ${(totalSignals / BENCHMARK_ITERATIONS).toFixed(1)}`);
      console.log(`  Detection rate: ${(BENCHMARK_ITERATIONS / (totalTime / 1000)).toFixed(0)} detections/second`);
      
      // Should detect signals within 2ms for 4096 bins
      expect(avgTime).toBeLessThan(2);
    });

    it('should scale with threshold changes', () => {
      const thresholds = [-90, -80, -70, -60, -50];
      const results = [];
      
      thresholds.forEach(threshold => {
        const startTime = performance.now();
        let signalCount = 0;
        
        for (let i = 0; i < 100; i++) {
          const signals = analyzer.detectSignals(threshold);
          signalCount += signals.length;
        }
        
        const endTime = performance.now();
        const avgTime = (endTime - startTime) / 100;
        
        results.push({
          threshold,
          avgTime,
          avgSignals: signalCount / 100
        });
      });
      
      console.log('\nThreshold vs Performance:');
      results.forEach(r => {
        console.log(`  ${r.threshold}dB: ${r.avgTime.toFixed(3)}ms, ${r.avgSignals.toFixed(1)} signals`);
      });
      
      // Higher thresholds should be faster (fewer signals to process)
      expect(results[0].avgTime).toBeGreaterThan(results[results.length - 1].avgTime);
    });
  });

  describe('Buffer Management Performance', () => {
    it('should handle buffer cleanup efficiently', () => {
      // Fill buffer to maximum
      for (let i = 0; i < analyzer.maxBufferSize; i++) {
        analyzer.fft_buffer.push({
          timestamp: Date.now(),
          data: new Array(1024).fill(-90)
        });
      }
      
      const startTime = performance.now();
      
      // Add more data to trigger cleanup
      for (let i = 0; i < 1000; i++) {
        analyzer.fft_buffer.push({
          timestamp: Date.now() + i,
          data: new Array(1024).fill(-90)
        });
        
        // Manual cleanup trigger
        if (analyzer.fft_buffer.length > analyzer.maxBufferSize) {
          analyzer.fft_buffer = analyzer.fft_buffer.slice(-analyzer.bufferCleanupThreshold);
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`\nBuffer Cleanup Performance:`);
      console.log(`  1000 additions with cleanup: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time per operation: ${(totalTime / 1000).toFixed(3)}ms`);
      
      // Should handle buffer operations quickly
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('WebSocket Message Processing', () => {
    it('should process messages at high rate', () => {
      const iterations = 10000;
      const buffer = Buffer.alloc(1024 * 4);
      
      // Fill with test data
      for (let i = 0; i < 1024; i++) {
        buffer.writeFloatLE(Math.random() * 0.001, i * 4);
      }
      
      // Mock minimal WebSocket behavior
      analyzer.isConnected = true;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        analyzer.handleWebSocketMessage(buffer);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const msgPerSecond = iterations / (totalTime / 1000);
      
      console.log(`\nWebSocket Message Processing:`);
      console.log(`  Processed ${iterations} messages in ${totalTime.toFixed(2)}ms`);
      console.log(`  Rate: ${msgPerSecond.toFixed(0)} messages/second`);
      console.log(`  Average processing time: ${(totalTime / iterations).toFixed(3)}ms`);
      
      // Should handle at least 1000 messages per second
      expect(msgPerSecond).toBeGreaterThan(1000);
    });
  });

  describe('Memory Usage', () => {
    it('should maintain stable memory usage during continuous operation', () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate 1 minute of continuous operation
      const duration = 10000; // 10 seconds for test
      const messageRate = 100; // messages per second
      const interval = 1000 / messageRate;
      let messageCount = 0;
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < duration) {
        const buffer = Buffer.alloc(1024 * 4);
        for (let i = 0; i < 1024; i++) {
          buffer.writeFloatLE(Math.random() * 0.001, i * 4);
        }
        
        analyzer.handleWebSocketMessage(buffer);
        messageCount++;
        
        // Simulate time between messages
        const now = Date.now();
        while (Date.now() - now < interval) {
          // Busy wait
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryGrowth = {
        heapUsed: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
        external: (finalMemory.external - initialMemory.external) / 1024 / 1024,
        arrayBuffers: (finalMemory.arrayBuffers - initialMemory.arrayBuffers) / 1024 / 1024
      };
      
      console.log(`\nMemory Usage (${duration/1000}s operation, ${messageCount} messages):`);
      console.log(`  Heap growth: ${memoryGrowth.heapUsed.toFixed(2)} MB`);
      console.log(`  External growth: ${memoryGrowth.external.toFixed(2)} MB`);
      console.log(`  ArrayBuffer growth: ${memoryGrowth.arrayBuffers.toFixed(2)} MB`);
      console.log(`  Buffer size: ${analyzer.fft_buffer.length}`);
      
      // Memory growth should be minimal due to buffer management
      expect(memoryGrowth.heapUsed).toBeLessThan(50); // Less than 50MB growth
      expect(analyzer.fft_buffer.length).toBeLessThanOrEqual(analyzer.bufferCleanupThreshold);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent signal detection and buffer updates', async () => {
      const operationCount = 1000;
      const startTime = performance.now();
      
      const operations = [];
      
      // Simulate concurrent operations
      for (let i = 0; i < operationCount; i++) {
        // Alternate between different operations
        if (i % 3 === 0) {
          operations.push(Promise.resolve(analyzer.detectSignals()));
        } else if (i % 3 === 1) {
          const buffer = Buffer.alloc(256 * 4);
          for (let j = 0; j < 256; j++) {
            buffer.writeFloatLE(Math.random() * 0.001, j * 4);
          }
          operations.push(Promise.resolve(analyzer.parseFFTData(buffer)));
        } else {
          operations.push(Promise.resolve(analyzer.getStatus()));
        }
      }
      
      await Promise.all(operations);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      console.log(`\nConcurrent Operations Performance:`);
      console.log(`  ${operationCount} operations in ${totalTime.toFixed(2)}ms`);
      console.log(`  Operations per second: ${(operationCount / (totalTime / 1000)).toFixed(0)}`);
      
      // Should complete all operations efficiently
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Raspberry Pi Optimization', () => {
    it('should perform within Raspberry Pi constraints', () => {
      // Simulate Raspberry Pi typical workload
      const piWorkload = {
        fftSize: 1024,
        messageRate: 30, // 30 Hz update rate
        duration: 1000 // 1 second test
      };
      
      analyzer.updateConfig({ fft_size: piWorkload.fftSize });
      
      const buffer = Buffer.alloc(piWorkload.fftSize * 4);
      for (let i = 0; i < piWorkload.fftSize; i++) {
        buffer.writeFloatLE(Math.random() * 0.001, i * 4);
      }
      
      const startTime = performance.now();
      let processedCount = 0;
      
      // Process messages for duration
      const messageInterval = 1000 / piWorkload.messageRate;
      while (performance.now() - startTime < piWorkload.duration) {
        analyzer.handleWebSocketMessage(buffer);
        analyzer.detectSignals();
        processedCount++;
      }
      
      const actualDuration = performance.now() - startTime;
      const actualRate = processedCount / (actualDuration / 1000);
      
      console.log(`\nRaspberry Pi Performance Test:`);
      console.log(`  Target rate: ${piWorkload.messageRate} Hz`);
      console.log(`  Actual rate: ${actualRate.toFixed(1)} Hz`);
      console.log(`  CPU efficiency: ${(piWorkload.messageRate / actualRate * 100).toFixed(1)}%`);
      
      // Should maintain target rate
      expect(actualRate).toBeGreaterThanOrEqual(piWorkload.messageRate * 0.9);
    });
  });
});