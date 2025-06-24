#!/bin/bash

# Stinkster TypeScript + Prettier + ESLint Setup Script
# This script sets up the complete tooling environment

set -e

echo "========================================"
echo "Stinkster TypeScript Tooling Setup"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Step 1: Install all dependencies
echo ""
echo "Installing TypeScript and tooling dependencies..."
npm install --save-dev \
  typescript@^5.3.3 \
  @types/node@^20.11.0 \
  ts-node@^10.9.2 \
  tsx@^4.7.0 \
  eslint@^8.56.0 \
  @typescript-eslint/parser@^6.19.0 \
  @typescript-eslint/eslint-plugin@^6.19.0 \
  eslint-config-prettier@^9.1.0 \
  eslint-plugin-prettier@^5.1.3 \
  eslint-plugin-import@^2.29.1 \
  eslint-plugin-node@^11.1.0 \
  eslint-plugin-promise@^6.1.1 \
  eslint-plugin-security@^2.1.0 \
  eslint-import-resolver-typescript@^3.6.1 \
  prettier@^3.2.4 \
  husky@^8.0.3 \
  lint-staged@^15.2.0 \
  @commitlint/cli@^18.4.4 \
  @commitlint/config-conventional@^18.4.4 \
  nodemon@^3.0.3 \
  concurrently@^8.2.2 \
  cross-env@^7.0.3 \
  jest@^29.7.0 \
  @types/jest@^29.5.11 \
  ts-jest@^29.1.1 \
  rimraf@^5.0.5 \
  standard-version@^9.5.0 \
  commitizen@^4.3.0 \
  cz-conventional-changelog@^3.3.0 \
  tsconfig-paths@^4.2.0

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Initialize Husky
echo ""
echo "Setting up Git hooks with Husky..."
npx husky install
npm pkg set scripts.prepare="husky install"

# Create husky hooks
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
npx husky add .husky/pre-push "npm run type-check && npm run lint"

print_success "Husky hooks configured"

# Step 3: Create necessary directories
echo ""
echo "Creating project directories..."
mkdir -p src/{components,services,utils,types,config} test

print_success "Project directories created"

# Step 4: Create a simple TypeScript entry file if it doesn't exist
if [ ! -f "src/index.ts" ]; then
    echo "Creating sample TypeScript entry file..."
    cat > src/index.ts << 'EOF'
/**
 * Stinkster Main Entry Point
 * 
 * This is the main entry point for the Stinkster TypeScript application.
 */

console.log('Stinkster TypeScript setup complete!');

export {};
EOF
    print_success "Created src/index.ts"
fi

# Step 5: Run initial checks
echo ""
echo "Running initial checks..."

# Type check
echo "Running type check..."
if npm run type-check 2>/dev/null; then
    print_success "TypeScript configuration is valid"
else
    print_warning "TypeScript check failed - this is normal for a new project"
fi

# Format check
echo "Running format check..."
if npm run format:check 2>/dev/null; then
    print_success "Code formatting is consistent"
else
    print_warning "Some files need formatting - run 'npm run format' to fix"
fi

# Step 6: Create VS Code workspace settings reminder
echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open VS Code and install recommended extensions when prompted"
echo "2. Restart VS Code to ensure all settings are loaded"
echo "3. Run 'npm run dev' to start development"
echo "4. Use 'npm run commit' for guided commit messages"
echo ""
echo "Key commands:"
echo "  npm run dev          - Start development mode"
echo "  npm run build        - Build for production"
echo "  npm run lint         - Check code quality"
echo "  npm run lint:fix     - Fix linting issues"
echo "  npm run format       - Format all files"
echo "  npm run test         - Run tests"
echo "  npm run commit       - Create a conventional commit"
echo ""
print_success "TypeScript tooling setup complete!"