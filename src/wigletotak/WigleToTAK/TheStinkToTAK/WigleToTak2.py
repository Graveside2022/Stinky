import socket
import datetime
import struct
import logging
import time
from flask import Flask, request, jsonify, render_template
import os
import threading
from itertools import islice
import random
import argparse

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Parse command line arguments
parser = argparse.ArgumentParser(description='WigleToTAK2')
parser.add_argument('--directory', type=str, help='Directory containing Wigle CSV files')
parser.add_argument('--port', type=int, default=6969, help='Port for TAK broadcasting')
parser.add_argument('--flask-port', type=int, default=8000, help='Port for Flask web interface')
args = parser.parse_args()

# Initialize wigle_csv_directory with a sensible default
# Default to /home/pi/kismet_ops or a tmp directory if not provided
default_wigle_directory = '/home/pi/kismet_ops'
if not os.path.exists(default_wigle_directory):
    default_wigle_directory = '/tmp/kismet'
    if not os.path.exists(default_wigle_directory):
        os.makedirs(default_wigle_directory, exist_ok=True)

wigle_csv_directory = args.directory if args.directory else default_wigle_directory
tak_server_port = str(args.port)

broadcasting = False
broadcast_thread = None
tak_server_ip = '0.0.0.0'
tak_multicast_state = True
whitelisted_ssids = set()
whitelisted_macs = set()
blacklisted_ssids = {}
blacklisted_macs = {}
analysis_mode = 'realtime'  # Default mode
antenna_sensitivity = 'standard'  # Default antenna sensitivity
sensitivity_factors = {
    'standard': 1.0,
    'alfa_card': 1.5,  # Alfa cards typically have ~1.5x better sensitivity
    'high_gain': 2.0,  # High gain antennas
    'rpi_internal': 0.7,  # Raspberry Pi internal WiFi (typically less sensitive)
    'custom': 1.0      # Custom value that can be set
}
custom_sensitivity_factor = 1.0  # For custom sensitivity factor

@app.route('/')
def index():
    return render_template('WigleToTAK.html')

@app.route('/update_tak_settings', methods=['POST'])
def update_tak_settings():
    data = request.json
    global tak_server_ip, tak_server_port
    tak_server_ip = data.get('tak_server_ip')
    tak_server_port = data.get('tak_server_port')

    if tak_server_ip is not None and tak_server_port is not None:
        logger.info(f"TAK Server IP and Port updated successfully. New IP: {tak_server_ip}, New Port: {tak_server_port}")
        return jsonify({'message': 'TAK settings updated successfully!'}), 200
    else:
        logger.error("Missing TAK Server IP or Port in the request")
        return jsonify({'error': 'Missing TAK Server IP or Port in the request'}), 400

@app.route('/update_multicast_state', methods=['POST'])
def update_multicast_state():
    data = request.json
    global tak_multicast_state
    tak_multicast_state = data.get('takMulticast')

    if tak_multicast_state is not None:
        logger.info(f"TAK Multicast state updated successfully: {tak_multicast_state}")
        return jsonify({'message': 'TAK Multicast state updated successfully!'}), 200
    else:
        logger.error("Missing TAK Multicast state in the request")
        return jsonify({'error': 'Missing TAK Multicast state in the request'}), 400

@app.route('/update_analysis_mode', methods=['POST'])
def update_analysis_mode():
    data = request.json
    global analysis_mode
    mode = data.get('mode')

    if mode in ['realtime', 'postcollection']:
        analysis_mode = mode
        logger.info(f"Analysis mode updated successfully: {analysis_mode}")
        return jsonify({'message': 'Analysis mode updated successfully!'}), 200
    else:
        logger.error("Invalid analysis mode in the request")
        return jsonify({'error': 'Invalid analysis mode in the request'}), 400

@app.route('/update_antenna_sensitivity', methods=['POST'])
def update_antenna_sensitivity():
    data = request.json
    global antenna_sensitivity, custom_sensitivity_factor
    new_sensitivity = data.get('antenna_sensitivity')
    
    if new_sensitivity is not None:
        if new_sensitivity in sensitivity_factors:
            antenna_sensitivity = new_sensitivity
            logger.info(f"Antenna sensitivity updated to: {antenna_sensitivity}")
            
            # If custom sensitivity is selected, update the custom factor too
            if new_sensitivity == 'custom' and 'custom_factor' in data:
                try:
                    custom_factor = float(data['custom_factor'])
                    if custom_factor > 0:
                        custom_sensitivity_factor = custom_factor
                        logger.info(f"Custom sensitivity factor set to: {custom_sensitivity_factor}")
                    else:
                        logger.error("Custom sensitivity factor must be positive")
                        return jsonify({'error': 'Custom sensitivity factor must be positive'}), 400
                except (ValueError, TypeError):
                    logger.error("Invalid custom sensitivity factor")
                    return jsonify({'error': 'Invalid custom sensitivity factor'}), 400
                    
            return jsonify({'message': 'Antenna sensitivity updated successfully!'}), 200
        else:
            logger.error(f"Invalid antenna sensitivity: {new_sensitivity}")
            return jsonify({'error': 'Invalid antenna sensitivity type'}), 400
    else:
        logger.error("Missing antenna sensitivity in the request")
        return jsonify({'error': 'Missing antenna sensitivity in the request'}), 400

