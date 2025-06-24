# Stinkster TypeScript + Prettier + ESLint Tooling Setup

This document provides a comprehensive guide for setting up TypeScript, Prettier, and ESLint for the Stinkster project.

## 1. NPM Packages to Install

### Core TypeScript Dependencies
```bash
npm install --save-dev \
  typescript@^5.3.3 \
  @types/node@^20.11.0 \
  ts-node@^10.9.2 \
  tsx@^4.7.0
```

### ESLint and Related Packages
```bash
npm install --save-dev \
  eslint@^8.56.0 \
  @typescript-eslint/parser@^6.19.0 \
  @typescript-eslint/eslint-plugin@^6.19.0 \
  eslint-config-prettier@^9.1.0 \
  eslint-plugin-prettier@^5.1.3 \
  eslint-plugin-import@^2.29.1 \
  eslint-plugin-node@^11.1.0 \
  eslint-plugin-promise@^6.1.1 \
  eslint-plugin-security@^2.1.0 \
  eslint-import-resolver-typescript@^3.6.1
```

### Prettier
```bash
npm install --save-dev \
  prettier@^3.2.4
```

### Pre-commit Hooks
```bash
npm install --save-dev \
  husky@^8.0.3 \
  lint-staged@^15.2.0 \
  @commitlint/cli@^18.4.4 \
  @commitlint/config-conventional@^18.4.4
```

### Development Tools
```bash
npm install --save-dev \
  nodemon@^3.0.3 \
  concurrently@^8.2.2 \
  cross-env@^7.0.3
```

### Complete Installation Command
```bash
npm install --save-dev typescript@^5.3.3 @types/node@^20.11.0 ts-node@^10.9.2 tsx@^4.7.0 eslint@^8.56.0 @typescript-eslint/parser@^6.19.0 @typescript-eslint/eslint-plugin@^6.19.0 eslint-config-prettier@^9.1.0 eslint-plugin-prettier@^5.1.3 eslint-plugin-import@^2.29.1 eslint-plugin-node@^11.1.0 eslint-plugin-promise@^6.1.1 eslint-plugin-security@^2.1.0 eslint-import-resolver-typescript@^3.6.1 prettier@^3.2.4 husky@^8.0.3 lint-staged@^15.2.0 @commitlint/cli@^18.4.4 @commitlint/config-conventional@^18.4.4 nodemon@^3.0.3 concurrently@^8.2.2 cross-env@^7.0.3
```

## 2. Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "commonjs",
    "moduleResolution": "node",
    
    // Emit
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    
    // Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    
    // JavaScript Support
    "allowJs": true,
    "checkJs": true,
    
    // Interop Constraints
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    
    // Skip Lib Check
    "skipLibCheck": true,
    
    // Experimental
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    
    // Advanced
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@config/*": ["src/config/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  },
  "include": [
    "src/**/*",
    "scripts/**/*",
    "test/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.spec.ts",
    "**/*.test.ts"
  ],
  "ts-node": {
    "transpileOnly": true,
    "files": true,
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}
```

### .eslintrc.json
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "import",
    "node",
    "promise",
    "security",
    "prettier"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:node/recommended",
    "plugin:promise/recommended",
    "plugin:security/recommended",
    "plugin:prettier/recommended"
  ],
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  },
  "env": {
    "node": true,
    "es2022": true,
    "browser": true
  },
  "rules": {
    // TypeScript specific rules
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        "prefer": "type-imports"
      }
    ],
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"],
        "prefix": ["I"]
      },
      {
        "selector": "typeAlias",
        "format": ["PascalCase"]
      },
      {
        "selector": "enum",
        "format": ["PascalCase"]
      }
    ],
    
    // Import rules
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "import/no-duplicates": "error",
    "import/no-cycle": "error",
    "import/no-unused-modules": "error",
    
    // Node rules
    "node/no-unpublished-require": "off",
    "node/no-unsupported-features/es-syntax": "off",
    "node/no-missing-import": "off",
    
    // General rules
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "brace-style": ["error", "1tbs"],
    
    // Prettier integration
    "prettier/prettier": "error"
  },
  "overrides": [
    {
      "files": ["*.test.ts", "*.spec.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "security/detect-non-literal-fs-filename": "off"
      }
    },
    {
      "files": ["scripts/**/*.ts"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

### .prettierrc.json
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "all",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "endOfLine": "lf",
  "embeddedLanguageFormatting": "auto",
  "singleAttributePerLine": false
}
```

