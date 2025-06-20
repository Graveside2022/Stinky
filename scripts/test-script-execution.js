#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

console.log('Testing script execution capabilities...\n');

async function testMethod(name, command, args = []) {
  console.log(`Testing ${name}...`);
  try {
    if (typeof command === 'string') {
      // For exec-style commands
      const { stdout, stderr } = await execAsync(command);
      console.log(`✓ ${name} succeeded`);
      if (stdout) console.log(`  Output: ${stdout.trim()}`);
      if (stderr) console.log(`  Stderr: ${stderr.trim()}`);
      return true;
    } else {
      // For spawn-style commands
      return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: 'pipe' });
        let output = '';
        let error = '';
        
        child.stdout.on('data', (data) => { output += data; });
        child.stderr.on('data', (data) => { error += data; });
        
        child.on('close', (code) => {
          if (code === 0) {
            console.log(`✓ ${name} succeeded`);
            if (output) console.log(`  Output: ${output.trim()}`);
            resolve(true);
          } else {
            console.log(`✗ ${name} failed with code ${code}`);
            if (error) console.log(`  Error: ${error.trim()}`);
            resolve(false);
          }
        });
        
        child.on('error', (err) => {
          console.log(`✗ ${name} failed to spawn: ${err.message}`);
          resolve(false);
        });
      });
    }
  } catch (err) {
    console.log(`✗ ${name} failed: ${err.message}`);
    return false;
  }
}

async function runTests() {
  const scriptPath = '/home/pi/projects/stinkster_malone/stinkster/src/orchestration/gps_kismet_wigle.sh';
  
  // Test 1: Check if script exists and is executable
  console.log('1. Checking script accessibility...');
  try {
    await execAsync(`test -x ${scriptPath}`);
    console.log('✓ Script exists and is executable\n');
  } catch {
    console.log('✗ Script not found or not executable\n');
    return;
  }
  
  // Test 2: Try different execution methods
  console.log('2. Testing execution methods:\n');
  
  // Method A: Direct bash execution
  await testMethod('Direct bash execution', 'bash', [scriptPath, '--help']);
  console.log();
  
  // Method B: Sudo execution
  await testMethod('Sudo execution', 'sudo', ['bash', scriptPath, '--help']);
  console.log();
  
  // Method C: Systemctl
  await testMethod('Systemctl (user)', 'systemctl --user status kismet-orchestration 2>&1 || true');
  console.log();
  
  await testMethod('Systemctl (system)', 'systemctl status kismet-orchestration 2>&1 || true');
  console.log();
  
  // Test 3: Check sudo permissions
  console.log('3. Testing sudo permissions:\n');
  await testMethod('Sudo test', 'sudo -n true 2>&1');
  console.log();
  
  // Test 4: Check if running under systemd restrictions
  console.log('4. Checking systemd restrictions:\n');
  if (process.env.SYSTEMD_EXEC_PID) {
    console.log('✓ Running under systemd');
    console.log(`  PID: ${process.env.SYSTEMD_EXEC_PID}`);
    console.log(`  Service: ${process.env.INVOCATION_ID || 'unknown'}`);
  } else {
    console.log('✗ Not running under systemd');
  }
  
  // Test 5: Check NoNewPrivileges
  try {
    const status = await execAsync('cat /proc/self/status | grep NoNewPrivs');
    console.log(`  NoNewPrivileges: ${status.stdout.trim()}`);
  } catch {
    console.log('  Could not check NoNewPrivileges status');
  }
}

runTests().then(() => {
  console.log('\nTest complete!');
}).catch((err) => {
  console.error('Test error:', err);
});