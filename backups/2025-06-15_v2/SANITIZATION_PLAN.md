# SANITIZATION PLAN
**Project**: Stinkster SDR System  
**Date**: 2025-06-15  
**Purpose**: Remove hardcoded credentials and values, implement proper environment variable substitution

## CRITICAL SECURITY ISSUES IDENTIFIED

### 1. Hardcoded Admin Credentials
**Risk**: High - Default credentials exposed in multiple files
**Files Affected**: 
- `docker-compose.yml` (lines 37-38)
- `start-openwebrx.sh` (lines 62-63, 75-76)
- `openwebrx-tools.sh` (lines 48-49)

### 2. Hardcoded File Paths
**Risk**: Medium - Reduces portability and breaks in different environments
**Files Affected**: Multiple scripts with `/home/pi` paths

### 3. Hardcoded Network Configuration
**Risk**: Medium - Prevents customization for different network setups
**Files Affected**: `docker-compose.yml`, various scripts

## DETAILED SANITIZATION STEPS

### STEP 1: Replace docker-compose.yml with Template Version
**Target File**: `/home/pi/projects/stinkster/docker-compose.yml`

**Current Hardcoded Values to Replace**:
```yaml
# Line 10: restart: unless-stopped
restart: ${DOCKER_RESTART_POLICY:-unless-stopped}

# Line 14: - "8073:8073"
- "${OPENWEBRX_PORT:-8073}:8073"

# Line 37: - OPENWEBRX_ADMIN_USER=admin
- OPENWEBRX_ADMIN_USER=${OPENWEBRX_ADMIN_USER:-admin}

# Line 38: - OPENWEBRX_ADMIN_PASSWORD=hackrf
- OPENWEBRX_ADMIN_PASSWORD=${OPENWEBRX_ADMIN_PASSWORD}

# Line 40: - OPENWEBRX_TITLE=Stinkster SDR
- OPENWEBRX_TITLE=${OPENWEBRX_TITLE:-Stinkster SDR}

# Line 41: - OPENWEBRX_LOCATION=Raspberry Pi
- OPENWEBRX_LOCATION=${OPENWEBRX_LOCATION:-Raspberry Pi}

# Line 43: - OPENWEBRX_DEBUG=false
- OPENWEBRX_DEBUG=${OPENWEBRX_DEBUG:-false}

# Line 72: name: stinkster-net
name: ${DOCKER_COMPOSE_PROJECT_NAME:-stinkster}-net
```

**Action**: Replace entire file with template version that already has correct variable substitutions

### STEP 2: Update load_config.sh with Additional Environment Variables
**Target File**: `/home/pi/projects/stinkster/load_config.sh`

**New Variables to Add** (after line 50):
```bash
# OpenWebRX Configuration
export OPENWEBRX_ADMIN_USER="${OPENWEBRX_ADMIN_USER:-admin}"
export OPENWEBRX_ADMIN_PASSWORD="${OPENWEBRX_ADMIN_PASSWORD:-CHANGE_ME}"
export OPENWEBRX_TITLE="${OPENWEBRX_TITLE:-Stinkster SDR}"
export OPENWEBRX_LOCATION="${OPENWEBRX_LOCATION:-Raspberry Pi}"
export OPENWEBRX_DEBUG="${OPENWEBRX_DEBUG:-false}"
export OPENWEBRX_PORT="${OPENWEBRX_PORT:-8073}"

# Docker Configuration
export DOCKER_COMPOSE_PROJECT_NAME="${DOCKER_COMPOSE_PROJECT_NAME:-stinkster}"
export DOCKER_RESTART_POLICY="${DOCKER_RESTART_POLICY:-unless-stopped}"

# Project Paths (make configurable)
export PROJECT_ROOT="${PROJECT_ROOT:-/home/pi/projects/stinkster}"
export BACKUP_DIR="${BACKUP_DIR:-/home/pi/backups}"

# Flask Applications
export FLASK_SECRET_KEY="${FLASK_SECRET_KEY:-$(openssl rand -hex 32)}"
export API_KEY="${API_KEY:-$(openssl rand -hex 16)}"
```

**Update print_config() function** (after line 61):
```bash
print_config() {
    echo "=== Stinkster Configuration ==="
    echo "Project Root: $PROJECT_ROOT"
    echo "Kismet API: $KISMET_API_URL"
    echo "TAK Server: $TAK_SERVER_IP:$TAK_SERVER_PORT"
    echo "OpenWebRX Port: $OPENWEBRX_PORT"
    echo "OpenWebRX Admin: $OPENWEBRX_ADMIN_USER"
    echo "Network Interface: $NETWORK_INTERFACE"
    echo "Log Directory: $LOG_DIR"
    echo "PID Directory: $PID_DIR"
    echo "Debug Mode: $DEBUG"
    echo "=============================="
}
```

