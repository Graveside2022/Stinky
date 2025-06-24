# Node.js Package Requirements for Webhook Migration

## Required NPM Packages

### 1. GPS Communication
```json
{
  "node-gpsd": "^0.3.0"
}
```
**Purpose**: Direct communication with GPSD daemon
**Usage**:
```javascript
const gpsd = require('node-gpsd');
const daemon = new gpsd.Daemon({
  port: 2947,
  hostname: 'localhost',
  logger: {
    info: console.log,
    warn: console.warn,
    error: console.error
  }
});

const listener = new gpsd.Listener();
listener.on('TPV', (data) => {
  // Time Position Velocity data
  console.log('GPS Fix:', data);
});
listener.connect();
```

### 2. Process Management
```json
{
  "ps-list": "^8.1.1",
  "tree-kill": "^1.2.2",
  "pidusage": "^3.0.2"
}
```

**ps-list**: List running processes
```javascript
const psList = require('ps-list');
const processes = await psList();
const kismetProcess = processes.find(p => p.name.includes('kismet'));
```

**tree-kill**: Kill process trees (parent + children)
```javascript
const treeKill = require('tree-kill');
treeKill(pid, 'SIGKILL', (err) => {
  if (err) console.error('Failed to kill process tree');
});
```

**pidusage**: Monitor process resource usage (already installed)
```javascript
const pidusage = require('pidusage');
const stats = await pidusage(pid);
// stats.cpu, stats.memory, stats.elapsed
```

### 3. File System Operations
```json
{
  "glob": "^10.3.10",
  "chokidar": "^3.5.3"
}
```

**glob**: File pattern matching
```javascript
const glob = require('glob');
const csvFiles = await glob('/home/pi/kismet_ops/*.csv', {
  nodir: true,
  nosort: false
});
```

**chokidar** (optional): File system watcher for real-time CSV monitoring
```javascript
const chokidar = require('chokidar');
const watcher = chokidar.watch('/home/pi/kismet_ops/*.csv', {
  persistent: true,
  ignoreInitial: true
});
watcher.on('add', path => console.log(`New CSV: ${path}`));
watcher.on('change', path => console.log(`CSV updated: ${path}`));
```

### 4. CSV Processing (Already Installed)
```json
{
  "csv-parser": "^3.0.0"
}
```
**Usage with streams**:
```javascript
const csv = require('csv-parser');
const fs = require('fs');

const devices = [];
fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (row) => devices.push(row))
  .on('end', () => console.log(`Parsed ${devices.length} devices`));
```

### 5. Additional Utility Packages (Optional but Recommended)
```json
{
  "execa": "^8.0.1",
  "p-queue": "^7.4.1",
  "file-type": "^18.7.0"
}
```

**execa**: Better child process execution
```javascript
const execa = require('execa');
const {stdout} = await execa('gpspipe', ['-w', '-n', '1']);
```

**p-queue**: Promise queue for managing concurrent operations
```javascript
const PQueue = require('p-queue');
const queue = new PQueue({concurrency: 2});
await queue.add(() => startKismet());
await queue.add(() => startWigleToTAK());
```

**file-type**: Detect file types (useful for validation)
```javascript
const fileType = require('file-type');
const type = await fileType.fromFile(path);
if (type && type.ext === 'csv') {
  // Process CSV file
}
```

## Installation Commands

### Core Dependencies (Required)
```bash
cd /home/pi/projects/stinkster_malone/stinkster/src/nodejs/kismet-operations
npm install node-gpsd@^0.3.0 ps-list@^8.1.1 tree-kill@^1.2.2 glob@^10.3.10
```

### Optional Dependencies (Recommended)
```bash
npm install chokidar@^3.5.3 execa@^8.0.1 p-queue@^7.4.1 file-type@^18.7.0
```

### Development Dependencies
```bash
npm install --save-dev @types/node-gpsd @types/glob
```

## Package Compatibility Matrix

| Package | Node Version | License | Weekly Downloads | Size |
|---------|--------------|---------|------------------|------|
| node-gpsd | >=14.0.0 | MIT | ~500 | 15KB |
| ps-list | >=14.0.0 | MIT | ~2M | 8KB |
| tree-kill | >=8.0.0 | MIT | ~5M | 6KB |
| glob | >=16.0.0 | ISC | ~50M | 50KB |
| chokidar | >=14.0.0 | MIT | ~30M | 80KB |
| execa | >=16.0.0 | MIT | ~40M | 45KB |
| p-queue | >=14.0.0 | MIT | ~5M | 25KB |

## Integration with Existing Packages

