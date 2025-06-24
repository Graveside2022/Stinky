# File Organization Enforcement Pattern

## Overview

Systematic approach to enforcing consistent file organization across SDR applications, particularly
for Python/Flask services and Node.js integrations.

## Pattern Context

- **Use When**: Refactoring legacy Python/Flask applications to Node.js
- **Applies To**: Multi-service SDR systems with mixed Python/Node.js components
- **SDR Specific**: Spectrum analyzer, WiFi scanning, GPS integration services

## File Organization Rules

### 1. Service Directory Standard

```
service-name/
├── index.js (Node.js) or app.py (Flask)
├── package.json or requirements.txt
├── config/
│   └── index.js or config.py
├── lib/ or src/
│   ├── api/
│   ├── models/
│   └── utils/
├── public/ (web services)
│   ├── css/
│   ├── js/
│   └── images/
├── tests/
├── logs/
└── docs/
```

### 2. Cross-Service Integration Structure

```
src/
├── nodejs/
│   ├── spectrum-analyzer/
│   ├── kismet-operations/
│   └── wigle-to-tak/
├── python/ (legacy)
│   ├── hackrf/
│   ├── gpsmav/
│   └── wigletotak/
└── shared/
    ├── constants.js
    ├── logger.js
    └── utils/
```

## Enforcement Mechanisms

### 1. Automated Structure Validation

```javascript
// File: validate-structure.js
const fs = require('fs');
const path = require('path');

const REQUIRED_STRUCTURE = {
  'index.js': 'file',
  'package.json': 'file',
  config: 'directory',
  lib: 'directory',
  tests: 'directory',
  logs: 'directory',
};

function validateServiceStructure(servicePath) {
  const violations = [];

  for (const [item, type] of Object.entries(REQUIRED_STRUCTURE)) {
    const itemPath = path.join(servicePath, item);

    if (!fs.existsSync(itemPath)) {
      violations.push(`Missing ${type}: ${item}`);
      continue;
    }

    const stat = fs.statSync(itemPath);
    if (type === 'directory' && !stat.isDirectory()) {
      violations.push(`${item} should be a directory`);
    } else if (type === 'file' && !stat.isFile()) {
      violations.push(`${item} should be a file`);
    }
  }

  return violations;
}
```

### 2. Migration Path Enforcement

```bash
#!/bin/bash
# File: enforce-migration-structure.sh

SERVICE_NAME=$1
MIGRATION_TYPE=$2  # python-to-node, restructure, cleanup

case $MIGRATION_TYPE in
  "python-to-node")
    # Create Node.js structure
    mkdir -p "src/nodejs/$SERVICE_NAME"/{config,lib,public,tests,logs}

    # Backup Python version
    mkdir -p "src/python/$SERVICE_NAME-legacy"
    ;;
  "restructure")
    # Enforce standard structure
    find . -name "*.py" -o -name "*.js" | while read file; do
      # Categorize and move files
      case $(basename "$file") in
        *test*|*spec*) mv "$file" tests/ ;;
        *config*) mv "$file" config/ ;;
        *util*|*helper*) mv "$file" lib/utils/ ;;
      esac
    done
    ;;
esac
```

## SDR-Specific Organization

### 1. Spectrum Analyzer Structure

```
spectrum-analyzer/
├── index.js                    # Main Flask/Express server
├── lib/
│   ├── sdr/
│   │   ├── hackrf-controller.js
│   │   ├── frequency-manager.js
│   │   └── signal-processor.js
│   ├── websocket/
│   │   └── spectrum-stream.js
│   └── utils/
│       ├── fft-utils.js
│       └── buffer-manager.js
├── public/
│   ├── js/spectrum-visualizer.js
│   └── css/spectrum.css
└── config/
    └── frequencies.json
```

### 2. WiFi Scanning Organization

```
kismet-operations/
├── index.js
├── lib/
│   ├── kismet/
│   │   ├── api-client.js
│   │   ├── device-tracker.js
│   │   └── data-processor.js
│   ├── conversion/
│   │   ├── wigle-formatter.js
│   │   └── tak-converter.js
│   └── storage/
│       └── csv-handler.js
└── config/
    ├── kismet-settings.json
    └── device-filters.json
```