### .prettierignore
```
# Dependencies
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml

# Build outputs
dist/
build/
coverage/
.next/
out/

# Cache
.cache/
.parcel-cache/
.turbo/

# Logs
*.log
logs/

# Environment files
.env
.env.*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Generated files
*.min.js
*.min.css
*.map

# Documentation
docs/api/

# Temporary files
tmp/
temp/

# Backup files
*.bak
*.backup

# Archive files
archive/
*.tar.gz
*.zip
```

### .editorconfig
```ini
# EditorConfig is awesome: https://EditorConfig.org

# Top-most EditorConfig file
root = true

# Universal settings
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

# TypeScript and JavaScript
[*.{ts,tsx,js,jsx,mjs,cjs}]
indent_size = 2
quote_type = single

# JSON
[*.json]
indent_size = 2

# YAML
[*.{yml,yaml}]
indent_size = 2

# Markdown
[*.md]
trim_trailing_whitespace = false
max_line_length = 100

# Makefile
[Makefile]
indent_style = tab

# Python (if any)
[*.py]
indent_size = 4

# Shell scripts
[*.sh]
indent_size = 2

# Dockerfile
[Dockerfile*]
indent_size = 2
```

### .commitlintrc.json
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
        "wip"
      ]
    ],
    "scope-enum": [
      2,
      "always",
      [
        "sdr",
        "wifi",
        "gps",
        "tak",
        "api",
        "ui",
        "config",
        "deps",
        "docker",
        "scripts",
        "tests",
        "docs"
      ]
    ],
    "subject-case": [2, "always", "lower-case"],
    "header-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
    "footer-max-line-length": [2, "always", 100]
  },
  "prompt": {
    "questions": {
      "type": {
        "description": "Select the type of change that you're committing",
        "enum": {
          "feat": {
            "description": "A new feature",
            "title": "Features",
            "emoji": "✨"
          },
          "fix": {
            "description": "A bug fix",
            "title": "Bug Fixes",
            "emoji": "🐛"
          },
          "docs": {
            "description": "Documentation only changes",
            "title": "Documentation",
            "emoji": "📚"
          },
          "style": {
            "description": "Changes that do not affect the meaning of the code",
            "title": "Styles",
            "emoji": "💎"
          },
          "refactor": {
            "description": "A code change that neither fixes a bug nor adds a feature",
            "title": "Code Refactoring",
            "emoji": "📦"
          },
          "perf": {
            "description": "A code change that improves performance",
            "title": "Performance Improvements",
            "emoji": "🚀"
          },
          "test": {
            "description": "Adding missing tests or correcting existing tests",
            "title": "Tests",
            "emoji": "🚨"
          },
          "build": {
            "description": "Changes that affect the build system or external dependencies",
            "title": "Builds",
            "emoji": "🛠"
          },
          "ci": {
            "description": "Changes to our CI configuration files and scripts",
            "title": "Continuous Integrations",
            "emoji": "⚙️"
          },
          "chore": {
            "description": "Other changes that don't modify src or test files",
            "title": "Chores",
            "emoji": "♻️"
          },
          "revert": {
            "description": "Reverts a previous commit",
            "title": "Reverts",
            "emoji": "🗑"
          }
        }
      }
    }
  }
}
```

### .lintstagedrc.json
```json
{
  "*.{ts,tsx,js,jsx,mjs,cjs}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ],
  "*.{css,scss,sass,less}": [
    "prettier --write"
  ],
  "package.json": [
    "prettier --write",
    "npx sort-package-json"
  ]
}
```

### .huskyrc.json
```json
{
  "hooks": {
    "pre-commit": "lint-staged",
    "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
    "pre-push": "npm run type-check && npm run lint && npm run test"
  }
}
```

## 3. VS Code Settings

### .vscode/settings.json
```json
{
  // Editor settings
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.rulers": [100],
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.trimAutoWhitespace": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.eol": "\n",
  
  // TypeScript settings
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.importModuleSpecifier": "shortest",
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.suggest.autoImports": true,
  "typescript.suggest.completeFunctionCalls": true,
  "typescript.inlayHints.parameterNames.enabled": "all",
  "typescript.inlayHints.functionLikeReturnTypes.enabled": true,
  
  // ESLint settings
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.run": "onType",
  "eslint.probe": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "html",
    "vue",
    "markdown"
  ],
  
  // Prettier settings
  "prettier.requireConfig": true,
  "prettier.ignorePath": ".prettierignore",
  
  // File associations
  "files.associations": {
    "*.css": "css",
    ".prettierrc": "json",
    ".eslintrc": "json",
    ".lintstagedrc": "json",
    ".huskyrc": "json"
  },
  
  // Search exclusions
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.git": true,
    "**/.DS_Store": true,
    "**/tmp": true,
    "**/temp": true,
    "**/*.log": true
  },
  
  // File watcher exclusions
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/coverage/**": true,
    "**/tmp/**": true,
    "**/logs/**": true
  },
  
  // Stinkster-specific settings
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.wordWrap": "on"
  }
}
```

### .vscode/extensions.json
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "streetsidesoftware.code-spell-checker",
    "editorconfig.editorconfig",
    "mikestead.dotenv",
    "christian-kohler.path-intellisense",
    "aaron-bond.better-comments",
    "wayou.vscode-todo-highlight",
    "gruntfuggly.todo-tree",
    "eamodio.gitlens",
    "donjayamanne.githistory",
    "mhutchie.git-graph",
    "usernamehw.errorlens",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "naumovs.color-highlight",
    "pranaygp.vscode-css-peek",
    "kisstkondoros.vscode-gutter-preview",
    "oderwat.indent-rainbow",
    "shardulm94.trailing-spaces",
    "mechatroner.rainbow-csv",
    "redhat.vscode-yaml",
    "davidanson.vscode-markdownlint"
  ]
}
```

### .vscode/launch.json
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "npm: build",
      "sourceMaps": true,
      "smartStep": true,
      "internalConsoleOptions": "openOnSessionStart",
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current TS File",
      "program": "${file}",
      "runtimeArgs": [
        "-r",
        "ts-node/register"
      ],
      "sourceMaps": true,
      "cwd": "${workspaceFolder}",
      "protocol": "inspector",
      "env": {
        "NODE_ENV": "development",
        "TS_NODE_PROJECT": "${workspaceFolder}/tsconfig.json"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--detectOpenHandles"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "env": {
        "NODE_ENV": "test"
      }
    }
  ]
}
```

### .vscode/tasks.json
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "TypeScript: Build",
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": "$tsc",
      "detail": "Build TypeScript files"
    },
    {
      "label": "TypeScript: Watch",
      "type": "npm",
      "script": "watch",
      "isBackground": true,
      "problemMatcher": "$tsc-watch",
      "detail": "Watch TypeScript files for changes"
    },
    {
      "label": "ESLint: Check",
      "type": "npm",
      "script": "lint",
      "problemMatcher": "$eslint-stylish",
      "detail": "Run ESLint on all files"
    },
    {
      "label": "ESLint: Fix",
      "type": "npm",
      "script": "lint:fix",
      "problemMatcher": "$eslint-stylish",
      "detail": "Run ESLint and fix issues"
    },
    {
      "label": "Prettier: Check",
      "type": "npm",
      "script": "format:check",
      "detail": "Check code formatting"
    },
    {
      "label": "Prettier: Format",
      "type": "npm",
      "script": "format",
      "detail": "Format all files"
    },
    {
      "label": "Tests: Run",
      "type": "npm",
      "script": "test",
      "group": "test",
      "problemMatcher": "$jest",
      "detail": "Run all tests"
    },
    {
      "label": "Tests: Watch",
      "type": "npm",
      "script": "test:watch",
      "isBackground": true,
      "problemMatcher": "$jest-watch",
      "detail": "Run tests in watch mode"
    }
  ]
}
```

## 4. Pre-commit Hooks Setup

### Initialize Husky
```bash
# Initialize husky
npx husky install

# Add husky install to prepare script
npm pkg set scripts.prepare="husky install"

# Create pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Create commit-msg hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

# Create pre-push hook
npx husky add .husky/pre-push "npm run type-check && npm run lint && npm run test:ci"
```

## 5. Updated package.json Scripts

Add these scripts to your package.json:

```json
{
  "scripts": {
    "dev": "concurrently \"npm:watch:*\"",
    "build": "npm run clean && npm run build:ts && npm run build:css",
    "build:ts": "tsc",
    "build:css": "tailwindcss -i ./src/styles.css -o ./assets/css/styles.css --minify",
    "watch": "concurrently \"npm:watch:*\"",
    "watch:ts": "tsc --watch",
    "watch:css": "tailwindcss -i ./src/styles.css -o ./assets/css/styles.css --watch",
    "clean": "rimraf dist coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css,scss}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css,scss}\"",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:coverage": "jest --coverage",
    "prepare": "husky install",
    "pre-commit": "lint-staged",
    "commit": "cz",
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:patch": "standard-version --release-as patch",
    "release:major": "standard-version --release-as major"
  }
}
```

## 6. CI/CD Pipeline (GitHub Actions)

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check formatting
        run: npm run format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        if: matrix.node-version == '20'
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/
```

### .github/workflows/codeql.yml
```yaml
name: "CodeQL"

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'typescript']

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: ${{ matrix.language }}

      - name: Autobuild
        uses: github/codeql-action/autobuild@v2

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

## 7. Additional Configuration Files

### jest.config.js
```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
};
```

### nodemon.json
```json
{
  "watch": ["src", "config"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts", "src/**/*.test.ts"],
  "exec": "ts-node -r tsconfig-paths/register ./src/index.ts",
  "env": {
    "NODE_ENV": "development"
  }
}
```

## Quick Start Commands

```bash
# 1. Install all dependencies
npm install --save-dev typescript@^5.3.3 @types/node@^20.11.0 ts-node@^10.9.2 tsx@^4.7.0 eslint@^8.56.0 @typescript-eslint/parser@^6.19.0 @typescript-eslint/eslint-plugin@^6.19.0 eslint-config-prettier@^9.1.0 eslint-plugin-prettier@^5.1.3 eslint-plugin-import@^2.29.1 eslint-plugin-node@^11.1.0 eslint-plugin-promise@^6.1.1 eslint-plugin-security@^2.1.0 eslint-import-resolver-typescript@^3.6.1 prettier@^3.2.4 husky@^8.0.3 lint-staged@^15.2.0 @commitlint/cli@^18.4.4 @commitlint/config-conventional@^18.4.4 nodemon@^3.0.3 concurrently@^8.2.2 cross-env@^7.0.3 jest@^29.7.0 @types/jest@^29.5.11 ts-jest@^29.1.1 rimraf@^5.0.5 standard-version@^9.5.0 commitizen@^4.3.0 cz-conventional-changelog@^3.3.0