@app.route('/get_antenna_settings', methods=['GET'])
def get_antenna_settings():
    global antenna_sensitivity, custom_sensitivity_factor, sensitivity_factors
    
    settings = {
        'current_sensitivity': antenna_sensitivity,
        'available_types': list(sensitivity_factors.keys()),
        'custom_factor': custom_sensitivity_factor
    }
    
    return jsonify(settings), 200

@app.route('/list_wigle_files', methods=['GET'])
def list_wigle_files():
    directory = request.args.get('directory')
    if directory:
        try:
            files = [f for f in os.listdir(directory) if f.endswith('.wiglecsv')]
            sorted_files = sorted(files, reverse=True)
            return jsonify({'files': sorted_files})
        except Exception as e:
            logger.error(f"Error listing files in directory: {e}")
            return jsonify({'error': 'Error listing files in directory'}), 500
    else:
        return jsonify({'error': 'Directory parameter is missing'}), 400

@app.route('/stop_broadcast', methods=['POST'])
def stop_broadcast():
    global broadcasting, broadcast_thread
    broadcasting = False
    if broadcast_thread:
        broadcast_thread.join()  # Wait for the broadcasting thread to finish
    return jsonify({'message': 'Broadcast stopped successfully'})

@app.route('/start_broadcast', methods=['POST'])
def start_broadcast():
    global broadcasting, broadcast_thread
    data = request.json
    directory = data.get('directory', wigle_csv_directory)  # Use default directory if none provided
    filename = data.get('filename')
    
    if filename:
        logger.info(f'Starting broadcast for file: {filename}')
        full_path = os.path.join(directory, filename)
        if os.path.exists(full_path):
            logger.info(f'File path: {full_path}')
            broadcasting = True  
            broadcast_thread = threading.Thread(target=broadcast_file, args=(full_path,))
            broadcast_thread.start()  # Start broadcasting in a separate thread
            return jsonify({'message': 'Broadcast started for file: ' + filename})
        else:
            return jsonify({'error': 'File does not exist'}), 404
    else:
        return jsonify({'error': 'Filename parameter is missing'}), 400

@app.route('/add_to_whitelist', methods=['POST'])
def add_to_whitelist():
    data = request.json
    ssid = data.get('ssid')
    mac = data.get('mac')
    if ssid:
        whitelisted_ssids.add(ssid)
        return jsonify({'message': f'SSID {ssid} added to whitelist'})
    elif mac:
        whitelisted_macs.add(mac)
        return jsonify({'message': f'MAC address {mac} added to whitelist'})
    else:
        return jsonify({'error': 'Missing SSID or MAC address in request'}), 400

@app.route('/remove_from_whitelist', methods=['POST'])
def remove_from_whitelist():
    data = request.json
    ssid = data.get('ssid')
    mac = data.get('mac')
    if ssid:
        if ssid in whitelisted_ssids:
            whitelisted_ssids.remove(ssid)
            return jsonify({'message': f'SSID {ssid} removed from whitelist'})
        else:
            return jsonify({'error': f'SSID {ssid} not found in whitelist'}), 404
    elif mac:
        if mac in whitelisted_macs:
            whitelisted_macs.remove(mac)
            return jsonify({'message': f'MAC address {mac} removed from whitelist'})
        else:
            return jsonify({'error': f'MAC address {mac} not found in whitelist'}), 404
    else:
        return jsonify({'error': 'Missing SSID or MAC address in request'}), 400

@app.route('/add_to_blacklist', methods=['POST'])
def add_to_blacklist():
    data = request.json
    ssid = data.get('ssid')
    mac = data.get('mac')
    argb_value = data.get('argb_value')
    if ssid and argb_value:
        blacklisted_ssids[ssid] = argb_value
        return jsonify({'message': f'SSID {ssid} with ARBG value {argb_value} added to blacklist'})
    elif mac and argb_value:
        blacklisted_macs[mac] = argb_value
        return jsonify({'message': f'MAC address {mac} with ARBG value {argb_value} added to blacklist'})
    else:
        return jsonify({'error': 'Missing SSID or MAC address or ARBG value in request'}), 400

