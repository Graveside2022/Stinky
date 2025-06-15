# Stinkster Project Directory Structure Plan

This document outlines the recommended directory structure for organizing all stinkster components on GitHub.

## Proposed Directory Structure

```
stinkster/
├── README.md                    # Main project documentation
├── LICENSE                      # Project license
├── .gitignore                   # Git ignore rules
├── requirements.txt             # Global Python dependencies
├── install.sh                   # Master installation script
├── docker-compose.yml           # Docker services orchestration
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture overview
│   ├── DEPENDENCIES.md          # System dependencies
│   ├── RESTORE_README.md        # Restoration guide
│   ├── HACKRF_DOCKER_SETUP.md   # HackRF Docker setup
│   ├── OPENWEBRX_SETUP.md       # OpenWebRX setup
│   └── config_backup_guide.md   # Configuration backup guide
│
├── scripts/                     # Utility and setup scripts
│   ├── setup/                   # Installation scripts
│   │   ├── system-dependencies.sh
│   │   ├── build-openwebrx.sh
│   │   └── rebuild-openwebrx-docker.sh
│   ├── backup/                  # Backup and restore scripts
│   │   ├── create_backup.sh
│   │   ├── restore-openwebrx.sh
│   │   ├── backup_exclusions.txt
│   │   └── analyze_venvs.py
│   ├── start/                   # Service startup scripts
│   │   ├── start-openwebrx.sh
│   │   ├── start_kismet.sh
│   │   └── gps_kismet_wigle.sh
│   └── test/                    # Testing scripts
│       ├── test-restore-script.sh
│       ├── test-hackrf.sh
│       └── test-hackrf-reception.sh
│
├── config/                      # Configuration files
│   ├── openwebrx/              # OpenWebRX configs
│   │   ├── sdrs.json
│   │   ├── settings.json
│   │   └── bands.json
│   ├── kismet/                 # Kismet configs
│   │   └── kismet.conf
│   └── hackrf/                 # HackRF configs
│       └── config.json
│
├── services/                    # Service components
│   ├── gps/                    # GPS services
│   │   ├── mavgps.py
│   │   ├── requirements.txt
│   │   └── README.md
│   ├── kismet/                 # WiFi scanning
│   │   ├── start_kismet.sh
│   │   └── README.md
│   ├── wigletotak/             # WigleToTAK converter
│   │   ├── WigleToTak2.py
│   │   ├── requirements.txt
│   │   ├── templates/
│   │   ├── static/
│   │   └── README.md
│   ├── hackrf/                 # HackRF tools
│   │   ├── spectrum_analyzer.py
│   │   ├── requirements.txt
│   │   ├── templates/
│   │   ├── static/
│   │   └── README.md
│   └── openwebrx/              # OpenWebRX Docker
│       ├── Dockerfile
│       ├── docker-compose.yml
│       └── openwebrx-tools.sh
│
├── web/                        # Web interfaces
│   ├── landing/                # Landing page
│   │   ├── landing-server.py
│   │   ├── templates/
│   │   └── static/
│   └── webhook/                # Webhook integration
│       └── webhook.py
│
├── data/                       # Data directories (gitignored)
│   ├── kismet/                 # Kismet captures
│   ├── logs/                   # Application logs
│   └── tmp/                    # Temporary files
│
├── docker/                     # Docker-related files
│   ├── openwebrx/             # OpenWebRX Docker backup
│   │   └── openwebrx-hackrf-working.tar.gz
│   └── backups/               # Docker backups
│
└── tests/                      # Test files
    ├── test_gps.py
    ├── test_kismet.py
    └── test_hackrf.py
```

## File Mapping from Current Structure

### Documentation Files
- `DEPENDENCIES.md` → `docs/DEPENDENCIES.md`
- `RESTORE_README.md` → `docs/RESTORE_README.md`
- `HACKRF_DOCKER_SETUP.md` → `docs/HACKRF_DOCKER_SETUP.md`
- `OPENWEBRX_SETUP.md` → `docs/OPENWEBRX_SETUP.md`
- `config_backup_guide.md` → `docs/config_backup_guide.md`

### Scripts
- `system-dependencies.sh` → `scripts/setup/system-dependencies.sh`
- `build-openwebrx.sh` → `scripts/setup/build-openwebrx.sh`
- `rebuild-openwebrx-docker.sh` → `scripts/setup/rebuild-openwebrx-docker.sh`
- `create_backup.sh` → `scripts/backup/create_backup.sh`
- `restore-openwebrx.sh` → `scripts/backup/restore-openwebrx.sh`
- `analyze_venvs.py` → `scripts/backup/analyze_venvs.py`
- `backup_exclusions.txt` → `scripts/backup/backup_exclusions.txt`
- `start-openwebrx.sh` → `scripts/start/start-openwebrx.sh`
- `test-restore-script.sh` → `scripts/test/test-restore-script.sh`
- `openwebrx-tools.sh` → `services/openwebrx/openwebrx-tools.sh`

### Configuration Files
- `openwebrx-sdrs.json` → `config/openwebrx/sdrs.json`

### Docker Files
- `docker-compose.yml` → `docker-compose.yml` (root level)
- `Dockerfile` → `services/openwebrx/Dockerfile`
- `openwebrx-hackrf-working.tar.gz` → `docker/openwebrx/openwebrx-hackrf-working.tar.gz`

### Current Service Component Locations
- External GPSmav: `/home/pi/gpsmav/GPSmav/` (maintains existing structure)
- External WigleToTAK: `/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK/` (maintains existing structure)
- External HackRF: `/home/pi/HackRF/` (maintains existing structure)
- Project orchestration: `src/orchestration/` (within stinkster project)
- Project scripts: `src/scripts/` (within stinkster project)

### Environment Variable Integration
The system uses environment variables to support both current structure and future reorganization:
- `GPSMAV_DIR`: Default `/home/pi/gpsmav/GPSmav`
- `WIGLETOTAK_DIR`: Default `/home/pi/WigletoTAK/WigleToTAK/TheStinkToTAK`
- `HACKRF_DIR`: Default `/home/pi/HackRF`
- `STINKSTER_ROOT`: Project root directory
- `LOG_DIR`: Logs directory within project
- `KISMET_DATA_DIR`: Kismet data directory within project

## Key Principles

1. **Separation of Concerns**: Each service has its own directory with its requirements.txt
2. **Documentation**: All docs in one place for easy reference
3. **Scripts Organization**: Scripts grouped by function (setup, backup, start, test)
4. **Configuration Management**: All configs in a central location
5. **Docker Isolation**: Docker-related files have their own space
6. **Data Exclusion**: Data directories are gitignored but structure is documented
7. **Web Interfaces**: Separate directory for web components
8. **Testing**: Dedicated test directory for unit and integration tests

## .gitignore Recommendations

```gitignore
# Data directories
data/
*.log
*.pid
*.sqlite
*.kismet
*.wiglecsv

# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.env

# Docker
*.tar.gz
docker/backups/

# OS
.DS_Store
Thumbs.db

# Sensitive
*.key
*.pem
secrets/
credentials.json

# Large files
*.pcap
*.dump
```

## Migration Steps

1. Create the new directory structure
2. Move files according to the mapping
3. Update all script paths and imports
4. Update documentation with new paths
5. Test all components
6. Create comprehensive README.md
7. Add .gitignore
8. Initialize git repository
9. Push to GitHub

This structure provides clear organization, easy navigation, and proper separation of different components while maintaining the relationships between them.