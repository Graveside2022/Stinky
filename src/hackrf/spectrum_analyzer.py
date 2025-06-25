#!/usr/bin/env python3
"""
Spectrum Analyzer with Real OpenWebRX Integration
Real-time spectrum analysis using HackRF via OpenWebRX WebSocket
"""

import asyncio
import websockets
import json
import struct
import numpy as np
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import threading
import time
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
openwebrx_ws = None
fft_buffer = []
signal_threshold = -70  # dBm threshold for signal detection
openwebrx_config = {
    'fft_size': 0,
    'center_freq': 0,
    'samp_rate': 0,
    'fft_compression': 'none'
}

# Scan profiles for different frequency ranges
SCAN_PROFILES = {
    'vhf': {
        'name': 'VHF Amateur (144-148 MHz)',
        'ranges': [(144.0, 148.0)],
        'step': 25,  # kHz
        'description': 'VHF Amateur Radio Band'
    },
    'uhf': {
        'name': 'UHF Amateur (420-450 MHz)', 
        'ranges': [(420.0, 450.0)],
        'step': 25,
        'description': 'UHF Amateur Radio Band'
    },
    'ism': {
        'name': 'ISM Band (2.4 GHz)',
        'ranges': [(2400.0, 2485.0)],
        'step': 1000,  # MHz for ISM
        'description': 'Industrial, Scientific, Medical Band'
    }
}

class OpenWebRXConnector:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.config_received = False
        
    async def connect(self):
        """Connect to OpenWebRX WebSocket with proper handshake"""
        try:
            # Check if OpenWebRX is running
            response = requests.get('http://localhost:8073', timeout=5)
            logger.info('OpenWebRX detected, connecting to WebSocket...')
            
            # Connect to OpenWebRX WebSocket
            self.ws = await websockets.connect('ws://localhost:8073/ws/')
            self.connected = True
            logger.info('✅ Connected to OpenWebRX WebSocket')
            
            # Send handshake sequence
            await self.send_handshake()
            
            # Start message handler
            await self.handle_messages()
            
        except Exception as e:
            logger.error(f'❌ Could not connect to OpenWebRX: {e}')
            self.connected = False
    
    async def send_handshake(self):
        """Send proper OpenWebRX handshake sequence"""
        # Step 1: Client hello
        await self.ws.send("SERVER DE CLIENT client=spectrum_analyzer.py type=receiver")
        logger.info('📤 Sent client hello')
        
        # Step 2: Connection properties
        await asyncio.sleep(0.1)
        await self.ws.send(json.dumps({
            "type": "connectionproperties", 
            "params": {
                "output_rate": 12000,
                "hd_output_rate": 48000
            }
        }))
        logger.info('📤 Sent connection properties')
        
        # Step 3: Start DSP
        await asyncio.sleep(0.1)
        await self.ws.send(json.dumps({
            "type": "dspcontrol",
            "action": "start"
        }))
        logger.info('📤 Started DSP control')
        
        # Step 4: Configure for wideband scanning
        await asyncio.sleep(0.1)
        await self.ws.send(json.dumps({
            "type": "dspcontrol",
            "params": {
                "low_cut": -4000,
                "high_cut": 4000, 
                "offset_freq": 0,
                "mod": "nfm",
                "squelch_level": -150,
                "secondary_mod": False
            }
        }))
        logger.info('📤 Configured demodulator')
        logger.info('🎯 Handshake complete - waiting for FFT data...')
    
    async def handle_messages(self):
        """Handle incoming WebSocket messages"""
        async for message in self.ws:
            try:
                if isinstance(message, str):
                    # Text message (JSON config or handshake response)
                    await self.handle_text_message(message)
                else:
                    # Binary message (FFT data)
                    await self.handle_binary_message(message)
            except Exception as e:
                logger.error(f'❌ Error processing message: {e}')
    
    async def handle_text_message(self, message):
        """Handle text messages from OpenWebRX"""
        if message.startswith("CLIENT DE SERVER"):
            logger.info(f'🤝 Server handshake: {message}')
            return
            
        try:
            data = json.loads(message)
            if data.get('type') == 'config':
                config = data['value']
                openwebrx_config.update({
                    'fft_size': config.get('fft_size', 0),
                    'center_freq': config.get('center_freq', 0),
                    'samp_rate': config.get('samp_rate', 0),
                    'fft_compression': config.get('fft_compression', 'none')
                })
                
                logger.info('📡 OpenWebRX Config received:')
                logger.info(f'   - Center Freq: {openwebrx_config["center_freq"]/1e6:.3f} MHz')
                logger.info(f'   - Sample Rate: {openwebrx_config["samp_rate"]/1e6:.3f} MHz') 
                logger.info(f'   - FFT Size: {openwebrx_config["fft_size"]}')
                logger.info(f'   - FFT Compression: {openwebrx_config["fft_compression"]}')
                
                self.config_received = True
                
        except json.JSONDecodeError:
            pass  # Not JSON, ignore
    
    async def handle_binary_message(self, message):
        """Handle binary FFT data from OpenWebRX"""
        if len(message) < 1:
            return
            
        message_type = message[0]
        payload = message[1:]
        
        if message_type == 1:  # FFT waterfall data
            logger.info(f'🎯 FFT Data received: {len(payload)} bytes')
            fft_data = self.parse_fft_data(payload)
            
            if fft_data is not None and len(fft_data) > 0:
                fft_entry = {
                    'data': fft_data,
                    'timestamp': time.time(),
                    'center_freq': openwebrx_config['center_freq'],
                    'samp_rate': openwebrx_config['samp_rate']
                }
                
                fft_buffer.append(fft_entry)
                logger.info(f'✅ Real FFT processed: {len(fft_data)} bins, '
                           f'range: {fft_data[0]:.1f} to {fft_data[-1]:.1f} dB')
                
                # Keep only recent data
                if len(fft_buffer) > 5:
                    fft_buffer.pop(0)
                
                # Emit to frontend
                socketio.emit('fft_data', {
                    'data': fft_data[:500],  # Limit data for frontend
                    'center_freq': openwebrx_config['center_freq'],
                    'samp_rate': openwebrx_config['samp_rate'],
                    'timestamp': fft_entry['timestamp']
                })
    
    def parse_fft_data(self, payload):
        """Parse FFT data from OpenWebRX - handle various formats"""
        try:
            # Try different parsing approaches for OpenWebRX FFT data
            data_len = len(payload)
            logger.info(f'🔍 Parsing FFT payload: {data_len} bytes')
            
            # Method 1: Try as Float32 if divisible by 4
            if data_len % 4 == 0:
                try:
                    float_array = np.frombuffer(payload, dtype=np.float32)
                    if len(float_array) > 0:
                        logger.info(f'✅ Parsed as Float32: {len(float_array)} bins')
                        return float_array.tolist()
                except:
                    pass
            
            # Method 2: Try as 8-bit unsigned (common for waterfall)
            try:
                uint8_array = np.frombuffer(payload, dtype=np.uint8)
                # Convert to dB scale (rough approximation)
                db_array = (uint8_array.astype(np.float32) - 127) * 0.5 - 60
                logger.info(f'✅ Parsed as UInt8 to dB: {len(db_array)} bins')
                return db_array.tolist()
            except:
                pass
            
            # Method 3: Try as 16-bit integers
            if data_len % 2 == 0:
                try:
                    int16_array = np.frombuffer(payload, dtype=np.int16)
                    # Convert to dB scale
                    db_array = (int16_array.astype(np.float32) / 327.68) - 100
                    logger.info(f'✅ Parsed as Int16 to dB: {len(db_array)} bins')
                    return db_array.tolist()
                except:
                    pass
            
            logger.warning(f'⚠️ Could not parse FFT data: {data_len} bytes')
            return None
            
        except Exception as e:
            logger.error(f'❌ FFT parsing error: {e}')
            return None