@app.route('/remove_from_blacklist', methods=['POST'])
def remove_from_blacklist():
    data = request.json
    ssid = data.get('ssid')
    mac = data.get('mac')
    if ssid:
        if ssid in blacklisted_ssids:
            del blacklisted_ssids[ssid]
            return jsonify({'message': f'SSID {ssid} removed from blacklist'})
        else:
            return jsonify({'error': f'SSID {ssid} not found in blacklist'}), 404
    elif mac:
        if mac in blacklisted_macs:
            del blacklisted_macs[mac]
            return jsonify({'message': f'MAC address {mac} removed from blacklist'})
        else:
            return jsonify({'error': f'MAC address {mac} not found in blacklist'}), 404
    else:
        return jsonify({'error': 'Missing SSID or MAC address in request'}), 400

def read_file(filename, start_position):
    with open(filename, 'r') as file:
        file.seek(start_position)
        for line in file:
            yield line.strip().split(',')

def broadcast_file(full_path, multicast_group='239.2.3.1', port=6969):
    if analysis_mode == 'realtime':
        broadcast_file_realtime(full_path, multicast_group, port)
    else:
        broadcast_file_postcollection(full_path, multicast_group, port)

def broadcast_file_realtime(full_path, multicast_group='239.2.3.1', port=6969):
    logger.info(f'Broadcasting in real-time mode for file: {full_path}')
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.2)
    ttl = struct.pack('b', 1)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)

    last_position = 0
    processed_macs = set()
    while broadcasting:
        logger.debug(f"Broadcasting CoT XML packets from file: {full_path}, last position: {last_position}")
        for fields in read_file(full_path, last_position):
            if len(fields) >= 10:
                mac, ssid, authmode, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, device_type = fields[:11]
                if mac not in processed_macs and (not whitelisted_macs or mac not in whitelisted_macs):
                    cot_xml_payload = create_cot_xml_payload_ellipse(mac, ssid, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, authmode, device_type)
                    logger.debug(f"Sending CoT XML packet: {cot_xml_payload}")
                    # Send the CoT XML packet
                    if tak_multicast_state:
                        # Send to multicast if multicast is enabled
                        sock.sendto(cot_xml_payload.encode(), (multicast_group, port))
                    
                    if tak_server_ip and tak_server_port:
                        # Send to user-defined IP and Port if available
                        sock.sendto(cot_xml_payload.encode(), (tak_server_ip, int(tak_server_port)))

                    processed_macs.add(mac)  # Add MAC address to processed set
        # Update the last position
        last_position = os.path.getsize(full_path)
        time.sleep(0.1)
        
    sock.close()

def broadcast_file_postcollection(full_path, multicast_group='239.2.3.1', port=6969, chunk_size=100):
    logger.info(f'Broadcasting in post-collection mode for file: {full_path}')
    setup_socket_and_broadcast(full_path, multicast_group, port, chunk_size)

def setup_socket_and_broadcast(full_path, multicast_group, port, chunk_size):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(0.2)
    ttl = struct.pack('b', 1)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)

    with open(full_path, 'r') as file:
        processed_entries = set()
        while broadcasting:
            lines = list(islice(file, chunk_size))
            if not lines:
                break

            for line in lines:
                fields = line.strip().split(',')
                if len(fields) >= 10:
                    mac, ssid, authmode, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, device_type = fields[:11]
                    if (mac not in processed_entries and ssid not in processed_entries) and \
                       (not whitelisted_ssids or ssid not in whitelisted_ssids) and \
                       (not whitelisted_macs or mac not in whitelisted_macs):
                        cot_xml_payload = create_cot_xml_payload_ellipse(mac, ssid, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, authmode, device_type)
                        if tak_multicast_state:
                            sock.sendto(cot_xml_payload.encode(), (multicast_group, port))
                        if tak_server_ip and tak_server_port:
                            sock.sendto(cot_xml_payload.encode(), (tak_server_ip, int(tak_server_port)))

                        processed_entries.add(mac)
                        processed_entries.add(ssid)
            time.sleep(0.1)
    sock.close()

