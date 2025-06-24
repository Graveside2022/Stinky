#!/usr/bin/env node

/**
 * Functionality Verification Script
 * Runs tests and basic functionality checks after conversion
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, execSync } = require('child_process');
const http = require('http');
const https = require('https');

const VERIFICATION_LOG = path.join(__dirname, 'verification-log.json');

// Service health check endpoints
const HEALTH_CHECKS = {
  'wigletotak': {
    port: 8000,
    path: '/api/stats',
    method: 'GET',
    expectedStatus: 200
  },
  'spectrum-analyzer': {
    port: 8092,
    path: '/',
    method: 'GET',
    expectedStatus: 200
  },
  'kismet-ops': {
    port: 3000,
    path: '/api/status',
    method: 'GET',
    expectedStatus: 200
  }
};

async function checkTypeScriptCompilation(projectPath) {
  console.log('\n=== TypeScript Compilation Check ===');
  
  try {
    // Check if tsconfig.json exists
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    await fs.access(tsconfigPath);
    
    return new Promise((resolve) => {
      const tsc = spawn('npx', ['tsc', '--noEmit'], {
        cwd: projectPath,
        shell: true
      });
      
      let output = '';
      let errorOutput = '';
      
      tsc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      tsc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      tsc.on('close', (code) => {
        if (code === 0) {
          console.log('✓ TypeScript compilation successful');
          resolve({ success: true, output });
        } else {
          console.log('✗ TypeScript compilation failed');
          console.log(errorOutput || output);
          resolve({ success: false, errors: errorOutput || output });
        }
      });
    });
  } catch (error) {
    console.log('⚠ No tsconfig.json found, skipping TypeScript compilation check');
    return { success: true, skipped: true };
  }
}

async function runTests(projectPath) {
  console.log('\n=== Running Tests ===');
  
  // Check for common test runners
  const packageJsonPath = path.join(projectPath, 'package.json');
  let testCommand = null;
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    if (packageJson.scripts && packageJson.scripts.test) {
      testCommand = packageJson.scripts.test;
    }
  } catch {
    console.log('⚠ No package.json found');
  }
  
  if (!testCommand || testCommand === 'echo "Error: no test specified" && exit 1') {
    console.log('⚠ No tests configured, skipping test run');
    return { success: true, skipped: true };
  }
  
  return new Promise((resolve) => {
    const test = spawn('npm', ['test'], {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, CI: 'true' }
    });
    
    let output = '';
    let errorOutput = '';
    
    test.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    test.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    test.on('close', (code) => {
      if (code === 0) {
        console.log('\n✓ All tests passed');
        resolve({ success: true, output });
      } else {
        console.log('\n✗ Tests failed');
        resolve({ success: false, output, errors: errorOutput });
      }
    });
  });
}

async function checkServiceHealth(serviceName, config) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: config.port,
      path: config.path,
      method: config.method,
      timeout: 5000
    };
    
    const protocol = config.port === 443 ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === config.expectedStatus) {
          console.log(`✓ ${serviceName} is healthy (${res.statusCode})`);
          resolve({ 
            success: true, 
            service: serviceName,
            status: res.statusCode,
            response: data.substring(0, 100) + (data.length > 100 ? '...' : '')
          });
        } else {
          console.log(`✗ ${serviceName} returned unexpected status: ${res.statusCode}`);
          resolve({ 
            success: false, 
            service: serviceName,
            status: res.statusCode,
            expectedStatus: config.expectedStatus
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`✗ ${serviceName} is not responding: ${error.message}`);
      resolve({ 
        success: false, 
        service: serviceName,
        error: error.message 
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`✗ ${serviceName} timed out`);
      resolve({ 
        success: false, 
        service: serviceName,
        error: 'Request timed out' 
      });
    });
    
    req.end();
  });
}

async function checkDependencies(projectPath) {
  console.log('\n=== Checking Dependencies ===');
  
  try {
    // Check if node_modules exists
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    await fs.access(nodeModulesPath);
    
    // Run npm audit
    return new Promise((resolve) => {
      const audit = spawn('npm', ['audit', '--json'], {
        cwd: projectPath,
        shell: true
      });
      
      let output = '';
      
      audit.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      audit.on('close', () => {
        try {
          const auditResult = JSON.parse(output);
          const vulnerabilities = auditResult.metadata.vulnerabilities;
          const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
          
          if (total === 0) {
            console.log('✓ No vulnerabilities found');
          } else {
            console.log(`⚠ Found ${total} vulnerabilities:`);
            console.log(`  Critical: ${vulnerabilities.critical || 0}`);
            console.log(`  High: ${vulnerabilities.high || 0}`);
            console.log(`  Moderate: ${vulnerabilities.moderate || 0}`);
            console.log(`  Low: ${vulnerabilities.low || 0}`);
          }
          
          resolve({ 
            success: true, 
            vulnerabilities: vulnerabilities,
            total: total
          });
        } catch {
          console.log('⚠ Could not parse audit results');
          resolve({ success: true, skipped: true });
        }
      });
    });
  } catch {
    console.log('⚠ No node_modules found, run npm install first');
    return { success: false, error: 'Dependencies not installed' };
  }
}

async function checkBuildProcess(projectPath) {
  console.log('\n=== Checking Build Process ===');
  
  const packageJsonPath = path.join(projectPath, 'package.json');
  let buildCommand = null;
  
  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    if (packageJson.scripts && packageJson.scripts.build) {
      buildCommand = packageJson.scripts.build;
    }
  } catch {
    console.log('⚠ No build script configured');
    return { success: true, skipped: true };
  }
  
  if (!buildCommand) {
    console.log('⚠ No build script found, skipping build check');
    return { success: true, skipped: true };
  }
  
  return new Promise((resolve) => {
    console.log(`Running: npm run build`);
    const build = spawn('npm', ['run', 'build'], {
      cwd: projectPath,
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    build.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    build.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Build completed successfully');
        resolve({ success: true, output });
      } else {
        console.log('✗ Build failed');
        console.log(errorOutput || output);
        resolve({ success: false, errors: errorOutput || output });
      }
    });
  });
}

async function verifyFunctionality(projectPath, options = {}) {
  const results = {
    projectPath,
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // TypeScript compilation check
  if (!options.skipTypeScript) {
    results.checks.typescript = await checkTypeScriptCompilation(projectPath);
  }
  
  // Dependency check
  if (!options.skipDependencies) {
    results.checks.dependencies = await checkDependencies(projectPath);
  }
  
  // Build process check
  if (!options.skipBuild) {
    results.checks.build = await checkBuildProcess(projectPath);
  }
  
  // Run tests
  if (!options.skipTests) {
    results.checks.tests = await runTests(projectPath);
  }
  
  // Service health checks
  if (!options.skipHealth && options.service) {
    console.log('\n=== Service Health Checks ===');
    const healthConfig = HEALTH_CHECKS[options.service];
    if (healthConfig) {
      results.checks.health = await checkServiceHealth(options.service, healthConfig);
    } else {
      console.log(`⚠ Unknown service: ${options.service}`);
    }
  }
  
  return results;
}

async function saveVerificationLog(results) {
  let log;
  try {
    const data = await fs.readFile(VERIFICATION_LOG, 'utf8');
    log = JSON.parse(data);
  } catch {
    log = { verifications: [] };
  }
  
  log.verifications.push(results);
  await fs.writeFile(VERIFICATION_LOG, JSON.stringify(log, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node verify-functionality.js <project-path> [options]');
    console.log('Options:');
    console.log('  --skip-typescript    Skip TypeScript compilation check');
    console.log('  --skip-dependencies  Skip dependency audit');
    console.log('  --skip-build        Skip build process check');
    console.log('  --skip-tests        Skip test execution');
    console.log('  --skip-health       Skip service health checks');
    console.log('  --service=<name>    Service name for health check (wigletotak, spectrum-analyzer, kismet-ops)');
    console.log('  --quick             Skip all optional checks');
    process.exit(1);
  }
  
  const projectPath = path.resolve(args[0]);
  const options = {
    skipTypeScript: args.includes('--skip-typescript') || args.includes('--quick'),
    skipDependencies: args.includes('--skip-dependencies') || args.includes('--quick'),
    skipBuild: args.includes('--skip-build') || args.includes('--quick'),
    skipTests: args.includes('--skip-tests') || args.includes('--quick'),
    skipHealth: args.includes('--skip-health') || args.includes('--quick'),
    service: args.find(arg => arg.startsWith('--service='))?.split('=')[1]
  };
  
  console.log(`Verifying functionality for: ${projectPath}`);
  
  // Run verification
  const results = await verifyFunctionality(projectPath, options);
  
  // Save results
  await saveVerificationLog(results);
  
  // Print summary
  console.log('\n=== Verification Summary ===');
  let allPassed = true;
  
  Object.entries(results.checks).forEach(([checkName, result]) => {
    if (result.skipped) {
      console.log(`${checkName}: SKIPPED`);
    } else if (result.success) {
      console.log(`${checkName}: PASSED ✓`);
    } else {
      console.log(`${checkName}: FAILED ✗`);
      allPassed = false;
    }
  });
  
  console.log(`\nVerification log saved to: ${VERIFICATION_LOG}`);
  
  if (allPassed) {
    console.log('\n✓ All verification checks passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some verification checks failed');
    console.log('Review the issues above and fix them before proceeding');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifyFunctionality };