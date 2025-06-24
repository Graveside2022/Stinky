# WigleToTAK Node.js

Node.js implementation of WigleToTAK, replacing the Python Flask version with improved performance and WebSocket support.

## Quick Start

```bash
# Install and start service
sudo ./install-service.sh
sudo systemctl start wigle-to-tak-nodejs

# Or run manually
./start-wigle-to-tak.sh /home/pi/kismet_ops 6969 8000
```

## Features

- Real-time .wiglecsv file processing
- WebSocket support for live updates
- TAK multicast and unicast broadcasting
- Antenna sensitivity compensation
- SSID/MAC filtering (whitelist/blacklist)
- File upload support

## Command Line Options

```bash
node server.js --directory <path> --port <tak-port> --flask-port <web-port>
```

- `--directory`: Directory containing .wiglecsv files (default: ./)
- `--port`: TAK broadcasting port (default: 6969)
- `--flask-port`: Web interface port (default: 3002)

## API Endpoints

- `GET /` - Web interface
- `GET /api/status` - Current system status
- `POST /start_broadcast` - Start broadcasting
- `POST /stop_broadcast` - Stop broadcasting
- `POST /update_tak_settings` - Update TAK server configuration
- `GET /list_wigle_files` - List available .wiglecsv files

## WebSocket Events

- `status` - System status updates
- `broadcastStarted` - Broadcasting started
- `broadcastStopped` - Broadcasting stopped
- `messageSent` - TAK message sent
- `error` - Error notifications

## Service Management

```bash
# Start/stop/restart service
sudo systemctl start wigle-to-tak-nodejs
sudo systemctl stop wigle-to-tak-nodejs
sudo systemctl restart wigle-to-tak-nodejs

# View logs
sudo journalctl -u wigle-to-tak-nodejs -f
tail -f /home/pi/tmp/wigle-to-tak-nodejs.log
```