def create_cot_xml_payload_ellipse(mac, ssid, firstseen, channel, rssi, currentlatitude, currentlongitude, altitudemeters, accuracymeters, authmode, device_type):
    # Convert RSSI to a reasonable ellipse size
    # RSSI typically ranges from -30 (very strong) to -90 (very weak)
    # Use the absolute RSSI value to calculate the size of the ellipse
    try:
        rssi_value = abs(float(rssi))
        
        # Apply antenna sensitivity adjustment
        global antenna_sensitivity, custom_sensitivity_factor
        sensitivity_factor = sensitivity_factors.get(antenna_sensitivity, 1.0)
        if antenna_sensitivity == 'custom':
            sensitivity_factor = custom_sensitivity_factor
            
        # Adjust RSSI based on antenna sensitivity
        # Higher sensitivity means we detect signals from farther away,
        # so we should make the ellipse larger
        adjusted_rssi = rssi_value / sensitivity_factor
        
        # Base size in meters, adjusted based on signal strength
        # Stronger signals (lower abs value) = smaller ellipse
        # Weaker signals (higher abs value) = larger ellipse
        major_axis = min(max(20, adjusted_rssi * 2), 500)  # Between 20-500 meters
        minor_axis = major_axis * 0.8  # Slightly oval shape
        
        # If accuracy is provided, use it to adjust the ellipse
        if accuracymeters and accuracymeters.strip() and float(accuracymeters) > 0:
            major_axis = max(major_axis, float(accuracymeters) * 2)
    except (ValueError, TypeError):
        # Default values if RSSI or accuracy can't be parsed
        major_axis = 100
        minor_axis = 80
    
    # Include antenna sensitivity in remarks
    remarks = f"Channel: {channel}, RSSI: {rssi}, AltitudeMeters: {altitudemeters}, AccuracyMeters: {accuracymeters}, " \
              f"Authentication: {authmode}, Device: {device_type}, MAC: {mac}, " \
              f"Antenna: {antenna_sensitivity}"
    
    # Use SSID as UID if available, otherwise use MAC
    uid = ssid if ssid and ssid.strip() else mac
    
    # Generate random angle for more realistic visualization
    angle = random.uniform(0, 180)
    
    # Format current time for CoT message
    current_time = datetime.datetime.utcnow()
    time_str = current_time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    start_time = time_str
    stale_time = (current_time + datetime.timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    
    # Get color from blacklist or use default
    color_argb = blacklisted_ssids.get(ssid, blacklisted_macs.get(mac, "-65281"))
    
    # Convert color from argb string to individual style values for LineStyle and PolyStyle
    # Default cyan colors if conversion fails
    try:
        # If color is a negative number as string (e.g., "-65281"), convert to positive hex
        if color_argb.startswith('-'):
            # Convert negative decimal to positive hex without '0x' prefix and ensure it's 8 digits
            color_hex = format(int(color_argb) & 0xFFFFFFFF, '08x')
        else:
            # If it's already a positive number or hex string
            color_hex = format(int(color_argb) & 0xFFFFFFFF, '08x')
        
        # Extract alpha, red, green, blue components
        alpha = color_hex[0:2]
        red = color_hex[2:4]
        green = color_hex[4:6]
        blue = color_hex[6:8]
        
        # Format for KML style (AABBGGRR format)
        line_color = f"{alpha}{blue}{green}{red}"
        poly_color = f"4c{blue}{green}{red}"  # 4c = ~30% opacity
    except (ValueError, IndexError):
        # Default cyan colors
        line_color = "ff99ffff"
        poly_color = "4c99ffff"
    
    # Create a unique style UID
    style_uid = f"{uid}.Style"
    
    return f'''<?xml version="1.0" encoding="UTF-8"?><event access="Undefined" how="h-e" stale="{stale_time}" start="{start_time}" time="{time_str}" type="u-d-c-e" uid="{uid}" version="2.0">
    <point ce="9999999.0" hae="{altitudemeters}" lat="{currentlatitude}" le="9999999.0" lon="{currentlongitude}"/>
    <detail>
        <shape>
            <ellipse angle="{angle}" major="{major_axis}" minor="{minor_axis}"/>
            <link relation="p-c" type="b-x-KmlStyle" uid="{style_uid}">
                <Style>
                    <LineStyle>
                        <color>{line_color}</color>
                        <width>0.01</width>
                    </LineStyle>
                    <PolyStyle>
                        <color>{poly_color}</color>
                    </PolyStyle>
                </Style>
            </link>
        </shape>
        <__shapeExtras cpvis="true" editable="true"/>
        <labels_on value="false"/>
        <remarks>{remarks}</remarks>
        <archive/>
        <color value="{color_argb}"/>
        <strokeColor value="{color_argb}"/>
        <strokeWeight value="0.01"/>
        <strokeStyle value="solid"/>
        <fillColor value="1285160959"/>
        <contact callsign="{uid}"/>
    </detail>
</event>'''

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=args.flask_port)
