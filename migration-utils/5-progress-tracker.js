#!/usr/bin/env node

/**
 * Progress Tracking Script
 * Monitors and reports on TypeScript migration progress
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const CONVERSION_LOG = path.join(__dirname, 'conversion-log.json');
const LINT_LOG = path.join(__dirname, 'lint-log.json');
const VERIFICATION_LOG = path.join(__dirname, 'verification-log.json');
const ROLLBACK_LOG = path.join(__dirname, 'rollback-log.json');
const PROGRESS_REPORT = path.join(__dirname, 'migration-progress.html');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function loadLog(logPath) {
  try {
    const data = await fs.readFile(logPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function countFiles(directory, extension) {
  return new Promise((resolve) => {
    try {
      const result = execSync(
        `find ${directory} -name "*.${extension}" -type f ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*" | wc -l`,
        { encoding: 'utf8' }
      );
      resolve(parseInt(result.trim()));
    } catch {
      resolve(0);
    }
  });
}

async function getFileList(directory, extension) {
  return new Promise((resolve) => {
    try {
      const result = execSync(
        `find ${directory} -name "*.${extension}" -type f ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*"`,
        { encoding: 'utf8' }
      );
      resolve(result.trim().split('\n').filter(Boolean));
    } catch {
      resolve([]);
    }
  });
}

async function analyzeProgress(projectPath) {
  const progress = {
    timestamp: new Date().toISOString(),
    projectPath: projectPath,
    files: {
      javascript: { count: 0, list: [] },
      typescript: { count: 0, list: [] },
      total: 0
    },
    conversion: {
      attempted: 0,
      successful: 0,
      failed: 0,
      percentage: 0
    },
    quality: {
      linted: 0,
      formatted: 0,
      compilable: 0,
      tested: 0
    },
    issues: {
      eslintErrors: 0,
      eslintWarnings: 0,
      typeErrors: 0,
      testFailures: 0
    },
    rollbacks: 0
  };
  
  // Count JavaScript and TypeScript files
  progress.files.javascript.count = await countFiles(projectPath, 'js');
  progress.files.javascript.list = await getFileList(projectPath, 'js');
  progress.files.typescript.count = await countFiles(projectPath, 'ts');
  progress.files.typescript.list = await getFileList(projectPath, 'ts');
  progress.files.total = progress.files.javascript.count + progress.files.typescript.count;
  
  // Load conversion log
  const conversionLog = await loadLog(CONVERSION_LOG);
  if (conversionLog) {
    const projectConversions = conversionLog.conversions.filter(c => 
      c.originalPath.startsWith(projectPath)
    );
    
    progress.conversion.attempted = projectConversions.length;
    progress.conversion.successful = projectConversions.filter(c => c.success).length;
    progress.conversion.failed = projectConversions.filter(c => !c.success).length;
    
    // Calculate conversion percentage based on original JS files
    const originalJsCount = progress.files.javascript.count + progress.conversion.successful;
    if (originalJsCount > 0) {
      progress.conversion.percentage = Math.round(
        (progress.conversion.successful / originalJsCount) * 100
      );
    }
  }
  
  // Load lint log
  const lintLog = await loadLog(LINT_LOG);
  if (lintLog) {
    const projectLints = lintLog.runs.filter(r => 
      r.target.startsWith(projectPath)
    );
    
    projectLints.forEach(run => {
      if (run.eslint?.summary) {
        progress.issues.eslintErrors += run.eslint.summary.totalErrors || 0;
        progress.issues.eslintWarnings += run.eslint.summary.totalWarnings || 0;
        if (run.eslint.success) progress.quality.linted++;
      }
      if (run.prettier?.success) {
        progress.quality.formatted++;
      }
    });
  }
  
  // Load verification log
  const verificationLog = await loadLog(VERIFICATION_LOG);
  if (verificationLog) {
    const projectVerifications = verificationLog.verifications.filter(v => 
      v.projectPath === projectPath
    );
    
    projectVerifications.forEach(verification => {
      if (verification.checks.typescript?.success) progress.quality.compilable++;
      if (verification.checks.tests?.success) progress.quality.tested++;
      if (verification.checks.typescript?.errors) {
        // Count TypeScript errors (rough estimate from output)
        const errorCount = (verification.checks.typescript.errors.match(/error TS/g) || []).length;
        progress.issues.typeErrors += errorCount;
      }
    });
  }
  
  // Load rollback log
  const rollbackLog = await loadLog(ROLLBACK_LOG);
  if (rollbackLog) {
    progress.rollbacks = rollbackLog.rollbacks.reduce((count, rollback) => {
      const projectRollbacks = rollback.results.filter(r => 
        r.targetPath?.startsWith(projectPath)
      );
      return count + projectRollbacks.length;
    }, 0);
  }
  
  return progress;
}

function printProgressBar(percentage, width = 40) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

function printColoredText(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function displayProgress(progress) {
  console.log('\n' + printColoredText('=== TypeScript Migration Progress ===', 'bright'));
  console.log(`Project: ${progress.projectPath}`);
  console.log(`Updated: ${new Date(progress.timestamp).toLocaleString()}`);
  
  console.log('\n' + printColoredText('File Status:', 'cyan'));
  console.log(`  JavaScript files: ${progress.files.javascript.count}`);
  console.log(`  TypeScript files: ${progress.files.typescript.count}`);
  console.log(`  Total files: ${progress.files.total}`);
  
  console.log('\n' + printColoredText('Conversion Progress:', 'cyan'));
  const progressBar = printProgressBar(progress.conversion.percentage);
  console.log(`  ${progressBar}`);
  console.log(`  Converted: ${progress.conversion.successful} files`);
  console.log(`  Failed: ${progress.conversion.failed} files`);
  console.log(`  Remaining: ${progress.files.javascript.count} JS files`);
  
  console.log('\n' + printColoredText('Code Quality:', 'cyan'));
  console.log(`  ✓ Linted: ${progress.quality.linted} files`);
  console.log(`  ✓ Formatted: ${progress.quality.formatted} files`);
  console.log(`  ✓ Compilable: ${progress.quality.compilable} checks`);
  console.log(`  ✓ Tests passing: ${progress.quality.tested} runs`);
  
  if (progress.issues.eslintErrors > 0 || progress.issues.eslintWarnings > 0 ||
      progress.issues.typeErrors > 0 || progress.issues.testFailures > 0) {
    console.log('\n' + printColoredText('Issues to Address:', 'yellow'));
    if (progress.issues.eslintErrors > 0) {
      console.log(`  ⚠ ESLint errors: ${progress.issues.eslintErrors}`);
    }
    if (progress.issues.eslintWarnings > 0) {
      console.log(`  ⚠ ESLint warnings: ${progress.issues.eslintWarnings}`);
    }
    if (progress.issues.typeErrors > 0) {
      console.log(`  ⚠ TypeScript errors: ${progress.issues.typeErrors}`);
    }
    if (progress.issues.testFailures > 0) {
      console.log(`  ⚠ Test failures: ${progress.issues.testFailures}`);
    }
  }
  
  if (progress.rollbacks > 0) {
    console.log('\n' + printColoredText(`Rollbacks: ${progress.rollbacks} files`, 'red'));
  }
  
  // Migration status
  console.log('\n' + printColoredText('Migration Status:', 'bright'));
  if (progress.conversion.percentage === 100) {
    console.log(printColoredText('  ✓ Migration Complete!', 'green'));
  } else if (progress.conversion.percentage >= 75) {
    console.log(printColoredText('  → Nearly complete', 'green'));
  } else if (progress.conversion.percentage >= 50) {
    console.log(printColoredText('  → Good progress', 'yellow'));
  } else if (progress.conversion.percentage >= 25) {
    console.log(printColoredText('  → In progress', 'yellow'));
  } else {
    console.log(printColoredText('  → Just started', 'blue'));
  }
}

async function generateHTMLReport(progress) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TypeScript Migration Progress</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 { color: #333; }
    .metric {
      display: inline-block;
      margin: 10px 20px 10px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
      border-left: 4px solid #007bff;
    }
    .metric-label {
      font-size: 0.9em;
      color: #666;
    }
    .metric-value {
      font-size: 1.5em;
      font-weight: bold;
      color: #333;
    }
    .progress-bar {
      width: 100%;
      height: 30px;
      background: #e9ecef;
      border-radius: 15px;
      overflow: hidden;
      margin: 20px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #007bff, #0056b3);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    .issue {
      padding: 10px;
      margin: 5px 0;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 3px;
    }
    .success {
      color: #28a745;
    }
    .warning {
      color: #ffc107;
    }
    .danger {
      color: #dc3545;
    }
    .file-list {
      max-height: 300px;
      overflow-y: auto;
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .section {
      margin: 30px 0;
    }
    .timestamp {
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>TypeScript Migration Progress</h1>
    <p class="timestamp">Generated: ${new Date(progress.timestamp).toLocaleString()}</p>
    <p><strong>Project:</strong> ${progress.projectPath}</p>
    
    <div class="section">
      <h2>Overall Progress</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress.conversion.percentage}%">
          ${progress.conversion.percentage}%
        </div>
      </div>
      
      <div class="metric">
        <div class="metric-label">JavaScript Files</div>
        <div class="metric-value">${progress.files.javascript.count}</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">TypeScript Files</div>
        <div class="metric-value">${progress.files.typescript.count}</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Converted</div>
        <div class="metric-value class="success">${progress.conversion.successful}</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Failed</div>
        <div class="metric-value class="danger">${progress.conversion.failed}</div>
      </div>
    </div>
    
    <div class="section">
      <h2>Code Quality</h2>
      
      <div class="metric">
        <div class="metric-label">Linted</div>
        <div class="metric-value">${progress.quality.linted}</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Formatted</div>
        <div class="metric-value">${progress.quality.formatted}</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Compilable</div>
        <div class="metric-value">${progress.quality.compilable}</div>
      </div>
      
      <div class="metric">
        <div class="metric-label">Tests Passing</div>
        <div class="metric-value">${progress.quality.tested}</div>
      </div>
    </div>
    
    ${(progress.issues.eslintErrors > 0 || progress.issues.eslintWarnings > 0 ||
       progress.issues.typeErrors > 0 || progress.issues.testFailures > 0) ? `
    <div class="section">
      <h2>Issues to Address</h2>
      ${progress.issues.eslintErrors > 0 ? `
        <div class="issue">
          <strong>ESLint Errors:</strong> ${progress.issues.eslintErrors}
        </div>
      ` : ''}
      ${progress.issues.eslintWarnings > 0 ? `
        <div class="issue">
          <strong>ESLint Warnings:</strong> ${progress.issues.eslintWarnings}
        </div>
      ` : ''}
      ${progress.issues.typeErrors > 0 ? `
        <div class="issue">
          <strong>TypeScript Errors:</strong> ${progress.issues.typeErrors}
        </div>
      ` : ''}
      ${progress.issues.testFailures > 0 ? `
        <div class="issue">
          <strong>Test Failures:</strong> ${progress.issues.testFailures}
        </div>
      ` : ''}
    </div>
    ` : ''}
    
    ${progress.files.javascript.count > 0 ? `
    <div class="section">
      <h2>Remaining JavaScript Files</h2>
      <div class="file-list">
        ${progress.files.javascript.list.map(file => 
          `${file.replace(progress.projectPath + '/', '')}<br>`
        ).join('')}
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  
  await fs.writeFile(PROGRESS_REPORT, html);
  console.log(`\nHTML report saved to: ${PROGRESS_REPORT}`);
}

async function watchProgress(projectPath, interval = 30000) {
  console.log(`Watching migration progress for ${projectPath}`);
  console.log(`Updates every ${interval / 1000} seconds. Press Ctrl+C to stop.\n`);
  
  const displayUpdate = async () => {
    // Clear console (works on most terminals)
    console.clear();
    
    const progress = await analyzeProgress(projectPath);
    await displayProgress(progress);
  };
  
  // Initial display
  await displayUpdate();
  
  // Set up interval
  setInterval(displayUpdate, interval);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node progress-tracker.js <project-path> [options]');
    console.log('Options:');
    console.log('  --watch              Watch progress with live updates');
    console.log('  --interval=<ms>      Update interval for watch mode (default: 30000)');
    console.log('  --html               Generate HTML report');
    console.log('  --json               Output raw JSON data');
    process.exit(1);
  }
  
  const projectPath = path.resolve(args[0]);
  const options = {
    watch: args.includes('--watch'),
    html: args.includes('--html'),
    json: args.includes('--json'),
    interval: parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '30000')
  };
  
  const progress = await analyzeProgress(projectPath);
  
  if (options.json) {
    console.log(JSON.stringify(progress, null, 2));
  } else {
    await displayProgress(progress);
  }
  
  if (options.html) {
    await generateHTMLReport(progress);
  }
  
  if (options.watch) {
    await watchProgress(projectPath, options.interval);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { analyzeProgress, displayProgress };