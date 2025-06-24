#!/usr/bin/env node

/**
 * ESLint and Prettier Runner
 * Runs ESLint and Prettier on converted TypeScript files
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');

const LINT_LOG = path.join(__dirname, 'lint-log.json');

async function checkDependencies() {
  const required = ['eslint', 'prettier', '@typescript-eslint/parser', '@typescript-eslint/eslint-plugin'];
  const missing = [];
  
  for (const dep of required) {
    try {
      require.resolve(dep);
    } catch {
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    console.log('Missing required dependencies. Installing...');
    execSync(`npm install --save-dev ${missing.join(' ')}`, { stdio: 'inherit' });
  }
}

async function createESLintConfig() {
  const eslintConfig = {
    "env": {
      "node": true,
      "es2021": true
    },
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "ecmaVersion": 2021,
      "sourceType": "module"
    },
    "plugins": [
      "@typescript-eslint"
    ],
    "rules": {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
      "prefer-const": "error"
    },
    "overrides": [
      {
        "files": ["*.js"],
        "rules": {
          "@typescript-eslint/no-var-requires": "off"
        }
      }
    ]
  };
  
  const configPath = path.join(process.cwd(), '.eslintrc.json');
  
  try {
    await fs.access(configPath);
    console.log('ESLint config already exists');
  } catch {
    await fs.writeFile(configPath, JSON.stringify(eslintConfig, null, 2));
    console.log('Created .eslintrc.json');
  }
  
  return configPath;
}

async function createPrettierConfig() {
  const prettierConfig = {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 2,
    "useTabs": false,
    "arrowParens": "avoid",
    "endOfLine": "lf"
  };
  
  const configPath = path.join(process.cwd(), '.prettierrc.json');
  
  try {
    await fs.access(configPath);
    console.log('Prettier config already exists');
  } catch {
    await fs.writeFile(configPath, JSON.stringify(prettierConfig, null, 2));
    console.log('Created .prettierrc.json');
  }
  
  return configPath;
}

async function runESLint(target, fix = false) {
  return new Promise((resolve) => {
    const args = [target];
    if (fix) args.push('--fix');
    args.push('--ext', '.ts,.tsx,.js,.jsx');
    args.push('--format', 'json');
    
    const eslint = spawn('npx', ['eslint', ...args], {
      cwd: process.cwd(),
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    eslint.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    eslint.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    eslint.on('close', (code) => {
      try {
        const results = output ? JSON.parse(output) : [];
        const summary = {
          totalFiles: results.length,
          filesWithErrors: results.filter(r => r.errorCount > 0).length,
          filesWithWarnings: results.filter(r => r.warningCount > 0).length,
          totalErrors: results.reduce((sum, r) => sum + r.errorCount, 0),
          totalWarnings: results.reduce((sum, r) => sum + r.warningCount, 0),
          details: results.filter(r => r.errorCount > 0 || r.warningCount > 0).map(r => ({
            file: r.filePath,
            errors: r.errorCount,
            warnings: r.warningCount,
            messages: r.messages.map(m => ({
              severity: m.severity === 2 ? 'error' : 'warning',
              message: m.message,
              line: m.line,
              column: m.column,
              ruleId: m.ruleId
            }))
          }))
        };
        resolve({ success: code === 0, summary, raw: results });
      } catch (e) {
        // If not JSON output, just return the text
        resolve({ 
          success: code === 0, 
          output: output || errorOutput,
          summary: { error: 'Could not parse ESLint output' }
        });
      }
    });
  });
}

async function runPrettier(target, write = false) {
  return new Promise((resolve) => {
    const args = [target];
    if (write) {
      args.push('--write');
    } else {
      args.push('--check');
    }
    args.push('--log-level', 'error');
    
    const prettier = spawn('npx', ['prettier', ...args], {
      cwd: process.cwd(),
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    prettier.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    prettier.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    prettier.on('close', (code) => {
      const filesNeedingFormat = errorOutput
        .split('\n')
        .filter(line => line.includes('[warn]'))
        .map(line => line.replace('[warn]', '').trim())
        .filter(Boolean);
      
      resolve({
        success: code === 0,
        filesNeedingFormat,
        output: output || errorOutput
      });
    });
  });
}

async function lintAndFormat(target, options = {}) {
  console.log(`\nProcessing ${target}...`);
  
  const results = {
    target,
    timestamp: new Date().toISOString(),
    eslint: null,
    prettier: null
  };
  
  // Run ESLint
  console.log('\nRunning ESLint...');
  const eslintResult = await runESLint(target, options.fix);
  results.eslint = eslintResult;
  
  if (eslintResult.success) {
    console.log('✓ ESLint passed');
  } else if (eslintResult.summary) {
    console.log(`✗ ESLint found issues:`);
    console.log(`  - ${eslintResult.summary.totalErrors} errors`);
    console.log(`  - ${eslintResult.summary.totalWarnings} warnings`);
    
    if (options.verbose && eslintResult.summary.details) {
      eslintResult.summary.details.forEach(file => {
        console.log(`\n  ${path.relative(process.cwd(), file.file)}:`);
        file.messages.forEach(msg => {
          console.log(`    ${msg.line}:${msg.column} ${msg.severity} ${msg.message} (${msg.ruleId})`);
        });
      });
    }
  }
  
  // Run Prettier
  console.log('\nRunning Prettier...');
  const prettierResult = await runPrettier(target, options.write);
  results.prettier = prettierResult;
  
  if (prettierResult.success) {
    console.log('✓ Prettier formatting is correct');
  } else {
    console.log(`✗ Prettier found ${prettierResult.filesNeedingFormat.length} files needing formatting`);
    if (options.verbose) {
      prettierResult.filesNeedingFormat.forEach(file => {
        console.log(`  - ${file}`);
      });
    }
  }
  
  return results;
}

async function saveLintLog(results) {
  let log;
  try {
    const data = await fs.readFile(LINT_LOG, 'utf8');
    log = JSON.parse(data);
  } catch {
    log = { runs: [] };
  }
  
  log.runs.push(results);
  await fs.writeFile(LINT_LOG, JSON.stringify(log, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node lint-and-format.js <file-or-directory> [options]');
    console.log('Options:');
    console.log('  --fix          Auto-fix ESLint issues');
    console.log('  --write        Auto-format with Prettier');
    console.log('  --verbose      Show detailed error messages');
    console.log('  --setup        Create config files if missing');
    process.exit(1);
  }
  
  const target = args[0];
  const options = {
    fix: args.includes('--fix'),
    write: args.includes('--write'),
    verbose: args.includes('--verbose'),
    setup: args.includes('--setup')
  };
  
  // Check and install dependencies
  await checkDependencies();
  
  // Create config files if needed
  if (options.setup) {
    await createESLintConfig();
    await createPrettierConfig();
  }
  
  // Run linting and formatting
  const results = await lintAndFormat(target, options);
  
  // Save results
  await saveLintLog(results);
  
  // Print summary
  console.log('\n=== Summary ===');
  const eslintPassed = results.eslint?.success;
  const prettierPassed = results.prettier?.success;
  
  if (eslintPassed && prettierPassed) {
    console.log('✓ All checks passed!');
    process.exit(0);
  } else {
    if (!eslintPassed) {
      console.log('✗ ESLint found issues');
      if (!options.fix) {
        console.log('  Run with --fix to auto-fix some issues');
      }
    }
    if (!prettierPassed) {
      console.log('✗ Prettier formatting needed');
      if (!options.write) {
        console.log('  Run with --write to auto-format');
      }
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { lintAndFormat, runESLint, runPrettier };