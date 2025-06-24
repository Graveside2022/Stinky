#!/usr/bin/env node

/**
 * Main Migration Orchestrator
 * Coordinates the entire TypeScript migration process
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function runScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const script = spawn('node', [path.join(__dirname, scriptName), ...args], {
      stdio: 'inherit'
    });
    
    script.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`));
      }
    });
  });
}

async function createTsConfig(projectPath) {
  const tsConfigPath = path.join(projectPath, 'tsconfig.json');
  
  try {
    await fs.access(tsConfigPath);
    console.log('tsconfig.json already exists');
    return;
  } catch {
    // File doesn't exist, create it
  }
  
  const tsConfig = {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./",
      "strict": false,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "allowJs": true,
      "checkJs": false,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "removeComments": false,
      "noImplicitAny": false,
      "strictNullChecks": false,
      "strictFunctionTypes": false,
      "noImplicitThis": false,
      "alwaysStrict": false
    },
    "include": ["**/*.ts", "**/*.js"],
    "exclude": ["node_modules", "dist", "build", "migration-utils"]
  };
  
  await fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
  console.log('Created tsconfig.json with permissive settings');
}

async function selectMigrationTarget() {
  console.log('\n=== Select Migration Target ===');
  console.log('1. Entire project');
  console.log('2. Specific directory');
  console.log('3. Single file');
  console.log('4. Custom path');
  
  const choice = await question('\nSelect option (1-4): ');
  
  switch (choice) {
    case '1':
      return '.';
    case '2': {
      // List directories
      const dirs = await fs.readdir('.', { withFileTypes: true });
      const directories = dirs
        .filter(d => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
        .map(d => d.name);
      
      console.log('\nAvailable directories:');
      directories.forEach((dir, i) => console.log(`${i + 1}. ${dir}`));
      
      const dirChoice = await question('\nSelect directory number: ');
      const index = parseInt(dirChoice) - 1;
      
      if (index >= 0 && index < directories.length) {
        return directories[index];
      }
      break;
    }
    case '3': {
      const filePath = await question('Enter file path: ');
      return filePath;
    }
    case '4': {
      const customPath = await question('Enter custom path: ');
      return customPath;
    }
  }
  
  throw new Error('Invalid selection');
}

async function migrationWizard() {
  console.log('=== TypeScript Migration Wizard ===\n');
  
  // Step 1: Check current directory
  const cwd = process.cwd();
  console.log(`Current directory: ${cwd}`);
  
  const proceed = await question('\nProceed with migration in this directory? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes') {
    console.log('Migration cancelled');
    return;
  }
  
  // Step 2: Create tsconfig.json if needed
  await createTsConfig(cwd);
  
  // Step 3: Select migration target
  const target = await selectMigrationTarget();
  console.log(`\nMigration target: ${target}`);
  
  // Step 4: Migration options
  console.log('\n=== Migration Options ===');
  const deleteOriginal = await question('Delete original JS files after conversion? (yes/no): ');
  const autoFix = await question('Auto-fix linting issues? (yes/no): ');
  const autoFormat = await question('Auto-format with Prettier? (yes/no): ');
  
  // Step 5: Start migration
  console.log('\n=== Starting Migration ===\n');
  
  try {
    // Convert files
    console.log('Step 1: Converting JavaScript to TypeScript...');
    const convertArgs = [target];
    if (deleteOriginal.toLowerCase() === 'yes') {
      convertArgs.push('--delete-original');
    }
    await runScript('1-js-to-ts-converter.js', convertArgs);
    
    // Lint and format
    console.log('\nStep 2: Linting and formatting...');
    const lintArgs = [target, '--setup'];
    if (autoFix.toLowerCase() === 'yes') {
      lintArgs.push('--fix');
    }
    if (autoFormat.toLowerCase() === 'yes') {
      lintArgs.push('--write');
    }
    await runScript('2-lint-and-format.js', lintArgs);
    
    // Verify functionality
    console.log('\nStep 3: Verifying functionality...');
    await runScript('3-verify-functionality.js', [cwd, '--quick']);
    
    // Show progress
    console.log('\nStep 4: Migration progress...');
    await runScript('5-progress-tracker.js', [cwd, '--html']);
    
    console.log('\n=== Migration Complete ===');
    console.log('Check migration-progress.html for detailed report');
    
  } catch (error) {
    console.error('\n=== Migration Failed ===');
    console.error(error.message);
    
    const rollback = await question('\nDo you want to rollback the changes? (yes/no): ');
    if (rollback.toLowerCase() === 'yes') {
      await runScript('4-rollback.js', ['--all', '--force']);
      console.log('Changes have been rolled back');
    }
  }
  
  rl.close();
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('TypeScript Migration Tool');
    console.log('\nUsage:');
    console.log('  node migrate.js              Run interactive migration wizard');
    console.log('  node migrate.js --quick      Quick migration with defaults');
    console.log('  node migrate.js --help       Show this help message');
    console.log('\nIndividual tools:');
    console.log('  npm run convert   - Convert JS to TS');
    console.log('  npm run lint      - Lint and format');
    console.log('  npm run verify    - Verify functionality');
    console.log('  npm run rollback  - Rollback changes');
    console.log('  npm run progress  - Track progress');
    process.exit(0);
  }
  
  if (args.includes('--quick')) {
    // Quick migration with defaults
    try {
      console.log('Running quick migration...\n');
      await createTsConfig(process.cwd());
      await runScript('1-js-to-ts-converter.js', ['.']);
      await runScript('2-lint-and-format.js', ['.', '--setup', '--fix', '--write']);
      await runScript('3-verify-functionality.js', ['.', '--quick']);
      await runScript('5-progress-tracker.js', ['.', '--html']);
      console.log('\nQuick migration complete!');
    } catch (error) {
      console.error('Migration failed:', error.message);
      process.exit(1);
    }
  } else {
    // Interactive wizard
    await migrationWizard();
  }
}

if (require.main === module) {
  main().catch(console.error);
}