## Migration Patterns

### 1. Python to Node.js Service Migration

```javascript
// Pattern: Service Migration Wrapper
class ServiceMigrator {
  constructor(pythonService, nodeService) {
    this.pythonService = pythonService;
    this.nodeService = nodeService;
    this.migrationPhase = 'dual-run';
  }

  async migrateGradually() {
    // Phase 1: Dual execution with comparison
    const pythonResult = await this.pythonService.execute();
    const nodeResult = await this.nodeService.execute();

    this.validateResults(pythonResult, nodeResult);

    // Phase 2: Gradual traffic shift
    if (this.migrationPhase === 'cutover') {
      return nodeResult;
    }

    return pythonResult; // Fallback during migration
  }
}
```

### 2. Configuration Consolidation

```javascript
// Pattern: Unified Configuration Management
const configManager = {
  // Legacy Python config loading
  loadPythonConfig(configPath) {
    // Parse Python-style config files
    return require('child_process')
      .execSync(
        `python3 -c "import json, sys; sys.path.append('${path.dirname(configPath)}'); import config; print(json.dumps(config.__dict__))"`,
      )
      .toString();
  },

  // Node.js config normalization
  normalizeConfig(pythonConfig) {
    return {
      server: {
        port: pythonConfig.FLASK_PORT || 8000,
        host: pythonConfig.FLASK_HOST || '0.0.0.0',
      },
      sdr: {
        device: pythonConfig.SDR_DEVICE || 'hackrf',
        sampleRate: pythonConfig.SAMPLE_RATE || 2400000,
      },
    };
  },
};
```

## Cleanup Patterns

### 1. Dead Code Removal

```bash
#!/bin/bash
# Pattern: Dead Code Detection and Removal

# Find unused Python files after Node.js migration
find src/python -name "*.py" | while read pyfile; do
  # Check if corresponding Node.js version exists
  jsfile=$(echo "$pyfile" | sed 's/python/nodejs/' | sed 's/\.py$/.js/')

  if [ -f "$jsfile" ]; then
    # Verify Node.js version is functional
    if npm test -- --grep "$(basename "$jsfile" .js)"; then
      echo "Safe to remove: $pyfile"
      # mv "$pyfile" "archive/$(date +%Y%m%d)/"
    fi
  fi
done
```

### 2. Dependency Cleanup

```javascript
// Pattern: Dependency Tree Optimization
const dependencyAnalyzer = {
  findUnusedDependencies() {
    const packageJson = require('./package.json');
    const usedDeps = new Set();

    // Scan all JS files for require/import statements
    const jsFiles = glob.sync('**/*.js', { ignore: 'node_modules/**' });

    jsFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf8');
      const imports = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];

      imports.forEach((imp) => {
        const dep = imp.match(/require\(['"]([^'"]+)['"]\)/)[1];
        if (!dep.startsWith('.')) {
          usedDeps.add(dep.split('/')[0]);
        }
      });
    });

    const unusedDeps = Object.keys(packageJson.dependencies).filter((dep) => !usedDeps.has(dep));

    return unusedDeps;
  },
};
```

## Validation Checklist

### Pre-Migration Validation

- [ ] All services have consistent directory structure
- [ ] Configuration files are consolidated and accessible
- [ ] Legacy code is properly archived
- [ ] Dependencies are documented and minimized

### Post-Migration Validation

- [ ] No orphaned files in legacy directories
- [ ] All tests pass with new structure
- [ ] Configuration loading works correctly
- [ ] Service integration points are maintained

### SDR-Specific Validation

- [ ] HackRF device access works in new structure
- [ ] Spectrum data processing maintains accuracy
- [ ] WebSocket connections for real-time data work
- [ ] GPS integration remains functional
- [ ] Kismet data parsing continues correctly

## Implementation Notes

1. **Gradual Migration**: Implement file organization changes incrementally
2. **Backup Strategy**: Always create timestamped backups before restructuring
3. **Testing**: Validate each organizational change with integration tests
4. **Documentation**: Update API documentation to reflect new structure
5. **Service Discovery**: Update service discovery mechanisms for new paths

This pattern ensures systematic, safe refactoring of SDR application file structures while
maintaining functionality throughout the migration process.