### STEP 3: Sanitize start-openwebrx.sh
**Target File**: `/home/pi/projects/stinkster/start-openwebrx.sh`

**Add to top of file** (after line 7):
```bash
# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_config.sh"
```

**Replace hardcoded values**:
```bash
# Line 43: /home/pi/projects/stinkster/rebuild-openwebrx-docker.sh
"$PROJECT_ROOT/rebuild-openwebrx-docker.sh"

# Line 48: cd /home/pi/projects/stinkster
cd "$PROJECT_ROOT"

# Lines 62-63: Remove hardcoded credentials
-e OPENWEBRX_ADMIN_USER="$OPENWEBRX_ADMIN_USER" \
-e OPENWEBRX_ADMIN_PASSWORD="$OPENWEBRX_ADMIN_PASSWORD" \

# Line 57: -p 8073:8073
-p "$OPENWEBRX_PORT:8073" \

# Lines 75-76: Remove hardcoded credential display
echo -e "  Username: $OPENWEBRX_ADMIN_USER"
echo -e "  Password: [CONFIGURED]"
```

### STEP 4: Sanitize openwebrx-tools.sh
**Target File**: `/home/pi/projects/stinkster/openwebrx-tools.sh`

**Add to top of file** (after line 11):
```bash
# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/load_config.sh"
```

**Replace hardcoded values**:
```bash
# Line 47: echo "URL: http://$IP:8073"
echo "URL: http://$IP:$OPENWEBRX_PORT"

# Lines 48-49: Remove hardcoded credential display
echo "Username: $OPENWEBRX_ADMIN_USER"
echo "Password: [CONFIGURED]"

# Line 81: if [ -f "/home/pi/openwebrx-hackrf-config.json" ]; then
if [ -f "$PROJECT_ROOT/openwebrx-hackrf-config.json" ]; then

# Line 82: CONFIG_FILE="/home/pi/openwebrx-hackrf-config.json"
CONFIG_FILE="$PROJECT_ROOT/openwebrx-hackrf-config.json"

# Line 83: elif [ -f "/home/pi/projects/stinkster/openwebrx-hackrf-config.json" ]; then
elif [ -f "$PROJECT_ROOT/openwebrx-hackrf-config.json" ]; then

# Line 84: CONFIG_FILE="/home/pi/projects/stinkster/openwebrx-hackrf-config.json"
CONFIG_FILE="$PROJECT_ROOT/openwebrx-hackrf-config.json"

# Line 119: BACKUP_DIR="/home/pi/projects/stinkster/docker-backup"
BACKUP_DIR="$PROJECT_ROOT/docker-backup"

# Line 148: BACKUP_DIR="/home/pi/projects/stinkster/docker-backup"
BACKUP_DIR="$PROJECT_ROOT/docker-backup"

# Line 202: cd /home/pi/projects/stinkster && docker-compose up -d
cd "$PROJECT_ROOT" && docker-compose up -d

# Line 258: cd /home/pi/projects/stinkster && docker-compose up -d
cd "$PROJECT_ROOT" && docker-compose up -d

# Line 265: /home/pi/projects/stinkster/rebuild-openwebrx-docker.sh
"$PROJECT_ROOT/rebuild-openwebrx-docker.sh"
```

### STEP 5: Create Secure .env File
**Target File**: `/home/pi/projects/stinkster/.env`

**Action**: Copy template and populate with secure values
```bash
# Copy template
cp /home/pi/projects/stinkster/config.template.env /home/pi/projects/stinkster/.env

# Generate secure passwords
SECURE_PASSWORD=$(openssl rand -base64 32)
FLASK_SECRET=$(openssl rand -hex 32)
API_KEY=$(openssl rand -hex 16)

# Update .env with generated values
sed -i "s/CHANGE_ME_SECURE_PASSWORD/$SECURE_PASSWORD/" /home/pi/projects/stinkster/.env
sed -i "s/GENERATE_A_RANDOM_SECRET_KEY_HERE/$FLASK_SECRET/" /home/pi/projects/stinkster/.env
sed -i "s/YOUR_API_KEY_FOR_WEBHOOKS/$API_KEY/" /home/pi/projects/stinkster/.env
```

