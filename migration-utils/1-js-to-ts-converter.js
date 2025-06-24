#!/usr/bin/env node

/**
 * JavaScript to TypeScript Converter
 * Converts .js files to .ts with basic type annotations
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const CONVERSION_LOG = path.join(__dirname, 'conversion-log.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Basic type patterns to detect and annotate
const TYPE_PATTERNS = [
  // Function parameters with default values
  { pattern: /function\s+(\w+)\s*\(([^)]*=\s*['"`][\w\s]*['"`][^)]*)\)/g, replacement: 'function $1($2: string)' },
  { pattern: /function\s+(\w+)\s*\(([^)]*=\s*\d+[^)]*)\)/g, replacement: 'function $1($2: number)' },
  { pattern: /function\s+(\w+)\s*\(([^)]*=\s*(true|false)[^)]*)\)/g, replacement: 'function $1($2: boolean)' },
  { pattern: /function\s+(\w+)\s*\(([^)]*=\s*\[\][^)]*)\)/g, replacement: 'function $1($2: any[])' },
  { pattern: /function\s+(\w+)\s*\(([^)]*=\s*\{\}[^)]*)\)/g, replacement: 'function $1($2: Record<string, any>)' },
  
  // Arrow functions with default values
  { pattern: /const\s+(\w+)\s*=\s*\(([^)]*=\s*['"`][\w\s]*['"`][^)]*)\)\s*=>/g, replacement: 'const $1 = ($2: string) =>' },
  { pattern: /const\s+(\w+)\s*=\s*\(([^)]*=\s*\d+[^)]*)\)\s*=>/g, replacement: 'const $1 = ($2: number) =>' },
  { pattern: /const\s+(\w+)\s*=\s*\(([^)]*=\s*(true|false)[^)]*)\)\s*=>/g, replacement: 'const $1 = ($2: boolean) =>' },
  
  // Express route handlers
  { pattern: /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(async\s*)?\(\s*req\s*,\s*res\s*\)/g, 
    replacement: '.$1(\'$2\', $3(req: Request, res: Response)' },
  { pattern: /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(async\s*)?\(\s*req\s*,\s*res\s*,\s*next\s*\)/g, 
    replacement: '.$1(\'$2\', $3(req: Request, res: Response, next: NextFunction)' },
];

// Common imports to add for TypeScript
const COMMON_IMPORTS = {
  express: "import { Request, Response, NextFunction } from 'express';",
  mongoose: "import { Document, Schema, Model } from 'mongoose';",
  axios: "import { AxiosResponse, AxiosError } from 'axios';",
};

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

async function loadConversionLog() {
  try {
    const data = await fs.readFile(CONVERSION_LOG, 'utf8');
    return JSON.parse(data);
  } catch {
    return { conversions: [], timestamp: new Date().toISOString() };
  }
}

async function saveConversionLog(log) {
  await fs.writeFile(CONVERSION_LOG, JSON.stringify(log, null, 2));
}

async function backupFile(filePath) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const fileName = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, `${fileName}.${timestamp}.backup`);
  
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

async function detectRequiredImports(content) {
  const imports = [];
  
  // Detect Express usage
  if (content.includes('express()') || content.includes('Router()')) {
    imports.push(COMMON_IMPORTS.express);
  }
  
  // Detect Mongoose usage
  if (content.includes('mongoose.model') || content.includes('new Schema')) {
    imports.push(COMMON_IMPORTS.mongoose);
  }
  
  // Detect Axios usage
  if (content.includes('axios.') || content.includes('axios(')) {
    imports.push(COMMON_IMPORTS.axios);
  }
  
  return imports;
}

async function convertJsToTs(filePath, options = {}) {
  console.log(`Converting ${filePath}...`);
  
  try {
    // Read the file
    let content = await fs.readFile(filePath, 'utf8');
    
    // Create backup
    const backupPath = await backupFile(filePath);
    console.log(`  Backup created: ${backupPath}`);
    
    // Apply type patterns
    TYPE_PATTERNS.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });
    
    // Add TypeScript-specific imports
    const requiredImports = await detectRequiredImports(content);
    if (requiredImports.length > 0) {
      // Find the last import statement or the beginning of the file
      const importMatch = content.match(/^((?:import|const|require)[\s\S]*?)(\n\n|\n(?!import|const.*require))/m);
      if (importMatch) {
        const [fullMatch, imports, separator] = importMatch;
        content = content.replace(fullMatch, imports + '\n' + requiredImports.join('\n') + separator);
      } else {
        content = requiredImports.join('\n') + '\n\n' + content;
      }
    }
    
    // Add basic JSDoc type annotations for common patterns
    content = addJSDocTypes(content);
    
    // Change file extension
    const tsFilePath = filePath.replace(/\.js$/, '.ts');
    
    // Write the converted file
    await fs.writeFile(tsFilePath, content);
    
    // Delete the original JS file if specified
    if (options.deleteOriginal) {
      await fs.unlink(filePath);
    }
    
    console.log(`  ✓ Converted to ${tsFilePath}`);
    
    return {
      success: true,
      originalPath: filePath,
      convertedPath: tsFilePath,
      backupPath: backupPath,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`  ✗ Failed to convert ${filePath}:`, error.message);
    return {
      success: false,
      originalPath: filePath,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function addJSDocTypes(content) {
  // Add return type annotations for obvious cases
  content = content.replace(
    /^(\s*)(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?return\s+true;/gm,
    '$1/**\n$1 * @returns {Promise<boolean>}\n$1 */\n$1$2function $3'
  );
  
  content = content.replace(
    /^(\s*)(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?return\s+false;/gm,
    '$1/**\n$1 * @returns {Promise<boolean>}\n$1 */\n$1$2function $3'
  );
  
  content = content.replace(
    /^(\s*)(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?return\s+\d+;/gm,
    '$1/**\n$1 * @returns {Promise<number>}\n$1 */\n$1$2function $3'
  );
  
  return content;
}

async function convertDirectory(dirPath, options = {}) {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  const results = [];
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory() && !options.excludeDirs?.includes(file.name)) {
      // Recursively convert subdirectories
      const subResults = await convertDirectory(fullPath, options);
      results.push(...subResults);
    } else if (file.isFile() && file.name.endsWith('.js') && !file.name.endsWith('.test.js')) {
      // Convert JS files (excluding test files by default)
      const result = await convertJsToTs(fullPath, options);
      results.push(result);
    }
  }
  
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node js-to-ts-converter.js <file-or-directory> [options]');
    console.log('Options:');
    console.log('  --delete-original    Delete original JS files after conversion');
    console.log('  --exclude-dirs       Comma-separated list of directories to exclude');
    console.log('  --include-tests      Include test files in conversion');
    process.exit(1);
  }
  
  const target = args[0];
  const options = {
    deleteOriginal: args.includes('--delete-original'),
    excludeDirs: args.find(arg => arg.startsWith('--exclude-dirs='))?.split('=')[1]?.split(',') || ['node_modules', 'dist', 'build'],
    includeTests: args.includes('--include-tests')
  };
  
  await ensureBackupDir();
  
  const stats = await fs.stat(target);
  let results = [];
  
  if (stats.isDirectory()) {
    console.log(`Converting all JS files in ${target}...`);
    results = await convertDirectory(target, options);
  } else if (stats.isFile() && target.endsWith('.js')) {
    results = [await convertJsToTs(target, options)];
  } else {
    console.error('Target must be a JavaScript file or directory');
    process.exit(1);
  }
  
  // Save conversion log
  const log = await loadConversionLog();
  log.conversions.push(...results);
  await saveConversionLog(log);
  
  // Print summary
  console.log('\n=== Conversion Summary ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Total files: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed conversions:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.originalPath}: ${r.error}`);
    });
  }
  
  console.log(`\nConversion log saved to: ${CONVERSION_LOG}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convertJsToTs, convertDirectory };