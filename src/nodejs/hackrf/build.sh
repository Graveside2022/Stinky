#!/bin/bash
# Simple build script for hackrf server

echo "Building HackRF server..."

# Create dist directory
mkdir -p dist

# Compile only the main server file with a simple approach
echo "Compiling TypeScript..."
npx tsc --target ES2022 --module commonjs --outDir dist --allowJs --esModuleInterop --skipLibCheck server.ts logger.ts types.ts || {
    echo "TypeScript compilation failed, falling back to JavaScript transpilation..."
    # If TypeScript fails, just copy the files as JavaScript
    for file in *.ts; do
        echo "Converting $file to JavaScript..."
        npx esbuild "$file" --format=cjs --platform=node --outfile="dist/${file%.ts}.js"
    done
}

echo "Build complete!"
ls -la dist/