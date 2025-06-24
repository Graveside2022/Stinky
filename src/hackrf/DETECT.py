import subprocess
import numpy as np
import threading
import socket
import time
import os
import sys
import shutil
import logging
import json
import struct
from collections import deque
from datetime import datetime, timedelta
from flask import Flask, render_template_string, request, jsonify, send_file, abort, Response
from flask_socketio import SocketIO, emit
try:
    from PIL import Image
except ImportError:
    # If PIL is not installed, we'll handle the error gracefully
    Image = None
    logging.warning("PIL not available. Install with 'pip install pillow' for waterfall display")
# Socket setup specific to ATAK multicast
import uuid  # For generating unique UIDs
import xml.etree.ElementTree as ET
from xml.dom import minidom
import math

# === LOGGING ===
logging.basicConfig(level=logging.DEBUG, format='[%(asctime)s] %(levelname)s: %(message)s')

# === FLASK SETUP ===
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

CONFIG_PATH = "config.json"

# === GLOBAL VARIABLES ===
# SDR setup
center_freq = 915000000  # Center frequency in Hz (915 MHz)
sample_rate = 12000000    # Sample rate in Hz (NOW 12 MHz, was 6 MHz)
DISPLAY_FFT_SIZE = 8192  # Number of FFT points for display

# Monitoring status
running = False
latest_status = {
    "running": False,
    "rssi": -100,
    "lat": 39.7392,  # Default latitude
    "lon": -104.9903, # Default longitude
    "gps_message": "Initializing GPS...", # Initial GPS status message
    "last_update": datetime.now().isoformat()
}

# Monitoring configuration
monitor_config = {
    "frequency": center_freq,
    "sample_rate": sample_rate,
    "threshold": -60,
    "lna_gain": 40,  # Increased from 24 to maximum LNA gain
    "vga_gain": 62,  # Increased from 36 to maximum VGA gain
    "dest_ip": "239.2.3.1",
    "dest_port": 18999,
    "capture_size": 2**22,  # Increased from 2**20
    "running": False        # Add running state
}

# For FFT/waterfall
waterfall_history = deque(maxlen=256)  # Store waterfall history (Increased from 60 to 256)

# Add a global variable to store the latest FFT data
latest_fft_data = {
    "freq": [],
    "power": [],
    "timestamp": 0
}

# Add these global variables at the top with other globals
peak_hold = np.zeros(DISPLAY_FFT_SIZE)  # For peak hold functionality
peak_hold_time = 2.0  # Peak hold time in seconds
last_peak_reset = time.time()

# Helper function for smoothing
def smooth(y, box_pts):
    box = np.ones(box_pts) / box_pts
    y_smooth = np.convolve(y, box, mode='same')
    return y_smooth

