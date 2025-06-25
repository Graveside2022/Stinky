#!/bin/zsh
# Or use #!/bin/bash

# --- Script to start MediaMTX in its directory ---

# Define the target directory where mediamtx executable is located
MEDIAMTX_DIR="/home/pi/mediamtx"
MEDIAMTX_EXECUTABLE="./mediamtx" # Name of the executable relative to MEDIAMTX_DIR

# --- Sanity Check: Ensure the directory exists ---
if [[ ! -d "$MEDIAMTX_DIR" ]]; then
  echo "Error: MediaMTX directory '$MEDIAMTX_DIR' not found." >&2
  echo "Please create it or correct the path in the script." >&2
  exit 1
fi

# --- Sanity Check: Ensure the executable exists and is executable ---
if [[ ! -x "$MEDIAMTX_DIR/$MEDIAMTX_EXECUTABLE" ]]; then # Note: -x checks if executable
  echo "Error: MediaMTX executable '$MEDIAMTX_DIR/$MEDIAMTX_EXECUTABLE' not found or not executable." >&2
  echo "Please ensure it's downloaded, extracted correctly, and 'chmod +x $MEDIAMTX_DIR/$MEDIAMTX_EXECUTABLE' has been run if needed." >&2
  exit 1
fi

# --- Change to the MediaMTX directory ---
echo "Changing directory to $MEDIAMTX_DIR..."
cd "$MEDIAMTX_DIR" || { echo "Error: Failed to change directory to $MEDIAMTX_DIR" >&2; exit 1; }

# --- Announce current directory (optional, for feedback) ---
echo "Current directory: $(pwd)"
echo "Executing MediaMTX from this location..."

# --- Start MediaMTX ---
# It will look for its configuration file (e.g., mediamtx.yml) in the current directory.
"$MEDIAMTX_EXECUTABLE"

# --- Optional: Indicate MediaMTX has exited ---
# This part of the script will only run after mediamtx finishes/exits.
# If mediamtx runs in the foreground indefinitely, this might not be seen until you stop it.
echo "MediaMTX has exited."

exit 0
