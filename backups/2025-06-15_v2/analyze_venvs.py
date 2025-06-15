#!/usr/bin/env python3
"""
Analyze Python virtual environments on the system
"""

import os
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple

def get_size(path: Path) -> int:
    """Get the total size of a directory in bytes"""
    total = 0
    try:
        for entry in path.rglob('*'):
            if entry.is_file() and not entry.is_symlink():
                total += entry.stat().st_size
    except (OSError, PermissionError):
        pass
    return total

def format_bytes(size: int) -> str:
    """Format bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"

def find_venvs(base_path: str = "/home/pi") -> List[Dict[str, any]]:
    """Find all Python virtual environments"""
    venvs = []
    venv_indicators = ['bin/activate', 'pyvenv.cfg']
    venv_names = ['venv', '.venv', 'env', '.env', 'virtualenv', '.virtualenv']
    
    for root, dirs, files in os.walk(base_path):
        # Skip certain directories
        if any(skip in root for skip in ['.cursor-server', 'node_modules', '.git']):
            continue
            
        # Check if this is a venv by looking for indicators
        is_venv = False
        for indicator in venv_indicators:
            if os.path.exists(os.path.join(root, indicator)):
                is_venv = True
                break
        
        # Also check by directory name
        if not is_venv and os.path.basename(root) in venv_names:
            # Verify it's actually a Python venv
            if os.path.exists(os.path.join(root, 'bin', 'python')):
                is_venv = True
        
        if is_venv:
            path = Path(root)
            size = get_size(path)
            
            # Try to get Python version
            python_version = "Unknown"
            python_path = path / 'bin' / 'python'
            if python_path.exists():
                try:
                    result = subprocess.run(
                        [str(python_path), '--version'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    python_version = result.stdout.strip() or result.stderr.strip()
                except:
                    pass
            
            venvs.append({
                'path': str(path),
                'size': size,
                'size_human': format_bytes(size),
                'python_version': python_version,
                'project': str(path.parent)
            })
            
            # Don't traverse into the venv directory
            dirs[:] = []
    
    return sorted(venvs, key=lambda x: x['size'], reverse=True)

def main():
    print("=== Python Virtual Environment Analysis ===")
    print("Searching for Python virtual environments...")
    print()
    
    venvs = find_venvs()
    
    if not venvs:
        print("No virtual environments found.")
        return
    
    total_size = sum(v['size'] for v in venvs)
    
    print(f"Found {len(venvs)} virtual environments")
    print(f"Total size: {format_bytes(total_size)}")
    print()
    
    print("Virtual Environments (sorted by size):")
    print("-" * 80)
    
    for venv in venvs:
        print(f"Path: {venv['path']}")
        print(f"  Size: {venv['size_human']}")
        print(f"  Python: {venv['python_version']}")
        print(f"  Project: {venv['project']}")
        print()
    
    print("-" * 80)
    print(f"Total space used by virtual environments: {format_bytes(total_size)}")
    print(f"These directories will be excluded from backups to save space.")
    
    # Show rsync exclude patterns
    print()
    print("Rsync exclude patterns for these venvs:")
    print("-" * 80)
    for venv in venvs:
        print(f"--exclude='{venv['path']}'")

if __name__ == "__main__":
    main()