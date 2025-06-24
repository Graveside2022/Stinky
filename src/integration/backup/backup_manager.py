#!/usr/bin/env python3
"""
Backup and restore management for production deployment
"""

import os
import sys
import json
import time
import shutil
import tarfile
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


class BackupManager:
    """Manages system backups and restoration"""
    
    def __init__(self):
        self.enabled = os.environ.get('BACKUP_ENABLED', 'true').lower() == 'true'
        self.backup_path = os.environ.get('BACKUP_PATH', '/var/backups/stinkster')
        self.retention_days = int(os.environ.get('BACKUP_RETENTION_DAYS', '30'))
        self.schedule = os.environ.get('BACKUP_SCHEDULE', '0 2 * * *')  # 2 AM daily
        
        # Backup configuration
        self.backup_items = [
            {
                'name': 'kismet_data',
                'path': '/home/pi/kismet_ops',
                'type': 'directory',
                'compress': True
            },
            {
                'name': 'wigle_data',
                'path': '/home/pi/WigletoTAK/data',
                'type': 'directory',
                'compress': True
            },
            {
                'name': 'hackrf_config',
                'path': '/home/pi/projects/stinkster_christian/stinkster/src/hackrf/config.json',
                'type': 'file',
                'compress': False
            },
            {
                'name': 'logs',
                'path': '/var/log/stinkster',
                'type': 'directory',
                'compress': True,
                'rotate': True
            },
            {
                'name': 'database',
                'path': '/var/lib/stinkster/db',
                'type': 'directory',
                'compress': True,
                'pre_backup': self._backup_database
            }
        ]
        
        # Ensure backup directory exists
        os.makedirs(self.backup_path, exist_ok=True)
    
    def create_backup(self, backup_type: str = 'scheduled') -> Dict[str, Any]:
        """Create a system backup"""
        if not self.enabled:
            logger.info("Backups are disabled")
            return {'status': 'disabled'}
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"backup_{backup_type}_{timestamp}"
        backup_dir = os.path.join(self.backup_path, backup_name)
        
        try:
            os.makedirs(backup_dir, exist_ok=True)
            
            # Backup metadata
            metadata = {
                'timestamp': timestamp,
                'type': backup_type,
                'version': os.environ.get('GLITCHTIP_RELEASE', '1.0.0'),
                'items': [],
                'status': 'in_progress'
            }
            
            # Backup each configured item
            for item in self.backup_items:
                try:
                    # Run pre-backup hook if exists
                    if 'pre_backup' in item and callable(item['pre_backup']):
                        item['pre_backup']()
                    
                    item_result = self._backup_item(item, backup_dir)
                    metadata['items'].append(item_result)
                    
                except Exception as e:
                    logger.error(f"Failed to backup {item['name']}: {e}")
                    metadata['items'].append({
                        'name': item['name'],
                        'status': 'failed',
                        'error': str(e)
                    })
            
            # Create backup archive
            archive_path = f"{backup_dir}.tar.gz"
            with tarfile.open(archive_path, 'w:gz') as tar:
                tar.add(backup_dir, arcname=backup_name)
            
            # Calculate checksum
            checksum = self._calculate_checksum(archive_path)
            metadata['checksum'] = checksum
            metadata['archive_path'] = archive_path
            metadata['size'] = os.path.getsize(archive_path)
            metadata['status'] = 'completed'
            
            # Save metadata
            metadata_path = os.path.join(backup_dir, 'metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Clean up temporary directory
            shutil.rmtree(backup_dir)
            
            # Clean old backups
            self._cleanup_old_backups()
            
            logger.info(f"Backup completed: {archive_path}")
            return metadata
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': timestamp
            }
    
    def _backup_item(self, item: Dict[str, Any], backup_dir: str) -> Dict[str, Any]:
        """Backup a single item"""
        item_name = item['name']
        item_path = item['path']
        item_type = item['type']
        
        result = {
            'name': item_name,
            'type': item_type,
            'original_path': item_path,
            'status': 'in_progress'
        }
        
        try:
            if not os.path.exists(item_path):
                result['status'] = 'skipped'
                result['reason'] = 'Path does not exist'
                return result
            
            backup_item_path = os.path.join(backup_dir, item_name)
            
            if item_type == 'file':
                # Copy single file
                os.makedirs(os.path.dirname(backup_item_path), exist_ok=True)
                shutil.copy2(item_path, backup_item_path)
                result['size'] = os.path.getsize(backup_item_path)
                
            elif item_type == 'directory':
                # Copy directory
                if item.get('compress', False):
                    # Create compressed archive
                    archive_path = f"{backup_item_path}.tar.gz"
                    with tarfile.open(archive_path, 'w:gz') as tar:
                        tar.add(item_path, arcname=item_name)
                    result['size'] = os.path.getsize(archive_path)
                    result['compressed'] = True
                else:
                    # Copy directory as-is
                    shutil.copytree(item_path, backup_item_path)
                    result['size'] = self._get_directory_size(backup_item_path)
            
            result['status'] = 'completed'
            
        except Exception as e:
            result['status'] = 'failed'
            result['error'] = str(e)
        
        return result
    
    def restore_backup(self, backup_name: str, items: Optional[List[str]] = None) -> Dict[str, Any]:
        """Restore from a backup"""
        archive_path = os.path.join(self.backup_path, f"{backup_name}.tar.gz")
        
        if not os.path.exists(archive_path):
            return {
                'status': 'failed',
                'error': f'Backup not found: {backup_name}'
            }
        
        temp_dir = os.path.join(self.backup_path, f"restore_{int(time.time())}")
        
        try:
            # Extract backup
            os.makedirs(temp_dir, exist_ok=True)
            with tarfile.open(archive_path, 'r:gz') as tar:
                tar.extractall(temp_dir)
            
            # Find backup directory
            backup_dir = os.path.join(temp_dir, backup_name)
            if not os.path.exists(backup_dir):
                # Try first subdirectory
                subdirs = [d for d in os.listdir(temp_dir) if os.path.isdir(os.path.join(temp_dir, d))]
                if subdirs:
                    backup_dir = os.path.join(temp_dir, subdirs[0])
            
            # Load metadata
            metadata_path = os.path.join(backup_dir, 'metadata.json')
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            restore_results = {
                'status': 'in_progress',
                'backup_name': backup_name,
                'timestamp': datetime.now().isoformat(),
                'items': []
            }
            
            # Restore each item
            for item_meta in metadata['items']:
                if item_meta['status'] != 'completed':
                    continue
                
                if items and item_meta['name'] not in items:
                    continue
                
                # Find original configuration
                item_config = next((i for i in self.backup_items if i['name'] == item_meta['name']), None)
                if not item_config:
                    continue
                
                try:
                    result = self._restore_item(item_meta, item_config, backup_dir)
                    restore_results['items'].append(result)
                except Exception as e:
                    logger.error(f"Failed to restore {item_meta['name']}: {e}")
                    restore_results['items'].append({
                        'name': item_meta['name'],
                        'status': 'failed',
                        'error': str(e)
                    })
            
            restore_results['status'] = 'completed'
            
            # Clean up
            shutil.rmtree(temp_dir)
            
            return restore_results
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    def _restore_item(self, item_meta: Dict[str, Any], item_config: Dict[str, Any], backup_dir: str) -> Dict[str, Any]:
        """Restore a single item"""
        item_name = item_meta['name']
        original_path = item_config['path']
        backup_item_path = os.path.join(backup_dir, item_name)
        
        result = {
            'name': item_name,
            'original_path': original_path,
            'status': 'in_progress'
        }
        
        try:
            # Create backup of current data
            if os.path.exists(original_path):
                current_backup = f"{original_path}.pre_restore_{int(time.time())}"
                if os.path.isfile(original_path):
                    shutil.copy2(original_path, current_backup)
                else:
                    shutil.copytree(original_path, current_backup)
                result['current_backup'] = current_backup
            
            # Restore data
            if item_meta.get('compressed', False):
                # Extract compressed archive
                archive_path = f"{backup_item_path}.tar.gz"
                parent_dir = os.path.dirname(original_path)
                os.makedirs(parent_dir, exist_ok=True)
                
                with tarfile.open(archive_path, 'r:gz') as tar:
                    tar.extractall(parent_dir)
            else:
                # Copy directly
                if os.path.isfile(backup_item_path):
                    os.makedirs(os.path.dirname(original_path), exist_ok=True)
                    shutil.copy2(backup_item_path, original_path)
                else:
                    if os.path.exists(original_path):
                        shutil.rmtree(original_path)
                    shutil.copytree(backup_item_path, original_path)
            
            result['status'] = 'completed'
            
        except Exception as e:
            result['status'] = 'failed'
            result['error'] = str(e)
            
            # Try to restore from pre-restore backup
            if 'current_backup' in result and os.path.exists(result['current_backup']):
                try:
                    if os.path.exists(original_path):
                        if os.path.isfile(original_path):
                            os.remove(original_path)
                        else:
                            shutil.rmtree(original_path)
                    
                    if os.path.isfile(result['current_backup']):
                        shutil.copy2(result['current_backup'], original_path)
                    else:
                        shutil.copytree(result['current_backup'], original_path)
                    
                    result['rollback'] = 'successful'
                except:
                    result['rollback'] = 'failed'
        
        return result
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """List available backups"""
        backups = []
        
        for file in os.listdir(self.backup_path):
            if file.endswith('.tar.gz'):
                backup_path = os.path.join(self.backup_path, file)
                backup_name = file.replace('.tar.gz', '')
                
                # Extract basic info
                backup_info = {
                    'name': backup_name,
                    'path': backup_path,
                    'size': os.path.getsize(backup_path),
                    'created': datetime.fromtimestamp(os.path.getctime(backup_path)).isoformat()
                }
                
                # Try to extract metadata
                try:
                    # This is a simplified version - in production you might cache this
                    pass
                except:
                    pass
                
                backups.append(backup_info)
        
        # Sort by creation date
        backups.sort(key=lambda x: x['created'], reverse=True)
        
        return backups
    
    def _cleanup_old_backups(self):
        """Remove backups older than retention period"""
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        
        for file in os.listdir(self.backup_path):
            if file.endswith('.tar.gz'):
                file_path = os.path.join(self.backup_path, file)
                file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                
                if file_time < cutoff_date:
                    try:
                        os.remove(file_path)
                        logger.info(f"Removed old backup: {file}")
                    except Exception as e:
                        logger.error(f"Failed to remove old backup {file}: {e}")
    
    def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    def _get_directory_size(self, path: str) -> int:
        """Get total size of a directory"""
        total = 0
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                total += os.path.getsize(filepath)
        return total
    
    def _backup_database(self):
        """Pre-backup hook for database"""
        # This is a placeholder - implement actual database backup logic
        logger.info("Running database backup hook")
    
    def setup_cron_job(self):
        """Setup cron job for scheduled backups"""
        cron_command = f"cd {os.path.dirname(os.path.abspath(__file__))} && /usr/bin/python3 {__file__} --backup"
        cron_entry = f"{self.schedule} {cron_command}"
        
        try:
            # Add to crontab
            subprocess.run(
                f'(crontab -l 2>/dev/null; echo "{cron_entry}") | crontab -',
                shell=True,
                check=True
            )
            logger.info(f"Cron job setup: {cron_entry}")
        except Exception as e:
            logger.error(f"Failed to setup cron job: {e}")


# Global backup manager instance
backup_manager = BackupManager()


if __name__ == '__main__':
    # Command line interface
    import argparse
    
    parser = argparse.ArgumentParser(description='Backup Manager')
    parser.add_argument('--backup', action='store_true', help='Create a backup')
    parser.add_argument('--restore', type=str, help='Restore from backup')
    parser.add_argument('--list', action='store_true', help='List backups')
    parser.add_argument('--setup-cron', action='store_true', help='Setup cron job')
    
    args = parser.parse_args()
    
    if args.backup:
        result = backup_manager.create_backup('manual')
        print(json.dumps(result, indent=2))
    
    elif args.restore:
        result = backup_manager.restore_backup(args.restore)
        print(json.dumps(result, indent=2))
    
    elif args.list:
        backups = backup_manager.list_backups()
        for backup in backups:
            print(f"{backup['name']} - {backup['size'] / 1024 / 1024:.2f} MB - {backup['created']}")
    
    elif args.setup_cron:
        backup_manager.setup_cron_job()
    
    else:
        parser.print_help()