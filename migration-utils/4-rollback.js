#!/usr/bin/env node

/**
 * Rollback Script
 * Restores JavaScript files from backups in case of migration issues
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const BACKUP_DIR = path.join(__dirname, 'backups');
const CONVERSION_LOG = path.join(__dirname, 'conversion-log.json');
const ROLLBACK_LOG = path.join(__dirname, 'rollback-log.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function loadConversionLog() {
  try {
    const data = await fs.readFile(CONVERSION_LOG, 'utf8');
    return JSON.parse(data);
  } catch {
    console.error('No conversion log found. Nothing to rollback.');
    return null;
  }
}

async function getBackupFiles() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    return files.filter(f => f.endsWith('.backup'));
  } catch {
    console.error('No backup directory found.');
    return [];
  }
}

async function parseBackupFilename(filename) {
  // Format: originalname.js.2024-01-01T12-00-00.backup
  const match = filename.match(/^(.+\.js)\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.backup$/);
  if (match) {
    return {
      originalName: match[1],
      timestamp: match[2].replace(/-/g, ':').replace('T', ' ')
    };
  }
  return null;
}

async function rollbackFile(backupPath, targetPath, deleteConverted = true) {
  console.log(`Restoring ${targetPath}...`);
  
  try {
    // Copy backup to original location
    await fs.copyFile(backupPath, targetPath);
    console.log(`  ✓ Restored from backup`);
    
    // Delete the TypeScript file if it exists
    if (deleteConverted) {
      const tsPath = targetPath.replace(/\.js$/, '.ts');
      try {
        await fs.unlink(tsPath);
        console.log(`  ✓ Deleted ${path.basename(tsPath)}`);
      } catch {
        // TypeScript file doesn't exist, that's fine
      }
    }
    
    return { success: true, targetPath, backupPath };
  } catch (error) {
    console.error(`  ✗ Failed to restore: ${error.message}`);
    return { success: false, targetPath, error: error.message };
  }
}

async function rollbackByTimestamp(timestamp) {
  const log = await loadConversionLog();
  if (!log) return [];
  
  // Find all conversions at or after the given timestamp
  const conversionsToRollback = log.conversions.filter(c => 
    c.success && new Date(c.timestamp) >= new Date(timestamp)
  );
  
  if (conversionsToRollback.length === 0) {
    console.log('No conversions found after the specified timestamp.');
    return [];
  }
  
  console.log(`Found ${conversionsToRollback.length} files to rollback`);
  const results = [];
  
  for (const conversion of conversionsToRollback) {
    const result = await rollbackFile(
      conversion.backupPath,
      conversion.originalPath
    );
    results.push(result);
  }
  
  return results;
}

async function rollbackSpecificFiles(files) {
  const results = [];
  
  for (const file of files) {
    // Find the most recent backup for this file
    const backupFiles = await getBackupFiles();
    const fileBackups = [];
    
    for (const backup of backupFiles) {
      const parsed = await parseBackupFilename(backup);
      if (parsed && parsed.originalName === path.basename(file)) {
        fileBackups.push({
          backupPath: path.join(BACKUP_DIR, backup),
          timestamp: parsed.timestamp
        });
      }
    }
    
    if (fileBackups.length === 0) {
      console.log(`No backup found for ${file}`);
      results.push({ success: false, targetPath: file, error: 'No backup found' });
      continue;
    }
    
    // Sort by timestamp and use the most recent
    fileBackups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const mostRecent = fileBackups[0];
    
    const result = await rollbackFile(mostRecent.backupPath, file);
    results.push(result);
  }
  
  return results;
}

async function rollbackAll() {
  const log = await loadConversionLog();
  if (!log) return [];
  
  const successfulConversions = log.conversions.filter(c => c.success);
  
  if (successfulConversions.length === 0) {
    console.log('No successful conversions to rollback.');
    return [];
  }
  
  console.log(`Rolling back ${successfulConversions.length} files...`);
  const results = [];
  
  for (const conversion of successfulConversions) {
    const result = await rollbackFile(
      conversion.backupPath,
      conversion.originalPath
    );
    results.push(result);
  }
  
  return results;
}

async function interactiveRollback() {
  console.log('\n=== Interactive Rollback ===');
  console.log('1. Rollback all conversions');
  console.log('2. Rollback by timestamp');
  console.log('3. Rollback specific files');
  console.log('4. Show conversion history');
  console.log('5. Exit');
  
  const choice = await question('\nSelect an option (1-5): ');
  
  switch (choice) {
    case '1': {
      const confirm = await question('Are you sure you want to rollback ALL conversions? (yes/no): ');
      if (confirm.toLowerCase() === 'yes') {
        return await rollbackAll();
      }
      break;
    }
    
    case '2': {
      const timestamp = await question('Enter timestamp (YYYY-MM-DD HH:MM:SS): ');
      return await rollbackByTimestamp(timestamp);
    }
    
    case '3': {
      const files = await question('Enter file paths (comma-separated): ');
      const filePaths = files.split(',').map(f => f.trim()).filter(Boolean);
      return await rollbackSpecificFiles(filePaths);
    }
    
    case '4': {
      const log = await loadConversionLog();
      if (log) {
        console.log('\n=== Conversion History ===');
        log.conversions.forEach(c => {
          const status = c.success ? '✓' : '✗';
          console.log(`${status} ${c.originalPath} -> ${c.convertedPath || 'FAILED'}`);
          console.log(`   Timestamp: ${c.timestamp}`);
          if (c.backupPath) {
            console.log(`   Backup: ${c.backupPath}`);
          }
        });
      }
      return null;
    }
    
    case '5':
      return null;
      
    default:
      console.log('Invalid option');
      return null;
  }
}

async function saveRollbackLog(results) {
  let log;
  try {
    const data = await fs.readFile(ROLLBACK_LOG, 'utf8');
    log = JSON.parse(data);
  } catch {
    log = { rollbacks: [] };
  }
  
  log.rollbacks.push({
    timestamp: new Date().toISOString(),
    results: results
  });
  
  await fs.writeFile(ROLLBACK_LOG, JSON.stringify(log, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    const results = await interactiveRollback();
    if (results) {
      await saveRollbackLog(results);
      
      // Print summary
      console.log('\n=== Rollback Summary ===');
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`Total files: ${results.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);
      
      if (failed > 0) {
        console.log('\nFailed rollbacks:');
        results.filter(r => !r.success).forEach(r => {
          console.log(`  - ${r.targetPath}: ${r.error}`);
        });
      }
    }
  } else {
    // Command line mode
    const command = args[0];
    let results = [];
    
    switch (command) {
      case '--all':
        const confirm = args[1] === '--force';
        if (!confirm) {
          console.log('Use --all --force to rollback all conversions');
          process.exit(1);
        }
        results = await rollbackAll();
        break;
        
      case '--timestamp':
        if (!args[1]) {
          console.log('Usage: --timestamp "YYYY-MM-DD HH:MM:SS"');
          process.exit(1);
        }
        results = await rollbackByTimestamp(args[1]);
        break;
        
      case '--files':
        const files = args.slice(1);
        if (files.length === 0) {
          console.log('Usage: --files file1.js file2.js ...');
          process.exit(1);
        }
        results = await rollbackSpecificFiles(files);
        break;
        
      default:
        console.log('Usage: node rollback.js [options]');
        console.log('Options:');
        console.log('  (no options)     Interactive mode');
        console.log('  --all --force    Rollback all conversions');
        console.log('  --timestamp      Rollback conversions after timestamp');
        console.log('  --files          Rollback specific files');
        process.exit(1);
    }
    
    if (results.length > 0) {
      await saveRollbackLog(results);
      const successful = results.filter(r => r.success).length;
      console.log(`\nRolled back ${successful} of ${results.length} files`);
    }
  }
  
  rl.close();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { rollbackFile, rollbackAll, rollbackByTimestamp };