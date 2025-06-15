#!/usr/bin/env python3
"""
Simple MavLink to GPSD Bridge
Connects to MavProxy and serves GPS data in GPSD format for Kismet
"""

from pymavlink import mavutil
import socket
import json
import time
import select
from datetime import datetime, timezone
import os
import signal
import sys

class MavlinkGPSD:
    def __init__(self, mavlink_connection='tcp:localhost:14550', gpsd_port=2947):
        self.running = True
        self.clients = []
        
        # Set up TCP socket for GPSD
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(('127.0.0.1', gpsd_port))
        self.sock.listen(5)
        print(f"GPSD TCP server listening on port {gpsd_port}")
        
        # Connect to MavProxy
        try:
            print(f"Connecting to MavProxy at {mavlink_connection}")
            self.mav = mavutil.mavlink_connection(mavlink_connection)
            print("Waiting for heartbeat...")
            self.mav.wait_heartbeat()
            print("Heartbeat received!")
        except Exception as e:
            print(f"Error connecting to MavProxy: {e}")
            sys.exit(1)
        
        # Set up signal handler for clean shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

    def signal_handler(self, signum, frame):
        print("\nShutting down...")
        self.running = False

    def send_to_client(self, client, data):
        try:
            if isinstance(data, dict):
                msg = json.dumps(data).encode() + b'\n'
            else:
                msg = data.encode()
            client.sendall(msg)
            return True
        except:
            return False

    def handle_client_data(self, client):
        try:
            data = client.recv(1024)
            if not data:
                return False
            
            data_str = data.decode('ascii', errors='ignore')
            
            # Send initial GPSD protocol messages
            version = {
                "class": "VERSION",
                "release": "3.17",
                "rev": "3.17",
                "proto_major": 3,
                "proto_minor": 11
            }
            
            watch_response = {
                "class": "WATCH",
                "enable": True,
                "json": True,
                "nmea": False,
                "raw": 0,
                "scaled": False,
                "timing": False,
                "split24": False,
                "pps": False
            }
            
            devices = {
                "class": "DEVICES",
                "devices": [{
                    "class": "DEVICE",
                    "path": "mavlink",
                    "driver": "MAVLink",
                    "activated": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                    "flags": 1,
                    "native": 0
                }]
            }
            
            # Send responses based on client request
            if "?WATCH=" in data_str or "?WATCH;" in data_str:
                self.send_to_client(client, version)
                self.send_to_client(client, watch_response)
                self.send_to_client(client, devices)
            elif "?VERSION;" in data_str:
                self.send_to_client(client, version)
            elif "?DEVICES;" in data_str:
                self.send_to_client(client, devices)
            
            return True
        except:
            return False

    def run(self):
        last_pos = None
        last_gps = None
        
        while self.running:
            # Handle client connections
            readable, _, _ = select.select([self.sock] + self.clients, [], [], 0.1)
            
            for sock in readable:
                if sock is self.sock:
                    # New connection
                    client, addr = sock.accept()
                    print(f"New client connected: {addr}")
                    self.clients.append(client)
                else:
                    # Existing client data
                    if not self.handle_client_data(sock):
                        print("Client disconnected")
                        sock.close()
                        self.clients.remove(sock)
            
            # Get MAVLink messages
            msg = self.mav.recv_match(type=['GLOBAL_POSITION_INT', 'GPS_RAW_INT'], blocking=False)
            if msg is not None:
                if msg.get_type() == 'GLOBAL_POSITION_INT':
                    last_pos = msg
                elif msg.get_type() == 'GPS_RAW_INT':
                    last_gps = msg

                if last_pos and last_gps and self.clients:
                    # Calculate speed from velocity components
                    speed = (last_pos.vx ** 2 + last_pos.vy ** 2) ** 0.5 / 100.0  # m/s
                    
                    # Create TPV report
                    tpv = {
                        "class": "TPV",
                        "device": "mavlink",
                        "mode": last_gps.fix_type,
                        "time": datetime.now(timezone.utc).isoformat(),
                        "lat": last_pos.lat / 1e7,
                        "lon": last_pos.lon / 1e7,
                        "alt": last_pos.alt / 1000.0,
                        "track": last_pos.hdg / 100.0 if last_pos.hdg != 65535 else 0,
                        "speed": speed,
                    }
                    
                    # Create SKY report
                    sky = {
                        "class": "SKY",
                        "device": "mavlink",
                        "satellites": [{"used": True}] * last_gps.satellites_visible,
                        "hdop": last_gps.eph / 100.0 if hasattr(last_gps, 'eph') else 0,
                        "vdop": last_gps.epv / 100.0 if hasattr(last_gps, 'epv') else 0
                    }
                    
                    # Send to all clients
                    for client in self.clients[:]:
                        try:
                            self.send_to_client(client, tpv)
                            self.send_to_client(client, sky)
                        except:
                            try:
                                client.close()
                            except:
                                pass
                            self.clients.remove(client)
            
            time.sleep(0.1)  # Prevent CPU hogging

        # Clean shutdown
        for client in self.clients:
            try:
                client.close()
            except:
                pass
        self.sock.close()

def main():
    # Default to TCP connection to MavProxy
    connection = 'tcp:localhost:14550'
    
    # If USB device is available, use it instead
    if os.path.exists('/dev/ttyACM0'):
        connection = '/dev/ttyACM0'
    
    bridge = MavlinkGPSD(mavlink_connection=connection)
    bridge.run()

if __name__ == "__main__":
    main()
