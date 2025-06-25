# Flask to Node.js File Structure Mapping

## Project Overview

This document maps the file structure between the Flask implementation at `/home/pi/projects/stinkster` and the Node.js implementation at `/home/pi/projects/stinkster_malone/stinkster`.

## Directory Structure Comparison

### Root Level Files

| Flask Project | Node.js Project | Purpose |
|--------------|-----------------|---------|
| `/home/pi/projects/stinkster/` | `/home/pi/projects/stinkster_malone/stinkster/` | Project root |
| `config.json` | `config.json` | HackRF frequency and gain settings |
| `config.py` | `src/nodejs/config/index.js` | Main configuration module |
| `docker-compose.yml` | `docker-compose.yml` | Docker service definitions |
| `kismet_site.conf` | `kismet_site.conf` | Kismet configuration |
| `service-orchestration.conf` | `service-orchestration.conf` | Service coordination config |
| `package.json` | `package.json` | Project dependencies |
| `load_config.sh` | `load_config.sh` | Configuration loader script |

### Source Code Structure

#### GPS MAVLink Bridge
| Flask Path | Node.js Path | Description |
|------------|--------------|-------------|
| `src/gpsmav/mavgps.py` | `src/nodejs/gps-bridge/index.js` | MAVLink to GPSD bridge |
| `src/gpsmav/__init__.py` | N/A | Python package init |
| `src/gpsmav/requirements.txt` | `src/nodejs/gps-bridge/package.json` | Dependencies |
| `src/gpsmav/venv/` | `src/nodejs/gps-bridge/node_modules/` | Virtual env/dependencies |

#### HackRF/Spectrum Analyzer
| Flask Path | Node.js Path | Description |
|------------|--------------|-------------|
| `src/hackrf/spectrum_analyzer.py` | `src/nodejs/kismet-operations/lib/spectrumCore.js` | Spectrum analyzer logic |
| `src/hackrf/templates/spectrum.html` | `src/nodejs/kismet-operations/public/spectrum.html` | Web interface |
| `src/hackrf/config.json` | `config.json` (shared) | HackRF configuration |
| `src/hackrf/detect.py` | N/A (removed) | Detection utilities |
| `src/hackrf/venv/` | Shared `node_modules/` | Dependencies |

#### WigleToTAK Converter
| Flask Path | Node.js Path | Description |
|------------|--------------|-------------|
| `src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py` | `src/nodejs/wigle-to-tak/index.js` | Main WigleToTAK service |
| `src/wigletotak/WigleToTAK/TheStinkToTAK/v2WigleToTak2.py` | `src/nodejs/wigle-to-tak/lib/wigleToTakCore.js` | Enhanced version logic |
| `src/wigletotak/WigleToTAK/TheStinkToTAK/templates/WigleToTAK.html` | `src/nodejs/wigle-to-tak/views/WigleToTAK.html` | Web interface |
| `src/wigletotak/WigleToTAK/TheStinkToTAK/requirements.txt` | `src/nodejs/wigle-to-tak/package.json` | Dependencies |
| `src/wigletotak/WigleToTAK/TheStinkToTAK/venv/` | `src/nodejs/wigle-to-tak/node_modules/` | Virtual env/dependencies |

#### Kismet Operations Center
| Flask Path | Node.js Path | Description |
|------------|--------------|-------------|
| N/A (new feature) | `src/nodejs/kismet-operations/index.js` | Kismet dashboard |
| N/A | `src/nodejs/kismet-operations/server.js` | Express server |
| N/A | `src/nodejs/kismet-operations/views/hi.html` | Main dashboard UI |
| N/A | `src/nodejs/kismet-operations/public/js/kismet-operations.js` | Frontend logic |
| N/A | `src/nodejs/kismet-operations/public/css/kismet-operations.css` | Styling |
| N/A | `src/nodejs/kismet-operations/lib/webhook/` | Webhook functionality |

