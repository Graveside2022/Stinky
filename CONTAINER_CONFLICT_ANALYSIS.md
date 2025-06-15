# Container Conflict Analysis Report

## Summary
Analysis of container naming conflicts between `install.sh` and `rebuild-openwebrx-docker.sh` scripts.

## Container Names Used

### install.sh
- **Container Name**: `openwebrx`
- **Image**: `jketterl/openwebrx:latest`
- **Location**: `/home/pi/openwebrx/` (INSTALL_BASE)
- **Volumes**: Simple bind mount (`./config:/var/lib/openwebrx`)

### rebuild-openwebrx-docker.sh
- **Container Name**: `openwebrx` (SAME NAME - CONFLICT DETECTED)
- **Image**: `openwebrx-hackrf:latest` (custom built image)
- **Location**: Script directory (typically project root)
- **Volumes**: Named volumes (`openwebrx-settings`, `openwebrx-config`)

## Conflict Analysis

### 🔴 CRITICAL CONFLICTS IDENTIFIED:

1. **Container Name Collision**
   - Both scripts use identical container name: `openwebrx`
   - Docker cannot run two containers with the same name simultaneously
   - The rebuild script will stop/remove the install.sh container

2. **Different Volume Strategies**
   - `install.sh`: Uses bind mount (`./config:/var/lib/openwebrx`)
   - `rebuild-openwebrx-docker.sh`: Uses named volumes (`openwebrx-settings`, `openwebrx-config`)
   - Data persistence strategy conflicts

3. **Different Images**
   - `install.sh`: Uses official `jketterl/openwebrx:latest`
   - `rebuild-openwebrx-docker.sh`: Builds custom `openwebrx-hackrf:latest`
   - Configuration and capabilities differ

4. **Working Directory Conflicts**
   - `install.sh`: Operates from `/home/pi/openwebrx/`
   - `rebuild-openwebrx-docker.sh`: Operates from script directory
   - Docker-compose files in different locations

## Replacement Behavior Analysis

### When rebuild-openwebrx-docker.sh runs:
1. **Stops existing container**: `docker stop openwebrx` ✅
2. **Removes existing container**: `docker rm openwebrx` ✅
3. **Backs up named volumes**: Only if they exist (they won't from install.sh)
4. **Removes old images**: Removes both official and custom images
5. **Creates new container**: With same name but different configuration

### Data Loss Risk:
- ⚠️ **HIGH RISK**: Install.sh bind-mounted data is NOT backed up by rebuild script
- ⚠️ **MEDIUM RISK**: Configuration changes from install.sh setup are lost
- ⚠️ **LOW RISK**: Named volumes from rebuild script are properly backed up

## Recommendations

### 1. Immediate Fix - Rename Containers
```bash
# In install.sh (line 501):
container_name: openwebrx-basic

# In rebuild-openwebrx-docker.sh (line 225):
container_name: openwebrx-hackrf
```

### 2. Add Conflict Detection
Add this to rebuild script before stopping containers:
```bash
# Check for existing install.sh container
if docker ps -a --format '{{.Names}}' | grep -q "^openwebrx$"; then
    echo "WARNING: Found existing openwebrx container from install.sh"
    echo "This will replace the basic installation with HackRF-optimized version"
    read -p "Continue? (y/n) " -n 1 -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
```

### 3. Data Migration Strategy
Add backup for install.sh bind mounts:
```bash
# Backup install.sh configuration
if [ -d "/home/pi/openwebrx/config" ]; then
    echo "Backing up install.sh configuration..."
    cp -r /home/pi/openwebrx/config ${BACKUP_DIR}/install-config-${TIMESTAMP}/
fi
```

### 4. Service Conflict Resolution
Both scripts may create conflicting systemd services:
- `install.sh`: Creates `stinkster.service` (includes OpenWebRX startup)
- `rebuild-openwebrx-docker.sh`: Creates `openwebrx-docker.service`

## Current State Assessment

Based on the analysis:
1. **The rebuild script DOES properly replace the install.sh container**
2. **Container naming conflict exists but is handled by stop/remove**
3. **Data loss risk exists for install.sh configurations**
4. **No persistent conflict after rebuild completes**

## Compatibility Matrix

| Scenario | Install.sh First | Rebuild First | Both Run |
|----------|------------------|---------------|----------|
| Result | Rebuild replaces | Works normally | Last wins |
| Data Loss | Yes (bind mounts) | No | Depends on order |
| Functionality | Upgrade to HackRF | Full HackRF support | Unpredictable |

## Conclusion

**The scripts have container name conflicts but the rebuild script properly handles replacement.** However, data loss and configuration conflicts are possible. The rebuild script should be enhanced with better conflict detection and data migration capabilities.

## Action Items

1. ✅ **Verified**: Rebuild script stops and removes install.sh container
2. ⚠️ **Risk**: Install.sh bind-mounted data not backed up
3. 🔧 **Recommend**: Add container name differentiation
4. 🔧 **Recommend**: Add configuration migration logic
5. 📋 **Document**: User should choose one approach, not both