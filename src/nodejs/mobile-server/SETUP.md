# Mobile Kismet Operations Center - Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   ./start.sh
   ```

3. **Access the mobile interface:**
   - Open http://localhost:8889 in your browser
   - Or use your Pi's IP: http://[pi-ip]:8889

## Systemd Service Setup (Optional)

To run the mobile server as a system service:

1. **Copy the service file:**
   ```bash
   sudo cp kismet-mobile.service /etc/systemd/system/
   ```

2. **Reload systemd:**
   ```bash
   sudo systemctl daemon-reload
   ```

3. **Enable the service:**
   ```bash
   sudo systemctl enable kismet-mobile
   ```

4. **Start the service:**
   ```bash
   sudo systemctl start kismet-mobile
   ```

5. **Check status:**
   ```bash
   sudo systemctl status kismet-mobile
   ```

## Manual Management

- **Start server:** `./start.sh` or `npm start`
- **Stop server:** `./stop.sh`
- **Check logs:** `tail -f server.out` or `tail -f mobile-server.log`

## Troubleshooting

### Port Already in Use
If you get "EADDRINUSE" error:
```bash
./stop.sh
# or
lsof -ti:8889 | xargs kill
```

### Original Server Not Running
The mobile server proxies to the original server on port 8002. Make sure it's running:
```bash
cd ../kismet-operations
npm start
```

### Can't Find Mobile HTML
Ensure the mobile-optimized HTML file exists:
```bash
ls -la ../../../outputs/mobile_optimization_20250621_140156/final/kismet_mobile_optimized.html
```

## Features

- Mobile-optimized interface on port 8889
- Proxies all API calls to original server (port 8002)
- Handles Kismet iframe integration
- Lightweight and responsive
- Touch-friendly controls

## Network Access

To access from other devices:
1. Find your Pi's IP: `hostname -I`
2. Open http://[pi-ip]:8889 on your mobile device
3. Ensure both ports 8889 and 8002 are accessible