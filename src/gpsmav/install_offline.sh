#!/bin/bash

# Install pymavlink and pyserial offline
# This script assumes you have the package tarballs in the current directory

# Set script to exit on error
set -e

echo "Starting offline installation of dependencies..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Get site-packages directory
SITE_PACKAGES=$(python -c 'import site; print(site.getsitepackages()[0])')
echo "Site packages directory: $SITE_PACKAGES"

# Install pymavlink if tarball exists
if [ -f "pymavlink_package.tar.gz" ]; then
  echo "Installing pymavlink from local package..."
  tar -xzf pymavlink_package.tar.gz -C "$SITE_PACKAGES"
  echo "pymavlink installed successfully!"
else
  echo "WARNING: pymavlink_package.tar.gz not found. pymavlink will not be installed."
fi

# Install pyserial if tarball exists
if [ -f "pyserial_package.tar.gz" ]; then
  echo "Installing pyserial from local package..."
  tar -xzf pyserial_package.tar.gz -C "$SITE_PACKAGES"
  echo "pyserial installed successfully!"
else
  echo "WARNING: pyserial_package.tar.gz not found. pyserial will not be installed."
fi

# Verify installations
echo "Verifying installations..."
python -c 'import pymavlink; print("pymavlink import successful")' || echo "WARNING: pymavlink import failed"
python -c 'import serial; print("pyserial import successful")' || echo "WARNING: pyserial import failed"

# Deactivate virtual environment
deactivate

echo "Offline installation complete!" 