# 2. Initialize Husky
npx husky install

# 3. Set up git hooks
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
npx husky add .husky/pre-push "npm run type-check && npm run lint"

# 4. Create necessary directories
mkdir -p src/{components,services,utils,types,config} test .vscode

# 5. Run initial type check
npm run type-check

# 6. Run linting
npm run lint:fix

# 7. Format code
npm run format
```

## Team Onboarding

1. **Install VS Code Extensions**: Open VS Code and install recommended extensions when prompted
2. **Configure Git Hooks**: Run `npm install` to automatically set up Husky hooks
3. **Verify Setup**: Run `npm run type-check && npm run lint` to ensure everything is configured
4. **Use Conventional Commits**: Use `npm run commit` for guided commit messages

## Troubleshooting

### Common Issues

1. **ESLint not working in VS Code**
   - Restart VS Code
   - Check ESLint output panel for errors
   - Ensure `node_modules` is installed

2. **TypeScript errors in VS Code**
   - Run `TypeScript: Restart TS Server` command
   - Verify `tsconfig.json` is in project root

3. **Prettier conflicts**
   - Ensure `eslint-config-prettier` is last in extends array
   - Check for conflicting formatters

4. **Husky hooks not running**
   - Run `npx husky install` again
   - Check file permissions in `.husky/` directory