# === HTML TEMPLATE ===
html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <title>HackRF CoT Monitor</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #222;
            color: #fff;
        }}
        .container {{
            display: flex;
            flex-direction: column;
            max-width: 1200px;
            margin: 0 auto;
        }}
        .display-box {{
            background-color: #333;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
        }}
        #spectrum {{
            height: 400px;
            width: 100%;
        }}
        #waterfall-container {{
            width: 100%;
            height: 200px;
            overflow: hidden;
            position: relative;
        }}
        #waterfall {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}
        h2 {{
            margin-top: 0;
            color: #4CAF50;
        }}
        .controls {{
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }}
        .status {{
            font-size: 14px;
            color: #ccc;
        }}
        .form-group {{
            margin-bottom: 15px;
        }}
        .form-control {{
            background-color: #444;
            border: none;
            border-radius: 4px;
            color: #fff;
            padding: 8px 12px;
            width: 100%;
        }}
        label {{
            display: block;
            margin-bottom: 5px;
            color: #aaa;
        }}
        .btn {{
            background-color: #4CAF50;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            padding: 8px 16px;
            transition: background-color 0.3s;
        }}
        .btn:hover {{
            background-color: #45a049;
        }}
        .btn-primary {{
            background-color: #2196F3;
        }}
        .btn-primary:hover {{
            background-color: #0b7dda;
        }}
        .btn-warning {{
            background-color: #ff9800;
        }}
        .btn-warning:hover {{
            background-color: #e68a00;
        }}
        .btn-danger {{
            background-color: #f44336;
        }}
        .btn-danger:hover {{
            background-color: #da190b;
        }}
        .btn-info {{
            background-color: #00bcd4;
        }}
        .btn-info:hover {{
            background-color: #008fa1;
        }}
        .status-panel {{
            display: flex;
            justify-content: space-between;
        }}
        .status-item {{
            display: flex;
            align-items: center;
        }}
        .status-indicator {{
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }}
        .status-on {{
            background-color: #4CAF50;
        }}
        .status-off {{
            background-color: #f44336;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>HackRF CoT Monitor</h1>
        
        <div class="display-box">
            <h2>Settings</h2>
            <div class="form-group">
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <label>Frequency (Hz)</label>
                        <input id="frequency" class="form-control" value="{monitor_config['frequency']}">
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label>RSSI Threshold (dBFS)</label>
                        <input id="threshold" class="form-control" value="{monitor_config['threshold']}">
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label>CoT Destination IP</label>
                        <input id="dest_ip" class="form-control" value="{monitor_config['dest_ip']}">
                        <small style="color: #888;">Use 239.2.3.1 for multicast</small>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label>Port</label>
                        <input id="dest_port" class="form-control" value="{monitor_config['dest_port']}">
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label>LNA Gain (0-40 dB, step 8)</label>
                        <input type="range" id="lna_gain" class="form-control" min="0" max="40" step="8" value="{monitor_config['lna_gain']}" oninput="document.getElementById('lna_gain_value').innerText = this.value">
                        <span id="lna_gain_value" style="color: #ccc; font-size: 12px;">{monitor_config['lna_gain']}</span> dB
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <label>VGA Gain (0-62 dB, step 2)</label>
                        <input type="range" id="vga_gain" class="form-control" min="0" max="62" step="2" value="{monitor_config['vga_gain']}" oninput="document.getElementById('vga_gain_value').innerText = this.value">
                        <span id="vga_gain_value" style="color: #ccc; font-size: 12px;">{monitor_config['vga_gain']}</span> dB
                    </div>
                </div>
            </div>
            
            <div class="controls">
                <button onclick="updateSettings()" class="btn btn-primary">Update Settings</button>
                <button onclick="toggleMonitor()" class="btn" id="toggleBtn">Start Monitoring</button>
                <button onclick="restartHackRF()" class="btn btn-warning">Restart HackRF</button>
                <button onclick="testCoT()" class="btn btn-info">Test CoT Messages</button>
            </div>
            
            <div class="status-panel" style="margin-top: 15px;">
                <div class="status-item">
                    <div class="status-indicator" id="monitorStatus"></div>
                    <span>Monitoring: <span id="monitorStatusText">OFF</span></span>
                </div>
                <div>
                    <strong>Last RSSI:</strong> <span id="rssi">{latest_status['rssi']}</span> dB |
                    <strong>GPS:</strong> <span id="gps">{latest_status['lat']}, {latest_status['lon']}</span>
                </div>
            </div>
        </div>
        
        <div class="display-box">
            <h2>Spectrum Display</h2>
            <div id="spectrum"></div>
            <div class="status" id="spectrumStatusText">Center Freq: {center_freq/1e6} MHz | Sample Rate: {sample_rate/1e6} MHz</div>
        </div>
        
        <div class="display-box">
            <h2>Waterfall Display</h2>
            <div id="waterfall-container">
                <img id="waterfall" src="waterfall.png?t=0" alt="Waterfall Display">
            </div>
        </div>
    </div>

    <script>
        // Initialize spectrum plot with empty data
        const spectrumDiv = document.getElementById('spectrum');
        const initialData = [{{
            x: Array.from(Array({DISPLAY_FFT_SIZE}).keys()).map(i => i * {sample_rate/DISPLAY_FFT_SIZE} / 1e6 + ({center_freq - sample_rate/2})/1e6),
            y: Array({DISPLAY_FFT_SIZE}).fill(-110),
            type: 'scatter',
            mode: 'lines',
            line: {{ color: 'lime', width: 2 }}
        }}];
        
        const layout = {{
            margin: {{ t: 10, r: 10, l: 50, b: 40 }},
            plot_bgcolor: '#2a2a2a',
            paper_bgcolor: '#333',
            xaxis: {{
                title: 'Frequency (MHz)',
                gridcolor: '#444',
                color: '#ddd'
            }},
            yaxis: {{
                title: 'Power (dB)',
                range: [-110, -30],
                gridcolor: '#444',
                color: '#ddd'
            }}
        }};
        
        Plotly.newPlot(spectrumDiv, initialData, layout, {{responsive: true}});
        
        // Update spectrum function
        function updateSpectrum() {{
            fetch('/fft')
                .then(response => response.json())
                .then(data => {{
                    if (data && data.freq && data.power && data.freq.length > 0 && data.power.length > 0) {{
                        // Use Plotly.react instead of update for more reliable rendering
                        const newData = [{{
                            x: data.freq,
                            y: data.power,
                            type: 'scatter',
                            mode: 'lines',
                            line: {{ color: 'lime', width: 2 }}
                        }}];
                        
                        Plotly.react(spectrumDiv, newData, layout, {{responsive: true}});
                    }}
                }})
                .catch(error => {{
                    console.error("Error rendering spectrum:", error);
                    // Don't update on error to avoid flickering
                }});
        }}
        
        // Waterfall update function with preloading and error handling
        function updateWaterfall() {{
            try {{
                const timestamp = new Date().getTime();
                const img = new Image();
                const waterfallImg = document.getElementById('waterfall');
                
                // Set a loading timeout
                let loadTimeout = setTimeout(() => {{
                    console.warn("Waterfall image load timeout");
                }}, 3000);
                
                img.onload = function() {{
                    clearTimeout(loadTimeout);
                    waterfallImg.src = this.src;
                }};
                
                img.onerror = function(e) {{
                    clearTimeout(loadTimeout);
                    console.error("Error loading waterfall image:", e);
                }};
                
                // Add cache-busting parameter
                img.src = 'waterfall.png?t=' + timestamp;
            }} catch (error) {{
                console.error("Error updating waterfall:", error);
            }}
        }}

        // Update settings function
        function updateSettings() {{
            const data = {{
                frequency: parseInt(document.getElementById('frequency').value),
                threshold: parseFloat(document.getElementById('threshold').value),
                dest_ip: document.getElementById('dest_ip').value,
                dest_port: parseInt(document.getElementById('dest_port').value),
                lna_gain: parseInt(document.getElementById('lna_gain').value),
                vga_gain: parseInt(document.getElementById('vga_gain').value)
            }};
            
            fetch('/api/update', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
                body: JSON.stringify(data)
            }})
            .then(response => response.json())
            .then(data => {{
                if (data.success) {{
                    alert("Settings updated successfully");
                    updateStatus(); // Immediately update status to reflect new settings
                }}
            }})
            .catch(err => {{
                console.error("Error updating settings:", err);
                alert("Error updating settings");
            }});
        }}
        
        // Toggle monitoring function
        function toggleMonitor() {{
            fetch('/api/toggle', {{ method: 'POST' }})
                .then(response => response.json())
                .then(data => {{
                    updateMonitoringStatus(data.running);
                }})
                .catch(err => {{
                    console.error("Error toggling monitoring:", err);
                }});
        }}
        
        // Update the monitoring status UI
        function updateMonitoringStatus(isRunning) {{
            const btn = document.getElementById('toggleBtn');
            const statusIndicator = document.getElementById('monitorStatus');
            const statusText = document.getElementById('monitorStatusText');
            
            if (isRunning) {{
                btn.innerText = 'Stop Monitoring';
                btn.className = 'btn btn-danger';
                statusIndicator.className = 'status-indicator status-on';
                statusText.innerText = 'ON';
            }} else {{
                btn.innerText = 'Start Monitoring';
                btn.className = 'btn btn-primary';
                statusIndicator.className = 'status-indicator status-off';
                statusText.innerText = 'OFF';
            }}
        }}
        
        // Restart HackRF function
        function restartHackRF() {{
            fetch('/api/restart', {{ method: 'POST' }})
                .then(res => res.text())
                .then(message => alert(message))
                .catch(err => {{
                    console.error("Error restarting HackRF:", err);
                    alert("Error restarting HackRF");
                }});
        }}
        
        // Test CoT function
        function testCoT() {{
            fetch('/api/test_cot', {{ method: 'POST' }})
                .then(res => res.json())
                .then(data => {{
                    if (data.success) {{
                        alert(data.message);
                    }} else {{
                        alert(data.error || "Error sending test CoT messages");
                    }}
                }})
                .catch(err => {{
                    console.error("Error testing CoT:", err);
                    alert("Error testing CoT messages");
                }});
        }}
        
        // Setup status update via fetch
        function updateStatus() {{
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {{
                    console.log("Status API response:", data); // Log the data received from /api/status
                    document.getElementById('rssi').innerText = data.rssi;
                    // Update GPS display with status message and coordinates
                    const gpsElement = document.getElementById('gps');
                    if (gpsElement) {{
                        let gpsText = data.gps_message || "GPS Status Unknown";
                        const lat = parseFloat(data.lat);
                        const lon = parseFloat(data.lon);

                        if (data.gps_message === "Fix Acquired" && !isNaN(lat) && !isNaN(lon)) {{
                            gpsText += `: \${{lat.toFixed(4)}}, \${{lon.toFixed(4)}}`;
                        }} else if (!isNaN(lat) && !isNaN(lon)) {{
                            gpsText += ` (Coords: \${{lat.toFixed(4)}}, \${{lon.toFixed(4)}})`;
                        }} else {{ 
                            gpsText += ` (Coords: N/A)`;
                        }}
                        gpsElement.innerText = gpsText;
                    }}
                    updateMonitoringStatus(data.running);

                    // Update LNA/VGA sliders and their value displays
                    if (typeof data.lna_gain !== 'undefined') {{
                        const lnaSlider = document.getElementById('lna_gain');
                        const lnaValueDisplay = document.getElementById('lna_gain_value');
                        if (lnaSlider) lnaSlider.value = data.lna_gain;
                        if (lnaValueDisplay) lnaValueDisplay.innerText = data.lna_gain;
                    }}
                    if (typeof data.vga_gain !== 'undefined') {{
                        const vgaSlider = document.getElementById('vga_gain');
                        const vgaValueDisplay = document.getElementById('vga_gain_value');
                        if (vgaSlider) vgaSlider.value = data.vga_gain;
                        if (vgaValueDisplay) vgaValueDisplay.innerText = data.vga_gain;
                    }}

                    // Update spectrum status text and Plotly layout title
                    if (data.center_freq && data.sample_rate) {{
                        const spectrumStatusElement = document.getElementById('spectrumStatusText');
                        if (spectrumStatusElement) {{
                            spectrumStatusElement.innerText = `Center Freq: \${{data.center_freq / 1e6}} MHz | Sample Rate: \${{data.sample_rate / 1e6}} MHz`;
                        }}
                        
                        // Update Plotly layout's x-axis title
                        // Ensure layout object is accessible and modifiable here
                        // For simplicity, assuming 'layout' is a global or accessible variable from where it's defined
                        if (typeof layout !== 'undefined' && layout.xaxis) {{
                            layout.xaxis.title = `Frequency (MHz) - Center: \${{data.center_freq / 1e6}} MHz`;
                            layout.xaxis.autorange = true; // Force x-axis autorange
                            Plotly.relayout(spectrumDiv, layout);
                        }}
                    }}
                }})
                .catch(error => console.error("Error updating status:", error));
        }}
        
        // Start the update cycles
        setTimeout(() => {{
            updateSpectrum();
            updateWaterfall();
            updateStatus();
            
            // Continue updates on interval
            setInterval(updateSpectrum, 1000);
            setInterval(updateWaterfall, 2000);
            setInterval(updateStatus, 2000);
        }}, 1000);
        
        // Initialize UI
        updateMonitoringStatus(false);
    </script>
