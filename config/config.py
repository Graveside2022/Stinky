#!/usr/bin/env python3
"""
Configuration module for Stinkster project
Loads configuration from environment variables and JSON config file
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Try to import python-dotenv, but don't fail if it's not installed
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)

class Config:
    """Configuration class for Stinkster project"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.base_dir = Path(__file__).parent.absolute()
        self.config_file = config_file or os.getenv('CONFIG_FILE', str(self.base_dir / 'config.json'))
        self._config = {}
        self._load_config()
    
    def _load_config(self):
        """Load configuration from JSON file and environment variables"""
        # First, try to load JSON config
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    config_template = f.read()
                    # Replace environment variables in the template
                    config_str = os.path.expandvars(config_template)
                    self._config = json.loads(config_str)
                logger.info(f"Loaded configuration from {self.config_file}")
            except Exception as e:
                logger.error(f"Failed to load config file: {e}")
                self._config = {}
        
        # Override with environment variables
        self._apply_env_overrides()
    
    def _apply_env_overrides(self):
        """Apply environment variable overrides to configuration"""
        # Kismet configuration
        if 'KISMET_USERNAME' in os.environ:
            self._config.setdefault('kismet', {}).setdefault('api', {}).setdefault('auth', {})['username'] = os.environ['KISMET_USERNAME']
        if 'KISMET_PASSWORD' in os.environ:
            self._config.setdefault('kismet', {}).setdefault('api', {}).setdefault('auth', {})['password'] = os.environ['KISMET_PASSWORD']
        if 'KISMET_API_URL' in os.environ:
            self._config.setdefault('kismet', {}).setdefault('api', {})['url'] = os.environ['KISMET_API_URL']
        
        # WigleToTAK configuration
        if 'TAK_SERVER_IP' in os.environ:
            self._config.setdefault('wigletotak', {}).setdefault('server', {})['ip'] = os.environ['TAK_SERVER_IP']
        if 'TAK_SERVER_PORT' in os.environ:
            self._config.setdefault('wigletotak', {}).setdefault('server', {})['port'] = int(os.environ['TAK_SERVER_PORT'])
        
        # GPSD configuration
        if 'GPSD_HOST' in os.environ:
            self._config.setdefault('gpsd', {})['host'] = os.environ['GPSD_HOST']
        if 'GPSD_PORT' in os.environ:
            self._config.setdefault('gpsd', {})['port'] = int(os.environ['GPSD_PORT'])
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value by dot-notation key"""
        keys = key.split('.')
        value = self._config
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        return value
    
    @property
    def kismet_auth(self) -> tuple:
        """Get Kismet authentication tuple"""
        username = self.get('kismet.api.auth.username', 'admin')
        password = self.get('kismet.api.auth.password', 'admin')
        return (username, password)
    
    @property
    def kismet_api_url(self) -> str:
        """Get Kismet API URL"""
        return self.get('kismet.api.url', 'http://localhost:2501')
    
    @property
    def tak_server_ip(self) -> str:
        """Get TAK server IP"""
        return self.get('wigletotak.server.ip', '0.0.0.0')
    
    @property
    def tak_server_port(self) -> int:
        """Get TAK server port"""
        return self.get('wigletotak.server.port', 6969)
    
    @property
    def tak_multicast_group(self) -> str:
        """Get TAK multicast group"""
        return self.get('wigletotak.server.multicast_group', '239.2.3.1')
    
    @property
    def flask_port(self) -> int:
        """Get Flask port for WigleToTAK"""
        return self.get('wigletotak.flask.port', 8000)
    
    @property
    def webhook_port(self) -> int:
        """Get webhook port"""
        return self.get('webhook.port', 5000)
    
    @property
    def gpsd_host(self) -> str:
        """Get GPSD host"""
        return self.get('gpsd.host', 'localhost')
    
    @property
    def gpsd_port(self) -> int:
        """Get GPSD port"""
        return self.get('gpsd.port', 2947)
    
    @property
    def network_interface(self) -> str:
        """Get network interface"""
        return self.get('kismet.config.interface', os.getenv('NETWORK_INTERFACE', 'wlan2'))
    
    @property
    def log_dir(self) -> Path:
        """Get log directory"""
        return Path(self.get('paths.logs.dir', os.getenv('LOG_DIR', os.path.join(self.base_dir, 'logs'))))
    
    @property
    def pid_dir(self) -> Path:
        """Get PID directory"""
        return Path(self.get('paths.pids.dir', os.getenv('PID_DIR', os.path.join(self.base_dir, 'logs'))))
    
    def to_dict(self) -> Dict[str, Any]:
        """Export configuration as dictionary"""
        return self._config.copy()


# Create a singleton instance
config = Config()

# Export commonly used values for backward compatibility
KISMET_AUTH = config.kismet_auth
KISMET_API_URL = config.kismet_api_url
TAK_SERVER_IP = config.tak_server_ip
TAK_SERVER_PORT = config.tak_server_port
TAK_MULTICAST_GROUP = config.tak_multicast_group
FLASK_PORT = config.flask_port
WEBHOOK_PORT = config.webhook_port
GPSD_HOST = config.gpsd_host
GPSD_PORT = config.gpsd_port
NETWORK_INTERFACE = config.network_interface
LOG_DIR = config.log_dir
PID_DIR = config.pid_dir