# Global connector instance
connector = None

def start_openwebrx_connection():
    """Start OpenWebRX connection in background thread"""
    global connector
    
    async def run_connector():
        global connector
        connector = OpenWebRXConnector()
        await connector.connect()
    
    def thread_target():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(run_connector())
        except Exception as e:
            logger.error(f'Connection thread error: {e}')
        finally:
            loop.close()
    
    thread = threading.Thread(target=thread_target, daemon=True)
    thread.start()
    logger.info('🚀 Started OpenWebRX connection thread')

def find_signal_peaks(fft_data_obj, profile):
    """Find signal peaks in real FFT data"""
    signals = []
    
    if not fft_data_obj or 'data' not in fft_data_obj:
        return signals
    
    powers = fft_data_obj['data']
    center_freq = fft_data_obj['center_freq'] 
    samp_rate = fft_data_obj['samp_rate']
    
    if not powers or not center_freq or not samp_rate:
        return signals
    
    num_bins = len(powers)
    freq_bin_width = samp_rate / num_bins  # Hz per bin
    freq_start = center_freq - (samp_rate / 2)  # Start frequency
    
    logger.info(f'🔍 Peak detection: {num_bins} bins, {freq_bin_width/1000:.1f} kHz/bin')
    
    # Find peaks above threshold
    peak_count = 0
    for i in range(2, len(powers) - 2):
        current_power = powers[i]
        
        # Enhanced peak detection
        if (current_power > powers[i-1] and 
            current_power > powers[i+1] and
            current_power > signal_threshold and
            current_power > powers[i-2] and 
            current_power > powers[i+2]):
            
            # Calculate actual frequency
            frequency = (freq_start + (i * freq_bin_width)) / 1e6  # MHz
            
            # Check if in profile range
            in_range = any(start <= frequency <= end for start, end in profile['ranges'])
            
            if in_range:
                bandwidth = estimate_bandwidth(powers, i, freq_bin_width)
                confidence = min(0.5 + max(0, current_power - signal_threshold) / 40, 1.0)
                
                signals.append({
                    'frequency': frequency,
                    'power': current_power,
                    'bandwidth': bandwidth / 1000,  # kHz
                    'confidence': confidence
                })
                
                peak_count += 1
                if peak_count <= 3:  # Log first few peaks
                    logger.info(f'📡 Peak {peak_count}: {frequency:.3f} MHz, '
                               f'{current_power:.1f} dB, {bandwidth/1000:.1f} kHz')
    
    logger.info(f'🎯 Found {len(signals)} signal peaks for {profile["name"]}')
    return signals