</body>
</html>
"""

def load_config():
    global monitor_config
    try:
        with open(CONFIG_PATH, "r") as f:
            loaded_config = json.load(f)
            # Update config values, but keep 'running' set to False at startup
            for key in loaded_config:
                if key != 'running':  # Skip the 'running' setting to ensure it starts as False
                    monitor_config[key] = loaded_config[key]
    except FileNotFoundError:
        pass
    # Force running to False at startup regardless of saved state
    monitor_config["running"] = False

def save_config():
    with open(CONFIG_PATH, "w") as f:
        json.dump(monitor_config, f, indent=2)

load_config()

# === SIGNAL PROCESSING ===
# Setup socket for multicast
def setup_multicast_socket():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.2)
    ttl = struct.pack('b', 1)  # Time-to-live of 1 hop
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)
    return sock

# Global socket for CoT messages
cot_sock = setup_multicast_socket()

def calculate_rssi(iq_data, freq_bins=None, bin_center=None):
    """
    Calculate RSSI more accurately by focusing on the peak in the FFT or 
    the total signal power if no peak is specified.
    
    Args:
        iq_data: Complex IQ samples
        freq_bins: Optional frequency bins for the FFT
        bin_center: Optional center bin to focus RSSI calculation on
        
    Returns:
        rssi: Signal strength in dB
    """
    try:
        # If no specific frequency range is provided, calculate overall power
        if freq_bins is None or bin_center is None:
            # Calculate overall power of the signal
            power = np.mean(np.abs(iq_data)**2)
            rssi = 10 * np.log10(power)
            return rssi
        
        # Otherwise, calculate FFT and find power in the specified range
        max_samples = min(len(iq_data), 4096)
        iq_segment = iq_data[:max_samples]
        
        # Apply window
        window = np.hanning(len(iq_segment))
        windowed_iq = iq_segment * window
        
        # Calculate FFT
        fft_result = np.fft.fftshift(np.fft.fft(windowed_iq))
        power_db = 10 * np.log10(np.abs(fft_result)**2 / len(fft_result)**2 + 1e-10)
        
        # Find power in the region of interest
        bin_width = max(3, freq_bins // 100)  # At least 3 bins, or 1% of total bins
        start_bin = max(0, bin_center - bin_width)
        end_bin = min(len(power_db), bin_center + bin_width)
        
        # Find peak in the region
        region_power = power_db[start_bin:end_bin]
        if len(region_power) > 0:
            peak_power = np.max(region_power)
            return peak_power
        
        # Fallback to overall power if region is empty
        return 10 * np.log10(np.mean(np.abs(iq_data)**2))
        
    except Exception as e:
        logging.error(f"RSSI calculation error: {str(e)}")
        return -80  # Default fallback value

# Replace the simpler dbfs function with our new function
def dbfs(iq):
    return calculate_rssi(iq)

def calculate_fft(iq_data):
    """
    Calculate FFT from IQ data with proper signal processing.
    """
    try:
        global peak_hold, last_peak_reset
        
        # Use a reasonable segment size for processing
        max_samples = min(len(iq_data), 8192)
        iq_segment = iq_data[:max_samples]
        
        # Remove DC offset first
        iq_segment = iq_segment - np.mean(iq_segment)
        
        # Apply window function
        window = np.hanning(len(iq_segment))
        windowed_iq = iq_segment * window
        
        # Calculate FFT and shift zero frequency to center
        fft_result = np.fft.fftshift(np.fft.fft(windowed_iq))
        
        # Calculate power spectrum
        power_spectrum = np.abs(fft_result)**2
        
        # Normalize by window power and FFT size
        window_power = np.sum(window**2)
        power_spectrum = power_spectrum / (window_power * len(fft_result))
        
        # Convert to dB with proper reference level for 8-bit samples
        reference_level = 1.0 / (2**8)
        power_db = 10 * np.log10(power_spectrum / reference_level + 1e-10)
        
        # Calculate noise floor from the lower 10% of values
        sorted_power = np.sort(power_db)
        noise_floor = np.mean(sorted_power[:len(sorted_power)//10])
        
        # Set minimum noise floor to -90 dB
        noise_floor = max(noise_floor, -90)
        
        # Subtract noise floor
        power_db = power_db - noise_floor
        
        # Apply minimal smoothing to preserve signal detail
        power_db_smooth = smooth(power_db, 3)
        
        # Update peak hold
        current_time = time.time()
        if current_time - last_peak_reset > peak_hold_time:
            # Reset peak hold periodically
            peak_hold = np.full_like(power_db_smooth, -90)
            last_peak_reset = current_time
        
        # Update peak hold values
        peak_hold = np.maximum(peak_hold, power_db_smooth)
        
        # Mix current and peak hold values (95% current, 5% peak)
        power_db_smooth = 0.95 * power_db_smooth + 0.05 * peak_hold
        
        # Scale to display range
        power_db_smooth = np.clip(power_db_smooth, -90, -20)
        
        # Generate frequency array (in MHz)
        freq_step = sample_rate / len(iq_segment)
        freqs = np.arange(-len(iq_segment)//2, len(iq_segment)//2) * freq_step + center_freq
        freq_mhz = freqs / 1e6
        
        # Log the frequency range for debugging
        logging.debug(f"Frequency range: {freq_mhz[0]:.3f} MHz to {freq_mhz[-1]:.3f} MHz")
        logging.debug(f"Center frequency: {center_freq/1e6:.3f} MHz")
        
        return freq_mhz, power_db_smooth
    except Exception as e:
        logging.error(f"FFT calculation error: {str(e)}")
        # Return dummy data in case of error
        dummy_freq = np.linspace((center_freq - sample_rate/2) / 1e6, (center_freq + sample_rate/2) / 1e6, DISPLAY_FFT_SIZE)
        dummy_power = np.random.uniform(-80, -40, DISPLAY_FFT_SIZE)
        return dummy_freq, dummy_power

def update_waterfall(fft_data):
    """
    Create a waterfall display with proper signal scaling.
    """
    logging.debug(f"update_waterfall called. len(fft_data): {len(fft_data)}")
    try:
        if len(fft_data) == 0:
            logging.warning("Empty FFT data for waterfall, aborting waterfall update.")
            return
        
        # Clip values to display range
        clipped_data = np.clip(fft_data, -90, -20)
        logging.debug(f"Waterfall: clipped_data min/max: {np.min(clipped_data):.2f}/{np.max(clipped_data):.2f}")

        # Normalize to 0-255 range
        normalized = np.interp(clipped_data, [-90, -20], [0, 255]).astype(np.uint8)
        logging.debug(f"Waterfall: normalized min/max: {np.min(normalized)}/{np.max(normalized)}")
        
        # Add to waterfall history
        waterfall_history.append(normalized)
        logging.debug(f"Added to waterfall_history. History length: {len(waterfall_history)}")
        
        # Create the waterfall image
        if len(waterfall_history) > 1:
            waterfall_data = np.vstack(waterfall_history)
            logging.debug(f"Waterfall_data shape: {waterfall_data.shape}")
            
            if Image:
                try:
                    height, width = waterfall_data.shape
                    img = np.zeros((height, width, 3), dtype=np.uint8)
                    
                    # Simple colormap: Blue (low) -> Green -> Yellow -> Red (high)
                    xp = [0, 85, 170, 255]  # Input points
                    r_fp = [0,   0, 255, 255]  # Red channel
                    g_fp = [0, 255, 255,   0]  # Green channel
                    b_fp = [255, 255,   0,   0]  # Blue channel

                    img[:,:,0] = np.interp(waterfall_data, xp, r_fp).astype(np.uint8)
                    img[:,:,1] = np.interp(waterfall_data, xp, g_fp).astype(np.uint8)
                    img[:,:,2] = np.interp(waterfall_data, xp, b_fp).astype(np.uint8)
                    
                    pil_img = Image.fromarray(img)
                    pil_img.save('waterfall.png')
                    logging.info("Waterfall updated successfully with PIL.")
                except Exception as e:
                    logging.error(f"PIL waterfall generation error: {str(e)}")
            else:
                logging.warning("PIL not available. Attempting waterfall generation with Matplotlib.")
                try:
                    import matplotlib
                    matplotlib.use('Agg')
                    import matplotlib.pyplot as plt
                    
                    plt.figure(figsize=(8, 4))
                    plt.imshow(waterfall_data, aspect='auto', cmap='hot')
                    plt.axis('off')
                    plt.tight_layout(pad=0)
                    plt.savefig('waterfall.png', bbox_inches='tight', pad_inches=0, dpi=100)
                    plt.close()
                    logging.info("Waterfall updated successfully with Matplotlib.")
                except Exception as e:
                    logging.error(f"Matplotlib waterfall generation error: {str(e)}")
    except Exception as e:
        logging.error(f"General error in update_waterfall function: {str(e)}")

def generate_cot(lat, lon, rssi, peak_freq):
    """
    Generate CoT message for a simple dot on the map using b-m-p-s-m format.
    Using ARGB values for color:
    * -65536 is red
    * -23296 is orange
    * -256 is yellow
    * -16776961 is blue
    """
    # Use a very simple UID
    uid = f"RFSignal{int(time.time())}"
    
    # Standard time format for CoT
    now = datetime.utcnow()
    time_str = now.strftime('%Y-%m-%dT%H:%M:%S.995Z')
    stale_str = (now + timedelta(minutes=10)).strftime('%Y-%m-%dT%H:%M:%S.995Z')
    
    # Map RSSI to ARGB integer values (these are specific color codes that ATAK uses)
    if rssi > -30:
        color_argb = "-65536"  # Red
    elif rssi > -50:
        color_argb = "-23296"  # Orange
    elif rssi > -70:
        color_argb = "-256"    # Yellow
    else:
        color_argb = "-16776961"  # Blue
    
    # Format the CoT message following the reference implementation
    cot_xml = f'''<?xml version="1.0"?>
<event version="2.0" uid="{uid}" type="b-m-p-s-m"
time="{time_str}"
start="{time_str}"
stale="{stale_str}"
how="m-g">
    <point lat="{lat}" lon="{lon}" hae="0" ce="9.9" le="0" />
    <detail>
        <contact callsign="RF Signal" />
        <remarks>Signal: {rssi:.1f} dBFS at {peak_freq:.3f} MHz</remarks>
        <color argb="{color_argb}"/>
    </detail>
</event>'''
    
    return cot_xml

# === GPS3 INIT ===
gps_socket = None
data_stream = None

def init_gps():
    global gps_socket, latest_status # Ensure latest_status is accessible
    try:
        # Use a direct socket connection to gpsd
        gps_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        gps_socket.connect(('localhost', 2947))
        gps_socket.send(b'?WATCH={"enable":true,"json":true}\n')
        latest_status["gps_message"] = "GPSD Connected, Awaiting Fix"
        return True
    except Exception as e:
        logging.error(f"Failed to connect to gpsd: {e}")
        latest_status["gps_message"] = "GPSD Connection Failed"
        # Default lat/lon are already in latest_status
        return False

def get_current_location():
    global gps_socket
    try:
        if gps_socket is None:
            return None, None
            
        # Set socket to non-blocking mode
        gps_socket.setblocking(0)
        
        try:
            data = gps_socket.recv(4096).decode('utf-8')
            if data:
                # Process multiple GPSD sentences that might be in the buffer
                for line in data.split('\n'):
                    if line and line[0] == '{':  # Valid JSON
                        try:
                            gps_data = json.loads(line)
                            if gps_data.get('class') == 'TPV':
                                lat = gps_data.get('lat')
                                lon = gps_data.get('lon')
                                if lat is not None and lon is not None:
                                    return lat, lon
                        except json.JSONDecodeError:
                            pass
        except (socket.error, BlockingIOError):
            # No data available right now
            pass
    except Exception as e:
        logging.error(f"GPS error: {str(e)}")
    
    return None, None

def monitor_loop():
    """
    Main monitoring loop that captures data from HackRF, 
    processes it, and updates displays and CoT messages.
    """
    # Initialize variables
    last_detection_time = 0
    detection_interval = 2  # seconds between detections
    detection_counter = 0
    global latest_fft_data
    
    # Log initial state
    logging.info(f"Monitor loop starting (monitoring is {'ON' if monitor_config['running'] else 'OFF'})")
    
    # Create a test IQ signal on startup to prime the displays
    test_iq = np.random.normal(0, 0.5, 4096*2).view(np.complex64)
    test_freqs, test_powers = calculate_fft(test_iq)
    update_waterfall(test_powers)
    
    # Store initial test data
    latest_fft_data = {
        "freq": test_freqs.tolist(),
        "power": test_powers.tolist(),
        "timestamp": time.time()
    }
    
    # Main monitoring loop
    while True:
        try:
            # Check if monitoring is enabled
            if not monitor_config["running"]:
                # Only log occasional updates to avoid filling logs
                if int(time.time()) % 30 == 0:  # Log every 30 seconds
                    logging.debug("Monitoring is OFF - waiting for user to start")
                time.sleep(1)
                continue
            
            # Monitoring is active, capture data from HackRF
            logging.info(f"📡 Capturing samples from HackRF at {center_freq/1e6:.3f} MHz...")
            
            # Explicitly log gain values to be used for this capture
            current_lna_gain = monitor_config["lna_gain"]
            current_vga_gain = monitor_config["vga_gain"]
            logging.info(f"Preparing HackRF capture with LNA Gain: {current_lna_gain} dB, VGA Gain: {current_vga_gain} dB")

            capture_success = False
            try:
                # Run hackrf_transfer with better parameters and more verbose error capturing
                cmd = [
                    "hackrf_transfer",
                    "-r", "buffer.iq",
                    "-f", str(center_freq),  # Use center_freq directly for consistency
                    "-s", str(monitor_config["sample_rate"]),
                    "-n", str(monitor_config["capture_size"]),
                    "-a", "1",  # Enable amplifier
                    "-l", str(current_lna_gain),  # LNA gain from config (using logged variable)
                    "-g", str(current_vga_gain)   # VGA gain from config (using logged variable)
                ]
                
                logging.debug(f"HackRF command: {' '.join(cmd)}")
                
                # Capture stderr to diagnose any issues
                process = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    timeout=5
                )
                
                # Check result
                if process.returncode == 0:
                    capture_success = True
                    logging.debug(f"HackRF capture successful, captured {os.path.getsize('buffer.iq')} bytes")
                else:
                    stderr_output = process.stderr.decode('utf-8')
                    logging.error(f"HackRF capture failed with return code {process.returncode}: {stderr_output}")
                    capture_success = False
                    
            except subprocess.TimeoutExpired as e:
                logging.error(f"HackRF capture timed out: {str(e)}")
                capture_success = False
            except Exception as e:
                logging.error(f"Error running HackRF: {str(e)}")
                capture_success = False
            
            if not capture_success:
                logging.warning("HackRF capture failed, using test data")
                # Use random data if capture failed
                test_iq = np.random.normal(0, 0.5, 4096*2).view(np.complex64)
                freqs, fft_values = calculate_fft(test_iq)
                rssi = -70  # Default RSSI value
            else:
                # Process the captured IQ data
                try:
                    with open("buffer.iq", "rb") as f:
                        raw_data = f.read()
                        if len(raw_data) < 1000:
                            logging.error(f"Captured IQ file too small: {len(raw_data)} bytes")
                            raise ValueError("Invalid IQ data size")
                            
                        raw = np.frombuffer(raw_data, dtype=np.int8)
                        iq = raw[::2] + 1j * raw[1::2]
                        
                        # Check if IQ data looks reasonable
                        max_amplitude = np.max(np.abs(iq))
                        if max_amplitude < 5:  # Very low signal
                            logging.warning(f"Very low signal amplitude: {max_amplitude}")
                        
                        # Scale IQ data to proper range (-1 to 1)
                        iq = iq.astype(np.float32) / 128.0
                        
                        # DC spike removal - subtract mean from IQ data
                        iq = iq - np.mean(iq)
                        
                        # Calculate FFT for spectrum display
                        freqs, fft_values = calculate_fft(iq)
                        
                        # Output max power for diagnostics
                        max_power = np.max(fft_values)
                        max_power_idx = np.argmax(fft_values)
                        max_power_freq = freqs[max_power_idx]
                        logging.info(f"Max power: {max_power:.1f} dB at {max_power_freq:.3f} MHz")
                        
                        # Find the strongest peak in the FFT
                        peak_idx = max_power_idx
                        
                        # Calculate RSSI focusing on the peak
                        rssi = calculate_rssi(iq, len(fft_values), peak_idx)
                        
                except Exception as e:
                    logging.error(f"Error processing IQ data: {str(e)}")
                    # Use random data if processing failed
                    test_iq = np.random.normal(0, 0.5, 4096*2).view(np.complex64)
                    freqs, fft_values = calculate_fft(test_iq)
                    rssi = -70  # Default RSSI value
            
            # Get GPS location
            lat, lon = get_current_location()
            
            if lat is not None and lon is not None:
                latest_status["lat"] = lat
                latest_status["lon"] = lon
                latest_status["gps_message"] = "Fix Acquired"
            else: # lat or lon is None, or both are None
                # Retain last known lat/lon for display, update message
                if gps_socket is None: # Check if init_gps failed
                    latest_status["gps_message"] = "GPSD Connection Failed"
                else:
                    # If gps_socket exists, but no coords, it means we are waiting or no fix
                    # If latest_status["gps_message"] is already "GPSD Connection Failed", don't override it
                    if latest_status["gps_message"] != "GPSD Connection Failed":
                        latest_status["gps_message"] = "Awaiting Fix / No Fix"
            
            # Update status information (rssi, running, last_update)
            latest_status.update({
                "rssi": round(rssi, 2),
                # lat, lon, and gps_message are already updated above
                "running": monitor_config["running"],
                "last_update": datetime.now().isoformat()
            })
            
            logging.info(f"📶 RSSI: {rssi:.2f} dBFS | 🛰️ GPS Status: {latest_status['gps_message']} | 📍 Coords: {latest_status['lat']:.4f}, {latest_status['lon']:.4f}")
            
            # Store FFT data for web access
            latest_fft_data = {
                "freq": freqs.tolist(),
                "power": fft_values.tolist(),
                "timestamp": time.time()
            }
            # New detailed log for latest_fft_data update:
            logging.info(f"latest_fft_data updated. TS: {latest_fft_data['timestamp']:.0f}, " +
                         f"Points: {len(latest_fft_data['freq'])}, " +
                         f"Freq Range: {latest_fft_data['freq'][0]:.2f}-{latest_fft_data['freq'][-1]:.2f} MHz" 
                         if latest_fft_data['freq'] else "Freq: N/A")
            
            # Update waterfall with new FFT data
            update_waterfall(fft_values)
            
            # Check if signal is above threshold for CoT message
            current_time = time.time()
            
            # Send CoT messages every 5 seconds
            if (current_time - last_detection_time >= 5):
                
                # Get the frequency of the peak signal if available
                peak_freq = center_freq/1e6  # Default to center frequency
                if 'peak_idx' in locals() and len(freqs) > 0:
                    peak_freq = freqs[peak_idx]
                
                # Generate a CoT message with accurate frequency information
                detection_counter += 1
                cot_msg = generate_cot(lat, lon, rssi, peak_freq)
                
                # Send to configured destination
                cot_sock.sendto(cot_msg.encode('utf-8'), (monitor_config["dest_ip"], monitor_config["dest_port"]))
                logging.info(f"🚨 CoT alert sent to {monitor_config['dest_ip']}:{monitor_config['dest_port']} (RSSI: {rssi:.1f} dB at {peak_freq:.3f} MHz)")
                
                # Update last detection time
                last_detection_time = current_time
                
        except Exception as e:
            logging.error(f"Error in monitor loop: {str(e)}")
        
        # Sleep briefly before next iteration
        time.sleep(1)

# === FLASK ROUTES ===
@app.route("/", methods=["GET"])
def index():
    return render_template_string(html_template, 
                                center_freq=center_freq, 
                                sample_rate=sample_rate,
                                monitor_config=monitor_config, # Pass the whole dict
                                latest_status=latest_status, # Pass latest status for initial values
                                DISPLAY_FFT_SIZE=DISPLAY_FFT_SIZE # Pass DISPLAY_FFT_SIZE
                                )

@app.route("/waterfall.png")
def get_waterfall():
    try:
        with open('waterfall.png', 'rb') as f:
            return Response(f.read(), mimetype='image/png')
    except:
        # Return a blank 1x1 PNG if file doesn't exist
        blank_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x01\x00\x00\x00\x007n\xf9$\x00\x00\x00\nIDATx\x9cc\x00\x00\x00\x02\x00\x01\xe5\'\xde\xfc\x00\x00\x00\x00IEND\xaeB`\x82'
        return Response(blank_png, mimetype='image/png')

@app.route("/spectrum.png")
def get_spectrum():
    try:
        return send_file("spectrum.png", mimetype="image/png")
    except:
        abort(404)

@app.route("/fft", methods=["GET"])
def get_fft():
    """Return the latest FFT data for the spectrum display."""
    try:
        # Check if we have real data from the monitor loop
        if latest_fft_data["timestamp"] > 0 and len(latest_fft_data["freq"]) > 0:
            # We have real data, use it
            return jsonify(latest_fft_data)
        
        # If we don't have real data (e.g., monitoring is off), generate test data
        sample_len = 4096
        iq_data = np.random.normal(0, 0.5, sample_len*2).view(np.complex64)
        
        # Calculate the FFT
        freq, power = calculate_fft(iq_data)
        
        return jsonify({'freq': freq.tolist(), 'power': power.tolist()})
    except Exception as e:
        logging.error(f"Error in FFT route: {str(e)}")
        # Return dummy data on error
        dummy_freq = np.linspace(center_freq - sample_rate/2, center_freq + sample_rate/2, DISPLAY_FFT_SIZE) / 1e6
        dummy_power = np.random.uniform(-80, -40, DISPLAY_FFT_SIZE)
        return jsonify({'freq': dummy_freq.tolist(), 'power': dummy_power.tolist()})

@app.route("/api/update", methods=["POST"])
def update_settings():
    try:
        global center_freq, latest_fft_data, waterfall_history, monitor_config
        data = request.get_json()
        old_freq = monitor_config.get("frequency", center_freq)
        
        # Update config with the new settings
        monitor_config.update(data)
        
        # Update center_freq to match the new frequency setting
        if "frequency" in data:
            # Get the new frequency from the request
            new_freq = data["frequency"]
            
            # Check if the frequency actually changed
            if new_freq != old_freq:
                center_freq = new_freq
                logging.info(f"Center frequency updated to {center_freq/1e6} MHz")
                
                # Reset FFT data to force refresh of spectral display
                latest_fft_data = {
                    "freq": [],
                    "power": [],
                    "timestamp": 0
                }
                
                # Clear waterfall history to force refresh
                waterfall_history.clear()
                
                # Create an empty waterfall image so the view shows something
                try:
                    import matplotlib
                    matplotlib.use('Agg')
                    import matplotlib.pyplot as plt
                    
                    plt.figure(figsize=(8, 4))
                    plt.text(0.5, 0.5, f'New Frequency: {center_freq/1e6} MHz', 
                             ha='center', va='center', fontsize=14)
                    plt.axis('off')
                    plt.savefig('waterfall.png', bbox_inches='tight', pad_inches=0, dpi=100)
                    plt.close()
                except Exception as e:
                    logging.error(f"Error creating empty waterfall: {str(e)}")
                
                # If monitoring is active, restart the HackRF capture immediately
                if monitor_config["running"]:
                    try:
                        # Run HackRF reset to stop any ongoing transfers
                        subprocess.run(["hackrf_reset"], check=True, timeout=2)
                        logging.info("Reset HackRF for frequency change")
                    except Exception as e:
                        logging.error(f"Failed to reset HackRF: {str(e)}")
        
        # Save configuration to file
        save_config()
        
        return jsonify({"success": True})
    except Exception as e:
        logging.error(f"Error updating settings: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/toggle", methods=["POST"])
def toggle_monitoring():
    """Toggle the monitoring state and save the configuration."""
    monitor_config["running"] = not monitor_config["running"]
    
    # Update the latest status
    latest_status["running"] = monitor_config["running"]
    latest_status["last_update"] = datetime.now().isoformat()
    
    # Save the config
    save_config()
    
    # Log the change
    logging.info(f"🟢 Monitoring {'started' if monitor_config['running'] else 'stopped'}")
    
    return jsonify({"success": True, "running": monitor_config["running"]})

@app.route("/api/restart", methods=["POST"])
def restart_hackrf():
    try:
        subprocess.run(["hackrf_reset"], check=True)
        return "HackRF successfully reset"
    except Exception as e:
        return f"Error resetting HackRF: {str(e)}"

@app.route("/api/test_cot", methods=["POST"])
def test_cot():
    try:
        # Send test CoT messages at different signal strengths
        lat = 39.7392
        lon = -104.9903
        
        # Test with multiple signal strengths to see different colors
        rssi_levels = [-25, -45, -65, -85]
        
        # Create a socket for sending
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # Send a message at each signal level
        for rssi in rssi_levels:
            # Generate test frequency near center frequency
            test_freq = center_freq/1e6 + (np.random.random() - 0.5) * 0.2  # +/- 0.1 MHz
            
            # Generate the CoT message
            cot_xml = generate_cot(lat, lon, rssi, test_freq)
            
            # Add a small offset to lat/lon so they don't overlap exactly
            lat += 0.001
            lon += 0.001
            
            # Send to configured destination
            sock.sendto(cot_xml.encode('utf-8'), (monitor_config['dest_ip'], monitor_config['dest_port']))
            logging.info(f"Test CoT sent (RSSI: {rssi:.1f} dB at {test_freq:.3f} MHz)")
            time.sleep(0.5)  # Small delay between messages
        
        return jsonify({
            "success": True, 
            "message": f"Test CoT messages sent at {len(rssi_levels)} different signal levels"
        })
    except Exception as e:
        logging.error(f"Error sending test CoT: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/status", methods=["GET"])
def get_status():
    """Return the current status including RSSI, GPS coordinates, and monitoring state."""
    return jsonify({
        "rssi": latest_status["rssi"],
        "lat": latest_status["lat"],
        "lon": latest_status["lon"],
        "gps_message": latest_status.get("gps_message", "GPS Status Unknown"),
        "running": monitor_config["running"],
        "lna_gain": monitor_config.get("lna_gain", 40),
        "vga_gain": monitor_config.get("vga_gain", 62),
        "last_update": latest_status["last_update"],
        "center_freq": monitor_config.get("frequency", center_freq),
        "sample_rate": monitor_config.get("sample_rate", sample_rate)
    })

# === ENSURE GPSD RUNNING ===
def ensure_gpsd_running():
    gpsd_running = shutil.which("gpsd") is not None and os.system("pgrep gpsd > /dev/null") == 0
    if gpsd_running:
        logging.info("✅ gpsd is already running.")
        return

    logging.warning("⚠️ gpsd is not running. Attempting to start gpsd...")

    if shutil.which("systemctl"):
        os.system("systemctl restart gpsd.socket")
        time.sleep(2)
        if os.system("pgrep gpsd > /dev/null") == 0:
            logging.info("✅ gpsd started successfully via systemd.")
        else:
            logging.error("❌ gpsd failed to start. Please check gpsd configuration.")
            sys.exit(1)
    else:
        gps_dev = "/dev/ttyUSB0"  # Modify if your GPS is elsewhere
        os.system(f"gpsd -N -n {gps_dev} &")
        time.sleep(2)
        if os.system("pgrep gpsd > /dev/null") == 0:
            logging.info("✅ gpsd started directly.")
        else:
            logging.error("❌ gpsd failed to start. Please start it manually.")
            sys.exit(1)

# === MAIN ===
if __name__ == "__main__":
    # Print startup banner for clarity
    print("\n===============================================")
    print("🚀 Starting HackRF CoT Monitor")
    print("===============================================\n")
    
    # Ensure monitoring is OFF at startup (triple check)
    monitor_config["running"] = False
    
    # Setup logging
    logging.info("🔧 Initializing system...")
    
    # Check for gpsd
    ensure_gpsd_running()
    
    # Initialize GPS (init_gps will update latest_status["gps_message"])
    logging.info("🌍 Initializing GPS connection...")
    init_gps()
    # No need to check gps_success to update message, init_gps does it.
    # The (0,0) logic below is also removed as init_gps handles messages and defaults are set.
    
    # Start monitoring thread (but monitoring itself is OFF until user starts it)
    logging.info("🧵 Starting monitor thread (monitoring is disabled until manually started)")
    monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitor_thread.start()
    
    # Start Flask server
    logging.info(f"🌐 Web interface available at http://0.0.0.0:9999")
    print(f"\n💻 Access the web interface at: http://0.0.0.0:9999 or http://localhost:9999")
    print("📱 From other devices on the network, use the RPi's IP address\n")
    socketio.run(app, host="0.0.0.0", port=9999, debug=False) 