#!/usr/bin/env python3
"""
Production deployment script for Stinkster system
"""

import os
import sys
import shutil
import subprocess
import json
import logging
from pathlib import Path
import secrets
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from integration.security.security_config import SecurityConfig
from integration.monitoring.error_tracking import error_tracker, setup_system_error_handling
from integration.monitoring.metrics import metrics
from integration.backup.backup_manager import backup_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProductionDeployment:
    """Handles production deployment configuration and setup"""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent
        self.config_dir = self.base_dir / 'config'
        self.log_dir = Path('/var/log/stinkster')
        self.backup_dir = Path('/var/backups/stinkster')
        self.systemd_dir = Path('/etc/systemd/system')
        
    def setup_directories(self):
        """Create necessary directories with proper permissions"""
        directories = [
            self.log_dir,
            self.backup_dir,
            self.config_dir,
            Path('/var/lib/stinkster'),
            Path('/var/lib/stinkster/db'),
            Path('/var/run/stinkster')
        ]
        
        for directory in directories:
            logger.info(f"Creating directory: {directory}")
            directory.mkdir(parents=True, exist_ok=True)
            
            # Set permissions
            if directory.parent == Path('/var/log') or directory.parent == Path('/var/lib'):
                subprocess.run(['sudo', 'chown', '-R', 'pi:pi', str(directory)])
                subprocess.run(['sudo', 'chmod', '-R', '755', str(directory)])
    
    def generate_secrets(self):
        """Generate secure secret keys"""
        env_file = self.base_dir / '.env.production'
        
        if env_file.exists():
            logger.info("Production environment file already exists")
            return
        
        logger.info("Generating secure secrets...")
        
        secrets_config = {
            'APP_SECRET_KEY': secrets.token_urlsafe(32),
            'API_KEY': secrets.token_urlsafe(32),
            'DB_ENCRYPTION_KEY': secrets.token_urlsafe(32),
        }
        
        # Copy example file
        example_file = self.base_dir / '.env.production.example'
        if example_file.exists():
            shutil.copy(example_file, env_file)
            
            # Replace placeholders with actual secrets
            content = env_file.read_text()
            for key, value in secrets_config.items():
                placeholder = f"{key}=your-{key.lower().replace('_', '-')}-here"
                replacement = f"{key}={value}"
                content = content.replace(placeholder, replacement)
            
            env_file.write_text(content)
            logger.info(f"Generated production environment file: {env_file}")
        else:
            logger.error("Example environment file not found")
    
    def create_systemd_services(self):
        """Create systemd service files"""
        services = [
            {
                'name': 'stinkster-wigletotak',
                'description': 'Stinkster WigleToTAK Service',
                'exec': f'/usr/bin/python3 {self.base_dir}/wigletotak/WigleToTAK/TheStinkToTAK/v2WigleToTak2.py',
                'working_dir': f'{self.base_dir}/wigletotak/WigleToTAK/TheStinkToTAK',
                'env_file': f'{self.base_dir}/.env.production'
            },
            {
                'name': 'stinkster-spectrum',
                'description': 'Stinkster HackRF Spectrum Analyzer',
                'exec': f'/usr/bin/python3 {self.base_dir}/hackrf/spectrum_analyzer.py',
                'working_dir': f'{self.base_dir}/hackrf',
                'env_file': f'{self.base_dir}/.env.production'
            },
            {
                'name': 'stinkster-gps',
                'description': 'Stinkster GPS MAVLink Bridge',
                'exec': f'/usr/bin/python3 {self.base_dir}/gpsmav/mavgps.py',
                'working_dir': f'{self.base_dir}/gpsmav',
                'env_file': f'{self.base_dir}/.env.production'
            }
        ]
        
        service_template = """[Unit]
Description={description}
After=network.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory={working_dir}
EnvironmentFile={env_file}
ExecStart={exec}
Restart=always
RestartSec=10
StandardOutput=append:{log_dir}/{name}.log
StandardError=append:{log_dir}/{name}.error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/stinkster /var/lib/stinkster /var/backups/stinkster /home/pi/kismet_ops

[Install]
WantedBy=multi-user.target
"""
        
        for service in services:
            service_file = self.systemd_dir / f"{service['name']}.service"
            content = service_template.format(
                **service,
                log_dir=self.log_dir
            )
            
            logger.info(f"Creating systemd service: {service_file}")
            
            # Write service file
            temp_file = f"/tmp/{service['name']}.service"
            with open(temp_file, 'w') as f:
                f.write(content)
            
            # Move to systemd directory with sudo
            subprocess.run(['sudo', 'cp', temp_file, str(service_file)])
            subprocess.run(['sudo', 'chmod', '644', str(service_file)])
            os.remove(temp_file)
    
    def setup_log_rotation(self):
        """Setup log rotation configuration"""
        logrotate_config = """/var/log/stinkster/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 pi pi
    sharedscripts
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
"""
        
        logger.info("Setting up log rotation")
        
        temp_file = "/tmp/stinkster-logrotate"
        with open(temp_file, 'w') as f:
            f.write(logrotate_config)
        
        subprocess.run(['sudo', 'cp', temp_file, '/etc/logrotate.d/stinkster'])
        subprocess.run(['sudo', 'chmod', '644', '/etc/logrotate.d/stinkster'])
        os.remove(temp_file)
    
    def setup_firewall(self):
        """Setup firewall rules for production"""
        logger.info("Setting up firewall rules")
        
        # UFW rules for the services
        rules = [
            ('allow', '22/tcp', 'SSH'),
            ('allow', '8000/tcp', 'WigleToTAK Flask'),
            ('allow', '8092/tcp', 'Spectrum Analyzer'),
            ('allow', '6969/udp', 'TAK Broadcasting'),
            ('allow', '2947/tcp', 'GPSD'),
            ('allow', '9090/tcp', 'Prometheus Metrics'),
        ]
        
        # Check if ufw is installed
        try:
            subprocess.run(['sudo', 'ufw', 'status'], check=True, capture_output=True)
            
            for action, port, comment in rules:
                cmd = ['sudo', 'ufw', action, port, 'comment', comment]
                logger.info(f"Adding firewall rule: {' '.join(cmd)}")
                subprocess.run(cmd)
            
            # Enable firewall
            subprocess.run(['sudo', 'ufw', '--force', 'enable'])
            
        except subprocess.CalledProcessError:
            logger.warning("UFW not installed, skipping firewall setup")
    
    def install_dependencies(self):
        """Install Python dependencies for production"""
        logger.info("Installing production dependencies")
        
        requirements = """# Production dependencies
flask>=2.0.0
flask-limiter>=2.0.0
flask-talisman>=1.0.0
prometheus-client>=0.15.0
sentry-sdk>=1.14.0
psutil>=5.9.0
python-dotenv>=0.19.0
gunicorn>=20.1.0
"""
        
        req_file = self.base_dir / 'requirements-production.txt'
        req_file.write_text(requirements)
        
        # Install dependencies
        subprocess.run([
            sys.executable, '-m', 'pip', 'install', '-r', str(req_file)
        ], check=True)
    
    def run_security_audit(self):
        """Run security checks"""
        logger.info("Running security audit...")
        
        checks = []
        
        # Check file permissions
        sensitive_files = [
            self.base_dir / '.env.production',
            self.base_dir / 'config' / 'secrets.json'
        ]
        
        for file in sensitive_files:
            if file.exists():
                stat = file.stat()
                if stat.st_mode & 0o077:
                    checks.append(f"WARNING: {file} has overly permissive permissions")
        
        # Check for default credentials
        if (self.base_dir / '.env.production').exists():
            content = (self.base_dir / '.env.production').read_text()
            if 'your-secret-key-here' in content or 'your-api-key-here' in content:
                checks.append("ERROR: Default secrets still present in .env.production")
        
        # Check service status
        services = ['stinkster-wigletotak', 'stinkster-spectrum', 'stinkster-gps']
        for service in services:
            result = subprocess.run(
                ['systemctl', 'is-enabled', service],
                capture_output=True,
                text=True
            )
            if result.returncode != 0:
                checks.append(f"WARNING: Service {service} is not enabled")
        
        if checks:
            logger.warning("Security audit found issues:")
            for check in checks:
                logger.warning(f"  - {check}")
        else:
            logger.info("Security audit passed!")
        
        return len(checks) == 0
    
    def deploy(self):
        """Run full production deployment"""
        logger.info("Starting production deployment...")
        
        try:
            # Setup error tracking
            setup_system_error_handling()
            
            # Create directories
            self.setup_directories()
            
            # Generate secrets
            self.generate_secrets()
            
            # Install dependencies
            self.install_dependencies()
            
            # Create systemd services
            self.create_systemd_services()
            
            # Setup log rotation
            self.setup_log_rotation()
            
            # Setup firewall
            self.setup_firewall()
            
            # Setup backup cron job
            backup_manager.setup_cron_job()
            
            # Run security audit
            if self.run_security_audit():
                logger.info("Production deployment completed successfully!")
                
                # Create initial backup
                logger.info("Creating initial backup...")
                backup_manager.create_backup('initial')
                
                # Print next steps
                print("\n" + "="*50)
                print("PRODUCTION DEPLOYMENT COMPLETE")
                print("="*50)
                print("\nNext steps:")
                print("1. Review and update /home/pi/projects/stinkster_christian/stinkster/src/.env.production")
                print("2. Enable and start services:")
                print("   sudo systemctl daemon-reload")
                print("   sudo systemctl enable --now stinkster-wigletotak")
                print("   sudo systemctl enable --now stinkster-spectrum")
                print("   sudo systemctl enable --now stinkster-gps")
                print("3. Check service status:")
                print("   sudo systemctl status stinkster-*")
                print("4. Monitor logs:")
                print("   sudo journalctl -u stinkster-* -f")
                print("5. Access metrics at http://localhost:9090/metrics")
                print("\nBackups will run daily at 2 AM")
                print("="*50)
            else:
                logger.error("Security audit failed! Please fix issues before deploying.")
                sys.exit(1)
                
        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            error_tracker.capture_exception(e)
            sys.exit(1)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Production Deployment Script')
    parser.add_argument('--deploy', action='store_true', help='Run full deployment')
    parser.add_argument('--audit', action='store_true', help='Run security audit only')
    parser.add_argument('--secrets', action='store_true', help='Generate secrets only')
    
    args = parser.parse_args()
    
    deployment = ProductionDeployment()
    
    if args.deploy:
        deployment.deploy()
    elif args.audit:
        deployment.run_security_audit()
    elif args.secrets:
        deployment.generate_secrets()
    else:
        parser.print_help()