#### Orchestration Scripts
| Flask Path | Node.js Path | Description |
|------------|--------------|-------------|
| `src/orchestration/gps_kismet_wigle.sh` | `src/orchestration/gps_kismet_wigle.sh` | Main orchestration |
| `src/orchestration/start_kismet_background.sh` | `src/orchestration/start_kismet_background.sh` | Kismet starter |
| `src/orchestration/v2gps_kismet_wigle.sh` | `src/orchestration/v2gps_kismet_wigle.sh` | Enhanced version |
| `src/scripts/start_kismet.sh` | `src/scripts/start_kismet.sh` | Kismet launcher |
| `src/scripts/start_mediamtx.sh` | `src/scripts/start_mediamtx.sh` | Media server |

### Configuration Files

#### Docker Configurations
| Flask Path | Node.js Path | Purpose |
|------------|--------------|---------|
| `docker/config/settings.json` | `docker/config/settings.json` | OpenWebRX settings |
| `docker/config/sdrs.json` | `docker/config/sdrs.json` | SDR configurations |
| `docker/entrypoint-hackrf.sh` | `docker/entrypoint-hackrf.sh` | HackRF entrypoint |
| `docker/start-hackrf.sh` | `docker/start-hackrf.sh` | HackRF starter |

#### Service Configurations
| Flask Path | Node.js Path | Purpose |
|------------|--------------|---------|
| `systemd/hackrf-scanner.service` | `systemd/hackrf-scanner.service` | HackRF systemd service |
| `systemd/openwebrx-docker.service` | `systemd/openwebrx-docker.service` | OpenWebRX service |
| `systemd/openwebrx-landing.service` | `systemd/openwebrx-landing.service` | Landing page service |
| N/A | `systemd/spectrum-analyzer-optimized.service` | Optimized spectrum service |
| N/A | `systemd/wigle-to-tak-optimized.service` | Optimized WigleToTAK service |

### Log File Locations

| Purpose | Flask Path | Node.js Path |
|---------|------------|--------------|
| GPS/Kismet/Wigle orchestration | `/home/pi/tmp/gps_kismet_wigle.log` | `logs/gps_kismet_wigle.log` |
| Kismet debug logs | `/home/pi/kismet_ops/kismet_debug.log` | `data/kismet/kismet_debug.log` |
| WigleToTAK logs | `/home/pi/tmp/wigletotak.log` | `src/nodejs/wigle-to-tak/logs/wigle-to-tak.log` |
| Spectrum analyzer logs | N/A | `src/nodejs/kismet-operations/logs/spectrum-analyzer.log` |
| GPS bridge logs | N/A | `src/nodejs/gps-bridge/logs/gps-bridge.log` |
| Combined logs | N/A | `src/nodejs/logs/combined.log` |
| Error logs | N/A | `src/nodejs/logs/error.log` |

### PID File Locations

| Purpose | Flask Path | Node.js Path |
|---------|------------|--------------|
| Orchestration PIDs | `/home/pi/tmp/gps_kismet_wigle.pids` | `logs/gps_kismet_wigle.pids` |
| Kismet PID | `/home/pi/tmp/kismet.pid` | `data/kismet/kismet.pid` |
| WigleToTAK PID | `/home/pi/tmp/wigletotak.specific.pid` | `logs/wigletotak.specific.pid` |
| OpenWebRX PID | N/A | `dev/pids/openwebrx.pid` |
| Production monitoring | N/A | `tmp/production-monitoring.pid` |

### Data Directories

| Purpose | Flask Path | Node.js Path |
|---------|------------|--------------|
| Kismet data | `/home/pi/kismet_ops/` | `data/kismet/` |
| WigleCSV files | `/home/pi/kismet_ops/*.wiglecsv` | `data/kismet/*.wiglecsv` |
| Uploads | N/A | `src/nodejs/wigle-to-tak/uploads/` |

### Public/Static Assets

