/**
 * Test script for HackRF Control Interface
 * Verifies that all controls are working properly
 */

const io = require('socket.io-client');

async function testHackRFControls() {
    console.log('Starting HackRF Control Interface test...\n');
    
    // Connect to the HackRF namespace
    const socket = io('http://localhost:8003/hackrf', {
        reconnection: true,
        reconnectionDelay: 1000
    });
    
    return new Promise((resolve, reject) => {
        let testsPassed = 0;
        let testsFailed = 0;
        
        socket.on('connect', () => {
            console.log('✅ Connected to HackRF namespace');
            testsPassed++;
            
            // Test 1: Request current configuration
            console.log('\nTest 1: Requesting current configuration...');
            socket.emit('get_config');
        });
        
        socket.on('config_update', (config) => {
            console.log('✅ Received configuration update:', JSON.stringify(config, null, 2));
            testsPassed++;
            
            // Test 2: Change frequency
            console.log('\nTest 2: Setting frequency to 146.5 MHz...');
            socket.emit('set_frequency', { frequency: 146500000 });
        });
        
        socket.on('device_status', (status) => {
            console.log('✅ Received device status:', JSON.stringify(status, null, 2));
            testsPassed++;
        });
        
        // Listen for frequency change confirmation
        let frequencyChanged = false;
        socket.on('config_update', (config) => {
            if (!frequencyChanged && config.center_freq === 146500000) {
                console.log('✅ Frequency changed successfully');
                testsPassed++;
                frequencyChanged = true;
                
                // Test 3: Change gain settings
                console.log('\nTest 3: Setting gain values...');
                socket.emit('set_gain', { vga: 40, lna: 30, amp: 0 });
            }
        });
        
        // Listen for gain change
        let gainChanged = false;
        socket.on('config_update', (config) => {
            if (!gainChanged && config.gain) {
                console.log('✅ Gain settings updated:', config.gain);
                testsPassed++;
                gainChanged = true;
                
                // Test 4: Request auto gain
                console.log('\nTest 4: Requesting auto gain optimization...');
                socket.emit('auto_gain', { center_freq: 146500000, bandwidth: 2400000 });
            }
        });
        
        socket.on('gain_optimized', (gains) => {
            console.log('✅ Auto gain optimization received:', gains);
            testsPassed++;
            
            // Test 5: Change scan mode
            console.log('\nTest 5: Setting scan mode to sweep...');
            socket.emit('set_scan_mode', { mode: 'sweep' });
        });
        
        socket.on('scan_mode_changed', (data) => {
            console.log('✅ Scan mode changed:', data);
            testsPassed++;
            
            // Test 6: Start recording
            console.log('\nTest 6: Starting recording...');
            socket.emit('start_recording', { 
                format: 'iq', 
                includeWaterfall: true,
                includeMetadata: true 
            });
        });
        
        socket.on('recording_status', (status) => {
            console.log('✅ Recording status update:', status);
            testsPassed++;
            
            if (status.recording && !status.paused && !status.endTime) {
                // Test 7: Pause recording
                setTimeout(() => {
                    console.log('\nTest 7: Pausing recording...');
                    socket.emit('pause_recording');
                }, 1000);
            } else if (status.paused) {
                // Test 8: Stop recording
                setTimeout(() => {
                    console.log('\nTest 8: Stopping recording...');
                    socket.emit('stop_recording');
                }, 1000);
            } else if (status.endTime) {
                // Test 9: Update advanced settings
                console.log('\nTest 9: Updating advanced settings...');
                socket.emit('update_advanced_settings', {
                    samp_rate: 5000000,
                    fft_size: 2048,
                    window_function: 'hamming',
                    averaging: 5,
                    bias_tee: false
                });
            }
        });
        
        // Listen for advanced settings update
        let advancedUpdated = false;
        socket.on('config_update', (config) => {
            if (!advancedUpdated && config.samp_rate === 5000000) {
                console.log('✅ Advanced settings updated successfully');
                testsPassed++;
                advancedUpdated = true;
                
                // Test 10: Listen for FFT data
                console.log('\nTest 10: Waiting for FFT data (5 seconds)...');
                let fftReceived = false;
                
                socket.on('fftData', (data) => {
                    if (!fftReceived) {
                        console.log('✅ FFT data received:', {
                            dataLength: data.data ? data.data.length : 0,
                            centerFreq: data.center_freq,
                            sampleRate: data.samp_rate
                        });
                        testsPassed++;
                        fftReceived = true;
                    }
                });
                
                // Complete tests after 5 seconds
                setTimeout(() => {
                    console.log('\n========== TEST SUMMARY ==========');
                    console.log(`Tests Passed: ${testsPassed}`);
                    console.log(`Tests Failed: ${testsFailed}`);
                    console.log(`Total Tests: ${testsPassed + testsFailed}`);
                    console.log('==================================\n');
                    
                    socket.disconnect();
                    resolve({ passed: testsPassed, failed: testsFailed });
                }, 5000);
            }
        });
        
        socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
            testsFailed++;
            reject(error);
        });
        
        socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            testsFailed++;
        });
    });
}

// Run the test
if (require.main === module) {
    testHackRFControls()
        .then(results => {
            console.log('Test completed successfully');
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}

module.exports = testHackRFControls;