### Already Installed (from package.json)
- `axios`: HTTP client for Kismet API
- `winston`: Logging framework
- `moment`: Date/time handling
- `csv-parser`: CSV file parsing
- `cors`: CORS middleware
- `helmet`: Security headers
- `express`: Web framework
- `socket.io`: WebSocket support

### Package Interactions
```javascript
// Example: Integrated service using multiple packages
class IntegratedWebhookService {
  constructor() {
    // Existing packages
    this.logger = winston.createLogger({...});
    this.axios = axios.create({...});
    
    // New packages
    this.gpsd = new (require('node-gpsd')).Daemon();
    this.glob = require('glob');
    this.treeKill = require('tree-kill');
    this.psList = require('ps-list');
    
    // Optional packages
    this.queue = new (require('p-queue'))({concurrency: 2});
    this.execa = require('execa');
  }
}
```

## Memory and Performance Considerations

### Package Memory Footprint
- **Base Node.js app**: ~30MB
- **node-gpsd**: +2MB (lightweight socket client)
- **ps-list**: +1MB (native bindings)
- **tree-kill**: <1MB (minimal)
- **glob**: +2MB (with dependencies)
- **chokidar**: +5MB (if used)
- **Total estimated**: ~40-45MB

### Performance Impact
- **GPS polling**: Minimal (event-driven)
- **Process listing**: ~10-50ms per call
- **File globbing**: ~5-20ms for typical directory
- **CSV parsing**: Streaming, scales with file size

## Security Audit Results

### Package Security Status (as of June 2025)
```bash
# Run security audit
npm audit

# Expected results:
# node-gpsd: No known vulnerabilities
# ps-list: No known vulnerabilities
# tree-kill: No known vulnerabilities
# glob: No known vulnerabilities
```

### Permission Requirements
- **node-gpsd**: Requires access to localhost:2947
- **ps-list**: Requires process read permissions
- **tree-kill**: Requires process kill permissions
- **glob**: Requires file system read permissions

## Alternative Package Options

### GPS Communication Alternatives
1. **gpsd-client** (1.4.0)
   - More modern API
   - TypeScript support
   - Larger size (25KB)

2. **node-gpsd-client** (1.0.0)
   - Simpler API
   - Less maintained

### Process Management Alternatives
1. **find-process** (1.4.7)
   - Cross-platform process finding
   - No tree-kill functionality

2. **ps-node** (0.1.6)
   - Older, less maintained
   - Similar functionality

## Package.json Update

```json
{
  "name": "stinkster-kismet-operations",
  "version": "2.1.0",
  "dependencies": {
    "axios": "^1.6.0",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "joi": "^17.13.3",
    "lodash": "^4.17.21",
    "moment": "^2.29.4",
    "morgan": "^1.10.0",
    "socket.io": "^4.7.2",
    "uuid": "^9.0.1",
    "winston": "^3.11.0",
    "ws": "^8.14.2",
    "csv-parser": "^3.0.0",
    "pidusage": "^3.0.2",
    "node-gpsd": "^0.3.0",
    "ps-list": "^8.1.1",
    "tree-kill": "^1.2.2",
    "glob": "^10.3.10"
  },
  "optionalDependencies": {
    "chokidar": "^3.5.3",
    "execa": "^8.0.1",
    "p-queue": "^7.4.1",
    "file-type": "^18.7.0"
  }
}
```

## Testing Package Integration

### Test Script
```javascript
// test-packages.js
async function testPackages() {
  console.log('Testing package installations...\n');
  
  // Test node-gpsd
  try {
    const gpsd = require('node-gpsd');
    console.log('✓ node-gpsd loaded successfully');
  } catch (e) {
    console.log('✗ node-gpsd failed:', e.message);
  }
  
  // Test ps-list
  try {
    const psList = require('ps-list');
    const processes = await psList();
    console.log(`✓ ps-list loaded, found ${processes.length} processes`);
  } catch (e) {
    console.log('✗ ps-list failed:', e.message);
  }
  
  // Test tree-kill
  try {
    require('tree-kill');
    console.log('✓ tree-kill loaded successfully');
  } catch (e) {
    console.log('✗ tree-kill failed:', e.message);
  }
  
  // Test glob
  try {
    const glob = require('glob');
    const files = await glob('*.js');
    console.log(`✓ glob loaded, found ${files.length} JS files`);
  } catch (e) {
    console.log('✗ glob failed:', e.message);
  }
}

testPackages().catch(console.error);
```

## Summary

The webhook migration requires 4 core NPM packages:
1. **node-gpsd**: GPS daemon communication
2. **ps-list**: Process listing
3. **tree-kill**: Process tree termination
4. **glob**: File pattern matching

These packages are lightweight, well-maintained, and integrate seamlessly with the existing Node.js infrastructure. The total memory overhead is minimal (~10-15MB), and all packages have good security track records.