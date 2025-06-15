# NEXT SESSION HANDOFF PROMPT

## Session Resume Context
- **User**: Christian
- **Connection**: SSH from Mac to Raspberry Pi
- **Working Directory**: `/home/pi/projects/stinkster`
- **Project**: Stinkster - Raspberry Pi SDR/WiFi/GPS/TAK integration system
- **Last Session**: 2025-06-15
- **Status**: Ready for GitHub preparation and file sanitization

## Current Status

### Completed in Previous Session
1. ✅ Created comprehensive project documentation structure
2. ✅ Analyzed and documented all configuration templates  
3. ✅ Created security audit documentation
4. ✅ Prepared systemd service files
5. ✅ Created backup and restoration scripts
6. ✅ Documented all dependencies and system requirements
7. ✅ Created backup infrastructure with versioning

### Connection Setup Commands

```bash
# Verify SSH connection to Pi
ssh pi@[PI_IP_ADDRESS]

# Navigate to project directory
cd /home/pi/projects/stinkster

# Verify current state
pwd && ls -la
```

## Immediate Next Steps (Priority Order)

### 1. Verify Current State
```bash
# Check current directory and files
pwd  # Should be /home/pi/projects/stinkster
ls -la

# Check git status
git status 2>/dev/null || echo "Git not initialized"

# Check backup integrity
ls -lh *.tar.gz
ls -la backups/
```

### 2. Initialize Git Repository
```bash
# Initialize git if not done
git init

# Check if remote already exists
git remote -v
```

### 3. Create Essential .gitignore
```bash
cat > .gitignore << 'EOF'
# Environment files (sensitive data)
*.env
.env.*
config.json
docker-compose.yml

# Backup files
*.backup
*.bak
*~

# Python virtual environments
__pycache__/
*.py[cod]
*$py.class
venv/
.venv/

# Logs and temporary files
*.log
logs/
tmp/
temp/

# Docker volumes and large files
docker-volumes/
*.tar.gz
*.zip

# System files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Keep templates - these are safe to commit
!*.template
!*.template.*
EOF
```

### 4. Sanitize Configuration Files

**Critical**: These files need sensitive data removed before GitHub upload:

```bash
# Backup any existing config files before sanitization
find . -name "*.json" -not -name "*.template.json" -exec cp {} {}.backup \;
find . -name "*.yml" -not -name "*.template.yml" -exec cp {} {}.backup \;
find . -name "*.conf" -not -name "*.template.conf" -exec cp {} {}.backup \;
```

**Files requiring sanitization:**

1. **docker-compose.yml** - Replace passwords, API keys, hostnames
   ```bash
   # Check for sensitive data
   grep -i "password\|key\|token\|secret" docker-compose.yml
   # Replace with placeholders like ${PASSWORD}, ${API_KEY}
   ```

2. **JSON config files** - Replace IPs, keys, credentials
   ```bash
   # Check all JSON files for sensitive data
   find . -name "*.json" -not -name "*.template.json" -exec grep -l "192.168\|10\.\|172\.\|password\|key\|token" {} \;
   ```

3. **Any .env files** - Should not exist or should be in .gitignore
   ```bash
   find . -name "*.env" -type f
   ```

### 5. Stage Files for GitHub
```bash
# Stage documentation (safe to commit)
git add *.md
git add systemd/
git add requirements.txt
git add install.sh
git add *.sh
git add .gitignore

# Stage templates only (not actual configs)
git add *.template
git add *.template.*

# Verify what's staged
git status
git diff --staged --name-only
```

### 6. Create Initial Commit
```bash
# Verify no sensitive data in staged files
git diff --staged | grep -E "(password|key|token|secret|192\.168|10\.|172\.)" -i

# Create initial commit
git commit -m "Initial commit: Stinkster project documentation and infrastructure

- Complete documentation for Raspberry Pi SDR/WiFi/GPS/TAK system
- Installation scripts and system dependencies
- Docker configuration templates
- Systemd service definitions
- Security audit and backup procedures
- Configuration templates (sanitized)"
```

## Files Status Check

### Safe to Commit (Already Sanitized)
- [x] All `.md` documentation files
- [x] All `.template` files
- [x] `requirements.txt`
- [x] `install.sh` and shell scripts
- [x] `systemd/` directory contents
- [x] `.gitignore`

### Must Be Sanitized Before Commit
- [ ] `docker-compose.yml` - Check for passwords, API keys, hostnames
- [ ] `*.json` files (non-template) - Replace actual IPs, credentials
- [ ] Any `.conf` files with actual hostnames/IPs

### Should Never Be Committed
- [ ] `.env` files
- [ ] `*.backup` files
- [ ] Log files
- [ ] Docker backup archives (`*.tar.gz`)

## Verification Commands

```bash
# Check for sensitive patterns in staged files
git diff --staged | grep -E "(password|key|token|secret)" -i

# Check file sizes (avoid committing large files)
find . -type f -size +1M -name "*" -not -path "./backups/*" -not -name "*.tar.gz"

# Verify templates exist for all configs
ls -la *.template*

# Check current backup status
ls -lh backups/2025-06-15_v1/
cat backups/backup_log.txt | tail -5
```

## Backup Location and Verification

### Current Backups
- **Location**: `/home/pi/projects/stinkster/backups/2025-06-15_v1/`
- **Docker Image**: `openwebrx-hackrf-working.tar.gz` (~1.8GB)
- **Backup Log**: `backups/backup_log.txt`

### Verification Steps
```bash
# Verify main backup exists and is recent
ls -lh backups/2025-06-15_v1/backup_info.txt
cat backups/2025-06-15_v1/backup_info.txt

# Check Docker backup integrity
ls -lh openwebrx-hackrf-working.tar.gz
ls -lh docker-backup/openwebrx-hackrf-working_20250609.tar.gz

# Verify all documentation is backed up
diff -r . backups/2025-06-15_v1/ --exclude=backups | head -10
```

## GitHub Preparation Workflow

### 1. Repository Creation Questions for Christian
- Repository name: `stinkster` or `rpi-sdr-tak-system`?
- Visibility: Public or Private?
- Description: "Raspberry Pi system integrating HackRF SDR, WiFi scanning, GPS, and TAK"

### 2. Push to GitHub Commands
```bash
# Add remote (replace USERNAME with Christian's GitHub username)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Set main branch and push
git branch -M main
git push -u origin main
```

### 3. Post-Push Verification
```bash
# Verify remote tracking
git remote -v
git branch -vv

# Check what was actually uploaded
git ls-files | wc -l
git log --oneline
```

## Key Reminders

1. **User Identity**: Christian
2. **Connection**: SSH from Mac to Pi
3. **No Sensitive Data**: All templates should use placeholders
4. **Backup Integrity**: Original system remains untouched
5. **Documentation Complete**: All major components documented
6. **Size Management**: GitHub repo should be <50MB
7. **Template System**: All configs use `.template` pattern

## Emergency Commands

If something goes wrong:
```bash
# Restore from backup
cp backups/2025-06-15_v1/* . -r

# Reset git if needed
rm -rf .git && git init

# Check original system integrity
ls -la /home/pi/stinky/
systemctl status gpsd kismet
```

## Questions to Ask Christian

1. Preferred GitHub repository name?
2. Public or private repository?
3. GitHub username for remote URL?
4. Any specific sensitive data patterns to watch for?
5. Preferred placeholder format (${VAR} vs PLACEHOLDER)?

---

**Session Context**: This handoff was created after extensive documentation and backup work. The project is ready for final sanitization and GitHub upload. All documentation is complete and the original operational system remains intact.