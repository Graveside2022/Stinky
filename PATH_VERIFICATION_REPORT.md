# Path Verification Report

Generated: 2025-06-15

## Summary

After reorganizing the project structure, several documentation files contain outdated path references that need to be updated.

## Path Issues Found

### 1. README.md - Script Path Updates Needed

The following script references in README.md need to be updated:

| Current Path | New Path | Line Numbers |
|-------------|----------|--------------|
| `./install.sh` | `./scripts/setup/install.sh` | Lines 44, 45 |
| `./start-openwebrx.sh` | `./scripts/maintenance/start-openwebrx.sh` | Lines 60, 190 |
| `./rebuild-openwebrx-docker.sh` | `./scripts/maintenance/rebuild-openwebrx-docker.sh` | Line 300 |

### 2. Valid Path References

The following paths are correctly referenced and exist:
- ✓ `./dev.sh` - Development environment launcher
- ✓ `./dev/test/*` - All test scripts
- ✓ `./dev/tools/*` - All development tools
- ✓ `./src/orchestration/*` - All orchestration scripts
- ✓ `./src/scripts/*` - Service scripts

### 3. Documentation Links

All internal documentation links are valid:
- ✓ `REGULATORY_COMPLIANCE.md`
- ✓ `SECURITY.md`
- ✓ `CONTRIBUTING.md`
- ✓ `LICENSE`

### 4. Configuration File References

Configuration templates have been moved to:
- `/config/templates/` - Template configuration files
- `/config/examples/` - Example configurations

### 5. Script Organization

Scripts have been reorganized into categories:
- `/scripts/setup/` - Installation and setup scripts
- `/scripts/maintenance/` - Maintenance and operational scripts
- `/scripts/monitoring/` - Monitoring scripts (empty, awaiting migration)
- `/src/scripts/` - Service-specific scripts (start_kismet.sh, start_mediamtx.sh)

## Recommendations

1. **Update README.md** to reflect new script locations
2. **Create symlinks** in root directory for frequently used scripts:
   ```bash
   ln -s scripts/setup/install.sh install.sh
   ln -s scripts/maintenance/start-openwebrx.sh start-openwebrx.sh
   ```
3. **Update any automation** that depends on these script paths
4. **Review other documentation** for additional path references

## Next Steps

1. ✓ Fixed the path references in README.md
2. ✓ Fixed the path references in DEPENDENCIES.md
3. ✓ Created symlinks for backward compatibility:
   - `install.sh` → `scripts/setup/install.sh`
   - `start-openwebrx.sh` → `scripts/maintenance/start-openwebrx.sh`
   - `rebuild-openwebrx-docker.sh` → `scripts/maintenance/rebuild-openwebrx-docker.sh`
4. Test all referenced commands work correctly
5. Update any CI/CD scripts that reference old paths

## Fixes Applied

### README.md Updates
- Line 44-45: Updated install.sh path
- Line 60: Updated start-openwebrx.sh path
- Line 190: Updated start-openwebrx.sh path
- Line 300: Updated rebuild-openwebrx-docker.sh path

### DEPENDENCIES.md Updates
- Updated all references to setup-env.sh
- Updated install.sh reference
- Updated setup-configs.sh reference

### Backward Compatibility
Created symlinks in the root directory to maintain backward compatibility with existing scripts and documentation that may reference the old paths.