# TypeScript Migration Utilities

A comprehensive set of tools to safely migrate JavaScript projects to TypeScript.

## Quick Start

```bash
# Convert a single file
node 1-js-to-ts-converter.js src/server.js

# Convert entire directory
node 1-js-to-ts-converter.js src/ --exclude-dirs=test,fixtures

# Lint and format converted files
node 2-lint-and-format.js src/ --fix --write

# Verify functionality
node 3-verify-functionality.js . --service=wigletotak

# Track progress
node 5-progress-tracker.js . --watch
```

## Tools Overview

### 1. JavaScript to TypeScript Converter

Converts `.js` files to `.ts` with basic type annotations.

**Features:**

- Automatic backup creation before conversion
- Basic type inference for function parameters
- Express route handler type annotations
- Common TypeScript imports detection
- Batch conversion for directories

**Usage:**

```bash
node 1-js-to-ts-converter.js <file-or-directory> [options]

Options:
  --delete-original    Delete original JS files after conversion
  --exclude-dirs       Comma-separated list of directories to exclude
  --include-tests      Include test files in conversion
```

### 2. Lint and Format Tool

Runs ESLint and Prettier on converted TypeScript files.

**Features:**

- Automatic dependency installation
- ESLint configuration for TypeScript
- Prettier formatting
- Detailed error reporting
- Auto-fix capabilities

**Usage:**

```bash
node 2-lint-and-format.js <file-or-directory> [options]

Options:
  --fix          Auto-fix ESLint issues
  --write        Auto-format with Prettier
  --verbose      Show detailed error messages
  --setup        Create config files if missing
```

### 3. Functionality Verifier

Comprehensive testing after conversion.

**Features:**

- TypeScript compilation check
- Dependency vulnerability scan
- Build process verification
- Test suite execution
- Service health checks

**Usage:**

```bash
node 3-verify-functionality.js <project-path> [options]

Options:
  --skip-typescript    Skip TypeScript compilation check
  --skip-dependencies  Skip dependency audit
  --skip-build        Skip build process check
  --skip-tests        Skip test execution
  --skip-health       Skip service health checks
  --service=<name>    Service name for health check
  --quick             Skip all optional checks
```

### 4. Rollback Tool

Restore original JavaScript files from backups.

**Features:**

- Interactive and command-line modes
- Rollback by timestamp
- Selective file rollback
- Conversion history viewing
- Automatic TypeScript file cleanup

**Usage:**

```bash
# Interactive mode
node 4-rollback.js

# Command line mode
node 4-rollback.js --all --force
node 4-rollback.js --timestamp "2024-01-01 12:00:00"
node 4-rollback.js --files src/server.js src/app.js
```

### 5. Progress Tracker

Monitor migration progress with detailed metrics.

**Features:**

- Real-time progress monitoring
- Code quality metrics
- Issue tracking
- HTML report generation
- Watch mode with live updates

**Usage:**

```bash
node 5-progress-tracker.js <project-path> [options]

Options:
  --watch              Watch progress with live updates
  --interval=<ms>      Update interval for watch mode (default: 30000)
  --html               Generate HTML report
  --json               Output raw JSON data
```

## Migration Workflow

### Recommended Process:

1. **Preparation**

   ```bash
   # Create a new branch
   git checkout -b typescript-migration

   # Install migration tools dependencies
   cd migration-utils
   npm install
   ```

2. **Initial Conversion**

   ```bash
   # Convert a test directory first
   node 1-js-to-ts-converter.js src/utils/

   # Check the results
   node 5-progress-tracker.js .
   ```

3. **Quality Check**

   ```bash
   # Run linting with auto-fix
   node 2-lint-and-format.js src/utils/ --fix --write

   # Verify functionality
   node 3-verify-functionality.js .
   ```

4. **Fix Issues**

   - Manually resolve type errors
   - Update imports as needed
   - Fix failing tests

5. **Full Migration**

   ```bash
   # Convert entire project
   node 1-js-to-ts-converter.js src/ --exclude-dirs=test

   # Monitor progress
   node 5-progress-tracker.js . --watch --html
   ```

6. **Rollback if Needed**

   ```bash
   # Interactive rollback
   node 4-rollback.js

   # Or rollback specific files
   node 4-rollback.js --files src/problematic-file.js
   ```

## Safety Features

- **Automatic Backups**: Every converted file is backed up
- **Conversion Logging**: All operations are logged for audit
- **Incremental Migration**: Convert one module at a time
- **Easy Rollback**: Restore original files anytime
- **Progress Tracking**: Monitor migration status

## Configuration Files

The tools will create these configuration files:

- `.eslintrc.json` - ESLint configuration for TypeScript
- `.prettierrc.json` - Prettier formatting rules
- `tsconfig.json` - TypeScript compiler configuration (create manually)

## Log Files

Generated in the `migration-utils` directory:

- `conversion-log.json` - Conversion history
- `lint-log.json` - Linting results
- `verification-log.json` - Functionality test results
- `rollback-log.json` - Rollback operations
- `migration-progress.html` - Visual progress report

## Tips

1. **Start Small**: Convert utility modules first
2. **Fix Incrementally**: Address type errors file by file
3. **Use `any` Temporarily**: Replace with proper types later
4. **Test Frequently**: Run tests after each module conversion
5. **Commit Often**: Create checkpoints for easy rollback

## Troubleshooting

**Issue**: TypeScript compilation errors

- Start with `tsconfig.json` with loose settings
- Gradually enable stricter options

**Issue**: Test failures after conversion

- Check for module resolution issues
- Verify test file imports

**Issue**: Service won't start

- Check for missing type definitions
- Install @types packages as needed

## Example tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Start with loose settings and gradually enable stricter options as you fix type issues.