### STEP 6: Additional Scripts to Sanitize
**Files requiring similar treatment**:
- `rebuild-openwebrx-docker.sh` - Replace hardcoded paths
- `system-dependencies.sh` - Replace hardcoded paths  
- `setup-configs.sh` - Replace hardcoded paths
- `create_backup.sh` - Replace hardcoded paths

**Pattern for each script**:
1. Add configuration loading at top
2. Replace `/home/pi/projects/stinkster` with `$PROJECT_ROOT`
3. Replace hardcoded ports with variables
4. Replace hardcoded credentials with variables

## VERIFICATION STEPS

### STEP 1: Test Configuration Loading
```bash
# Test load_config.sh
source /home/pi/projects/stinkster/load_config.sh
echo "Project Root: $PROJECT_ROOT"
echo "OpenWebRX Port: $OPENWEBRX_PORT"
echo "Admin User: $OPENWEBRX_ADMIN_USER"
```

### STEP 2: Test Docker Compose
```bash
# Verify variable substitution
cd /home/pi/projects/stinkster
docker-compose config

# Check for any remaining hardcoded values
docker-compose config | grep -E "(admin|hackrf|8073|/home/pi)"
```

### STEP 3: Test Container Startup
```bash
# Start with new configuration
cd /home/pi/projects/stinkster
docker-compose up -d

# Verify environment variables are set correctly
docker exec openwebrx env | grep OPENWEBRX
```

### STEP 4: Test Script Functionality
```bash
# Test start script
/home/pi/projects/stinkster/start-openwebrx.sh

# Test tools script
/home/pi/projects/stinkster/openwebrx-tools.sh
```

### STEP 5: Security Validation
```bash
# Check that no hardcoded credentials remain
grep -r "hackrf" /home/pi/projects/stinkster/*.sh
grep -r "admin.*password" /home/pi/projects/stinkster/*.sh
grep -r "password.*admin" /home/pi/projects/stinkster/*.sh

# Verify .env is properly protected
ls -la /home/pi/projects/stinkster/.env
```

## ROLLBACK PROCEDURE

### If Issues Occur:
1. **Restore from backup**:
   ```bash
   cd /home/pi/projects/stinkster
   git checkout HEAD -- docker-compose.yml
   ```

2. **Use working backups**:
   ```bash
   cp /home/pi/projects/stinkster/backups/2025-06-15_v1/docker-compose.yml ./
   ```

3. **Emergency container start**:
   ```bash
   docker run -d --name openwebrx-emergency -p 8073:8073 \
     -e OPENWEBRX_ADMIN_USER=admin \
     -e OPENWEBRX_ADMIN_PASSWORD=hackrf \
     --privileged openwebrx-hackrf:latest
   ```

## SECURITY IMPROVEMENTS ACHIEVED

1. **Eliminated hardcoded credentials** - All passwords now configurable
2. **Environment-based configuration** - Supports different deployment environments  
3. **Proper secret management** - Sensitive values in .env file (excluded from git)
4. **Improved portability** - No hardcoded paths, configurable for any user
5. **Enhanced security** - Generated secure passwords, proper secret handling

## FILES MODIFIED SUMMARY

| File | Changes | Risk Level |
|------|---------|------------|
| `docker-compose.yml` | Replace with template version | High |
| `load_config.sh` | Add OpenWebRX variables | Low |
| `start-openwebrx.sh` | Remove hardcoded credentials | Medium |
| `openwebrx-tools.sh` | Remove hardcoded paths/credentials | Medium |
| `.env` | Create from template | Low |

## NEXT SESSION CHECKLIST

- [ ] Replace docker-compose.yml with template version
- [ ] Update load_config.sh with new environment variables  
- [ ] Sanitize start-openwebrx.sh hardcoded values
- [ ] Sanitize openwebrx-tools.sh hardcoded values
- [ ] Create secure .env file with generated passwords
- [ ] Test all scripts for functionality
- [ ] Verify no hardcoded credentials remain
- [ ] Update additional scripts as needed
- [ ] Document any issues encountered
- [ ] Create post-sanitization backup

## COMPLETION CRITERIA

✅ **All hardcoded credentials removed**  
✅ **All hardcoded paths replaced with variables**  
✅ **Secure .env file created and protected**  
✅ **All scripts tested and functional**  
✅ **No security vulnerabilities remain**  
✅ **System maintains full functionality**  
✅ **Configuration properly documented**