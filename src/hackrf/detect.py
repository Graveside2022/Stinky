import subprocess
import numpy as np
import threading
import socket
import time
import os
import sys
import shutil
import logging
from datetime import datetime, timedelta
from flask import Flask, render_template_string, request
from flask_socketio import SocketIO
from gps3 import gps3

# === FLASK SETUP ===
app = Flask(__name__)
socketio = SocketIO(app)

# === CONFIG ===
monitor_config = {
    "frequency": 433000000,
    "sample_rate": 2000000,
    "capture_size": 2**20,
    "threshold": -30,
    "dest_ip": "192.168.1.100",
    "dest_port": 9999,
    "running": False
}

latest_status = {"rssi": None, "lat": None, "lon": None}

# === LOGGING ===
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

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

# === HTML TEMPLATE ===
TEMPLATE = """
<!doctype html>
<html lang="en">
<head>
  <title>HackRF CoT Monitor</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-dark text-light">
<div class="container mt-5">
  <h1 class="mb-4">📡 HackRF CoT Monitor</h1>

  <form method="POST" action="/update" class="mb-4">
    <div class="row">
      <div class="col-md-3">
        <label>Frequency (Hz)</label>
        <input name="frequency" class="form-control" value="{{ config.frequency }}">
      </div>
      <div class="col-md-3">
        <label>RSSI Threshold (dBFS)</label>
        <input name="threshold" class="form-control" value="{{ config.threshold }}">
      </div>
      <div class="col-md-3">
        <label>CoT Destination IP</label>
        <input name="dest_ip" class="form-control" value="{{ config.dest_ip }}">
      </div>
      <div class="col-md-3">
        <label>Port</label>
        <input name="dest_port" class="form-control" value="{{ config.dest_port }}">
      </div>
    </div>
    <button type="submit" class="btn btn-primary mt-3">Update Settings</button>
  </form>

  <form method="POST" action="/toggle">
    <button type="submit" class="btn {{ 'btn-danger' if config.running else 'btn-success' }}">
      {{ '🛑 Stop Monitoring' if config.running else '▶️ Start Monitoring' }}
    </button>
  </form>

  <div class="mt-4">
    <h3>Status:</h3>
    <p><strong>Last RSSI:</strong> {{ status.rssi }}</p>
    <p><strong>Last GPS:</strong> {{ status.lat }}, {{ status.lon }}</p>
  </div>
</div>
</body>
</html>
"""

# === GPS3 INIT ===
gps_socket = gps3.GPSDSocket()
data_stream = gps3.DataStream()
gps_socket.connect()
gps_socket.watch()

def get_current_location():
    for new_data in gps_socket:
        if new_data:
            data_stream.unpack(new_data)
            lat = data_stream.TPV.get('lat')
            lon = data_stream.TPV.get('lon')
            if lat is not None and lon is not None:
                return lat, lon
        break
    return None, None

# === SIGNAL PROCESSING ===
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def dbfs(iq):
    power = np.mean(np.abs(iq)**2)
    return 10 * np.log10(power)

def generate_cot(uid, cot_type, lat, lon, freq):
    now = datetime.utcnow()
    stale = now + timedelta(minutes=5)
    time_fmt = "%Y-%m-%dT%H:%M:%SZ"
    
    # Get the current RSSI value
    rssi = latest_status.get("rssi", -50)
    
    # Determine color based on RSSI value
    # Color is used by ATAK for styling the icon
    # The format is AABBGGRR in hex (Alpha, Blue, Green, Red)
    if rssi > -20:  # Very strong signal
        color = "ffff0000"  # Red
    elif rssi > -40:  # Strong signal
        color = "ff00ff00"  # Green
    elif rssi > -60:  # Medium signal
        color = "ff0000ff"  # Blue
    else:  # Weak signal
        color = "ffffff00"  # Yellow
    
    return f"""<event version="2.0"
  uid="{uid}"
  type="{cot_type}"
  how="m-g"
  time="{now.strftime(time_fmt)}"
  start="{now.strftime(time_fmt)}"
  stale="{stale.strftime(time_fmt)}"
  lat="{lat}"
  lon="{lon}"
  hae="0" ce="9999999.0" le="9999999.0">
  <detail>
    <contact callsign="Signal-Detected"/>
    <remarks>Signal: {rssi:.1f} dBFS at {freq/1e6:.3f} MHz</remarks>
    <color>{color}</color>
    <strokeColor>{color}</strokeColor>
    <strokeWeight>2</strokeWeight>
    <fillColor>{color}</fillColor>
    <usericon iconsetpath="COT_MAPPING_2525B/a-n/a-o/a-a"/>
    <signal_strength>{rssi}</signal_strength>
  </detail>
</event>"""

def monitor_loop():
    while True:
        if not monitor_config["running"]:
            time.sleep(1)
            continue

        logging.info("📡 Capturing samples from HackRF...")
        subprocess.run(
            ["hackrf_transfer", "-r", "buffer.iq",
             "-f", str(monitor_config["frequency"]),
             "-s", str(monitor_config["sample_rate"]),
             "-n", str(monitor_config["capture_size"])],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        with open("buffer.iq", "rb") as f:
            raw = np.frombuffer(f.read(), dtype=np.int8)
            iq = raw[::2] + 1j * raw[1::2]

        rssi = dbfs(iq)
        lat, lon = get_current_location()
        latest_status.update({"rssi": round(rssi, 2), "lat": lat, "lon": lon})
        logging.info(f"📶 RSSI: {rssi:.2f} dBFS | 📍 GPS: {lat}, {lon}")

        if rssi > monitor_config["threshold"] and lat and lon:
            cot_msg = generate_cot("HackRF-Alert-001", "a-f-A-M-F", lat, lon, monitor_config["frequency"])
            sock.sendto(cot_msg.encode('utf-8'), (monitor_config["dest_ip"], monitor_config["dest_port"]))
            logging.info(f"🚨 CoT alert sent to {monitor_config['dest_ip']}:{monitor_config['dest_port']}")

        time.sleep(1)

# === FLASK ROUTES ===
@app.route("/", methods=["GET"])
def index():
    return render_template_string(TEMPLATE, config=monitor_config, status=latest_status)

@app.route("/update", methods=["POST"])
def update_config():
    monitor_config["frequency"] = int(request.form["frequency"])
    monitor_config["threshold"] = float(request.form["threshold"])
    monitor_config["dest_ip"] = request.form["dest_ip"]
    monitor_config["dest_port"] = int(request.form["dest_port"])
    logging.info(f"⚙️ Updated config: {monitor_config}")
    return "Updated. <a href='/'>Back</a>"

@app.route("/toggle", methods=["POST"])
def toggle_monitoring():
    monitor_config["running"] = not monitor_config["running"]
    logging.info(f"🟢 Monitoring {'started' if monitor_config['running'] else 'stopped'}")
    return "Toggled. <a href='/'>Back</a>"

# === MAIN ===
if __name__ == "__main__":
    ensure_gpsd_running()
    threading.Thread(target=monitor_loop, daemon=True).start()
    socketio.run(app, host="0.0.0.0", port=9999)