def estimate_bandwidth(powers, peak_index, freq_bin_width):
    """Estimate signal bandwidth around peak"""
    peak_power = powers[peak_index]
    threshold = peak_power - 3  # -3dB point
    
    # Find left edge
    left_edge = peak_index
    for i in range(peak_index - 1, -1, -1):
        if powers[i] < threshold:
            break
        left_edge = i
    
    # Find right edge
    right_edge = peak_index  
    for i in range(peak_index + 1, len(powers)):
        if powers[i] < threshold:
            break
        right_edge = i
    
    # Calculate bandwidth in Hz
    bandwidth_bins = right_edge - left_edge + 1
    return bandwidth_bins * freq_bin_width

# Flask routes
@app.route('/')
def index():
    return render_template('spectrum.html')

@app.route('/api/status')
def api_status():
    """Get system status"""
    has_real_data = len(fft_buffer) > 0 and connector and connector.connected
    
    return jsonify({
        'openwebrx_connected': connector.connected if connector else False,
        'real_data': has_real_data,
        'fft_buffer_size': len(fft_buffer),
        'config': openwebrx_config,
        'last_fft_time': fft_buffer[-1]['timestamp'] if fft_buffer else None,
        'mode': 'REAL DATA MODE' if has_real_data else 'DEMO MODE'
    })

@app.route('/api/scan/<profile_id>')
def api_scan(profile_id):
    """Scan for signals using specified profile"""
    if profile_id not in SCAN_PROFILES:
        return jsonify({'error': 'Invalid profile'}), 400
    
    profile = SCAN_PROFILES[profile_id]
    signals = []
    
    if fft_buffer:
        # Use real FFT data
        latest_fft = fft_buffer[-1]
        detected_signals = find_signal_peaks(latest_fft, profile)
        
        for signal in detected_signals:
            signals.append({
                'id': f'real-{int(time.time())}-{np.random.randint(1000)}',
                'frequency': f'{signal["frequency"]:.3f}',
                'strength': f'{signal["power"]:.1f}',
                'bandwidth': f'{signal["bandwidth"]:.1f}',
                'confidence': signal['confidence'],
                'type': 'unknown'
            })
        
        logger.info(f'🎯 REAL signal scan: Found {len(signals)} signals from HackRF data')
    else:
        # Demo mode - generate fake signals
        logger.info('❌ No real FFT data, using demo mode')
        for freq_range in profile['ranges']:
            start, end = freq_range
            for freq in np.arange(start, end, profile['step'] / 1000):
                if np.random.random() < 0.3:  # 30% chance of signal
                    signals.append({
                        'id': f'demo-{int(time.time())}-{np.random.randint(1000)}',
                        'frequency': f'{freq:.3f}',
                        'strength': f'{np.random.uniform(-80, -40):.1f}',
                        'bandwidth': f'{np.random.uniform(5, 25):.1f}',
                        'confidence': np.random.uniform(0.3, 0.9),
                        'type': 'demo'
                    })
    
    # Sort by strength
    signals.sort(key=lambda x: float(x['strength']), reverse=True)
    
    return jsonify({
        'profile': profile,
        'signals': signals,
        'scan_time': time.time(),
        'real_data': len(fft_buffer) > 0
    })

@app.route('/api/profiles')
def api_profiles():
    """Get available scan profiles"""
    return jsonify(SCAN_PROFILES)

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    logger.info('Client connected to spectrum analyzer')
    emit('status', {
        'connected': True,
        'openwebrx_status': connector.connected if connector else False
    })

if __name__ == '__main__':
    logger.info('🚀 Starting Spectrum Analyzer with Real OpenWebRX Integration')
    
    # Start OpenWebRX connection
    start_openwebrx_connection()
    
    # Wait a moment for connection
    time.sleep(2)
    
    # Start Flask server
    logger.info('🌐 Starting web server on http://localhost:8092')
    socketio.run(app, host='0.0.0.0', port=8092, debug=False, allow_unsafe_werkzeug=True)