| Type | Flask Path | Node.js Path |
|------|------------|--------------|
| Spectrum CSS | Inline in template | `src/nodejs/kismet-operations/public/css/spectrum.css` |
| Spectrum JS | Inline in template | `src/nodejs/kismet-operations/public/js/spectrum.js` |
| WigleToTAK CSS | Inline in template | `src/nodejs/wigle-to-tak/public/css/wigle-to-tak.css` |
| WigleToTAK JS | Inline in template | `src/nodejs/wigle-to-tak/public/js/wigle-to-tak.js` |
| Kismet Ops CSS | N/A | `src/nodejs/kismet-operations/public/css/kismet-operations.css` |
| Kismet Ops JS | N/A | `src/nodejs/kismet-operations/public/js/kismet-operations.js` |

### Shared Components (Node.js Only)

| Component | Path | Purpose |
|-----------|------|---------|
| Logger | `src/nodejs/shared/logger.js` | Centralized logging |
| Constants | `src/nodejs/shared/constants.js` | Shared constants |
| Utils | `src/nodejs/shared/utils.js` | Utility functions |
| Middleware | `src/nodejs/shared/middleware/` | Express middleware |
| Config Utils | `src/nodejs/shared/utils/config.js` | Config helpers |

### Test Files

| Type | Flask Path | Node.js Path |
|------|------------|--------------|
| Unit tests | `tests/` | `src/nodejs/tests/unit/` |
| Integration tests | N/A | `src/nodejs/tests/integration/` |
| E2E tests | N/A | `src/nodejs/tests/e2e/` |
| API tests | N/A | `src/nodejs/tests/api-compatibility/` |
| Performance tests | N/A | `src/nodejs/tests/performance/` |

### Development Tools

| Tool | Flask Path | Node.js Path |
|------|------------|--------------|
| Dev setup | `dev/setup.sh` | `dev/setup.sh` |
| Component scripts | `dev/components/` | `dev/components/` |
| Health checks | `dev/tools/health-check.sh` | `dev/tools/health-check.sh` |
| Log viewer | `dev/tools/logview.sh` | `dev/tools/logview.sh` |
| Monitor | `dev/tools/monitor.sh` | `dev/tools/monitor.sh` |

### API Endpoints Migration

| Service | Flask Endpoint | Node.js Endpoint | Port |
|---------|---------------|------------------|------|
| WigleToTAK | `GET /` | `GET /` | 8000 |
| WigleToTAK | `POST /upload` | `POST /upload` | 8000 |
| WigleToTAK | `GET /status` | `GET /status` | 8000 |
| WigleToTAK | `POST /broadcast` | `POST /broadcast` | 8000 |
| Spectrum Analyzer | `GET /` | `GET /` | 8092 |
| Spectrum Analyzer | WebSocket `/` | WebSocket `/socket.io/` | 8092 |
| Kismet Operations | N/A | `GET /hi` | 3001 |
| Kismet Operations | N/A | `GET /api/status` | 3001 |
| Kismet Operations | N/A | `POST /api/script/:script` | 3001 |
| Kismet Operations | N/A | WebSocket `/webhook` | 3001 |

### Environment Variables

| Variable | Flask Usage | Node.js Usage |
|----------|-------------|---------------|
| `FLASK_PORT` | WigleToTAK port | N/A |
| `PORT` | N/A | Service port override |
| `NODE_ENV` | N/A | Production/development mode |
| `LOG_LEVEL` | N/A | Logging verbosity |

### Key Differences

1. **Module System**: Flask uses Python packages with `__init__.py`, Node.js uses CommonJS modules
2. **Dependencies**: Flask uses `requirements.txt` and `venv/`, Node.js uses `package.json` and `node_modules/`
3. **Web Framework**: Flask vs Express.js
4. **WebSocket**: Flask-SocketIO vs Socket.io
5. **Process Management**: Python subprocess vs Node.js child_process
6. **Logging**: Python logging module vs Winston logger
7. **Configuration**: Python config.py vs JavaScript config modules

### Migration Notes

- All Python virtual environments (`venv/`) are replaced with `node_modules/`
- Flask templates are moved to `views/` directories in Node.js
- Static assets are organized under `public/` directories
- Shared functionality is centralized in `src/nodejs/shared/`
- New features like Kismet Operations Center are only in Node.js version
- Log files are more centralized in Node.js implementation
- PID management remains similar but with some path changes