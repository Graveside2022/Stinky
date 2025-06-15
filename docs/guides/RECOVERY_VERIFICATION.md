# Recovery Verification Checklist

This document provides step-by-step verification commands to ensure successful session recovery and readiness for git sanitization.

## 1. Verify Backup Integrity

### Check backup files exist
```bash
# List all backup archives
ls -la /home/pi/projects/stinkster/docker-backup/
ls -la /home/pi/projects/stinkster/*.tar.gz

# Expected output should show:
# - openwebrx-hackrf-working_20250609.tar.gz
# - openwebrx-hackrf-working.tar.gz
```

### Verify backup archive integrity
```bash
# Test archive integrity without extracting
tar -tzf /home/pi/projects/stinkster/openwebrx-hackrf-working.tar.gz > /dev/null && echo "✓ Backup archive is valid" || echo "✗ Backup archive is corrupted"

# Check archive size (should be non-zero)
stat -c "%s bytes" /home/pi/projects/stinkster/openwebrx-hackrf-working.tar.gz
```

## 2. Verify Current Working Directory

### Confirm we're in the correct project directory
```bash
# Check current directory
pwd
# Expected: /home/pi/projects/stinkster

# Verify directory ownership
ls -ld /home/pi/projects/stinkster
# Expected: drwxr-xr-x ... pi pi ...
```

## 3. Check File Permissions and Ownership

### Verify script permissions
```bash
# Check executable scripts have correct permissions
for script in *.sh stinkster; do
    if [ -f "$script" ]; then
        ls -l "$script" | grep -q "^-rwxr-xr-x.*pi.*pi" && echo "✓ $script" || echo "✗ $script - incorrect permissions"
    fi
done

# Fix permissions if needed (uncomment to run)
# chmod +x *.sh stinkster
# chown pi:pi *
```

### Verify Python script permissions
```bash
# Python scripts should be readable but not necessarily executable
find . -name "*.py" -type f -exec ls -l {} \; | grep -q "pi.*pi" && echo "✓ Python files owned by pi" || echo "✗ Python files have incorrect ownership"
```

## 4. Verify No Git Repository Exists

### Confirm clean state for git initialization
```bash
# Check for existing git directory
[ -d .git ] && echo "✗ Git repository already exists!" || echo "✓ No git repository found"

# Check for any git-related files
ls -la .git* 2>/dev/null && echo "✗ Git files found" || echo "✓ No git files present"

# Verify no .gitignore exists yet
[ -f .gitignore ] && echo "✗ .gitignore already exists" || echo "✓ No .gitignore found"
```

## 5. Verify Critical Files State

### Check essential configuration templates
```bash
# Verify all template files exist
echo "Checking configuration templates..."
templates=(
    "config.json.template"
    "config.template.env"
    "docker-compose.template.yml"
    "gpsmav-config.template.json"
    "kismet-config.template.conf"
    "service-orchestration.template.conf"
    "spectrum-analyzer-config.template.json"
    "webhook-config.template.json"
    "wigletotak-config.template.json"
)

for template in "${templates[@]}"; do
    [ -f "$template" ] && echo "✓ $template" || echo "✗ $template missing"
done
```

### Check documentation files
```bash
# Verify documentation exists
echo -e "\nChecking documentation files..."
docs=(
    "README_TEMPLATES.md"
    "CONFIGURATION.md"
    "DEPENDENCIES.md"
    "DIRECTORY_STRUCTURE.md"
    "TODO.md"
    "HANDOFF_SUMMARY.md"
    "SESSION_LOG_2025-06-15.md"
)

for doc in "${docs[@]}"; do
    [ -f "$doc" ] && echo "✓ $doc" || echo "✗ $doc missing"
done
```

### Verify systemd service files
```bash
# Check systemd directory structure
echo -e "\nChecking systemd files..."
[ -d "systemd" ] && echo "✓ systemd directory exists" || echo "✗ systemd directory missing"
[ -f "systemd/README.md" ] && echo "✓ systemd/README.md" || echo "✗ systemd/README.md missing"
[ -f "systemd/install.sh" ] && echo "✓ systemd/install.sh" || echo "✗ systemd/install.sh missing"
```

## 6. Quick System Tests

### Test Python environment
```bash
# Check Python version
python3 --version
# Expected: Python 3.x.x

# Test virtual environment creation capability
python3 -m venv test_venv && echo "✓ Can create virtual environments" || echo "✗ Virtual environment creation failed"
rm -rf test_venv
```

### Test Docker availability
```bash
# Check Docker is installed and running
docker --version && echo "✓ Docker installed" || echo "✗ Docker not found"
docker ps > /dev/null 2>&1 && echo "✓ Docker daemon running" || echo "✗ Docker daemon not running"
```

### Test file creation permissions
```bash
# Test write permissions in project directory
touch test_file.tmp && rm test_file.tmp && echo "✓ Write permissions OK" || echo "✗ Cannot write to directory"
```

### Verify no sensitive files exist
```bash
# Check for files that should NOT exist in clean state
echo -e "\nChecking for sensitive files that should not exist..."
sensitive_files=(
    ".env"
    "config.json"
    "docker-compose.yml"
    "*.log"
    "*.pid"
    "*.pyc"
    "__pycache__"
)

for pattern in "${sensitive_files[@]}"; do
    files=$(find . -name "$pattern" 2>/dev/null)
    [ -z "$files" ] && echo "✓ No $pattern files found" || echo "✗ Found $pattern files: $files"
done
```

## Summary Verification Script

Run this all-in-one verification:

```bash
#!/bin/bash
echo "=== STINKSTER PROJECT RECOVERY VERIFICATION ==="
echo "Date: $(date)"
echo "User: $(whoami)"
echo "Directory: $(pwd)"
echo

# Quick health check
checks_passed=0
total_checks=6

# Check 1: Correct directory
[[ "$(pwd)" == "/home/pi/projects/stinkster" ]] && ((checks_passed++)) && echo "✓ Correct directory" || echo "✗ Wrong directory"

# Check 2: No git repo
[ ! -d .git ] && ((checks_passed++)) && echo "✓ No git repository" || echo "✗ Git repository exists"

# Check 3: Backup exists
[ -f "openwebrx-hackrf-working.tar.gz" ] && ((checks_passed++)) && echo "✓ Backup archive present" || echo "✗ Backup missing"

# Check 4: Templates exist
template_count=$(ls *.template.* 2>/dev/null | wc -l)
[ $template_count -ge 8 ] && ((checks_passed++)) && echo "✓ Configuration templates present" || echo "✗ Missing templates"

# Check 5: Correct ownership
[ "$(stat -c %U:%G .)" = "pi:pi" ] && ((checks_passed++)) && echo "✓ Correct ownership" || echo "✗ Wrong ownership"

# Check 6: Docker available
docker ps > /dev/null 2>&1 && ((checks_passed++)) && echo "✓ Docker available" || echo "✗ Docker not running"

echo
echo "=== VERIFICATION COMPLETE ==="
echo "Passed: $checks_passed/$total_checks checks"
echo

if [ $checks_passed -eq $total_checks ]; then
    echo "✓ System is ready for git initialization and sanitization"
else
    echo "✗ System needs attention before proceeding"
fi
```

## Next Steps After Verification

If all checks pass:
1. Initialize git repository: `git init`
2. Create .gitignore file with session-specific exclusions
3. Add and commit sanitized files
4. Set up remote repository (if desired)
5. Document any unresolved issues in TODO.md

If any checks fail:
1. Address the specific failures before proceeding
2. Re-run verification after fixes
3. Document any workarounds in HANDOFF_SUMMARY.md