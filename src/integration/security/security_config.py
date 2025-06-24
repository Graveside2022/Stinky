#!/usr/bin/env python3
"""
Security configuration and utilities for production deployment
"""

import os
import secrets
import hashlib
import logging
from typing import Dict, Any, Optional
from functools import wraps
from flask import request, jsonify
import re
import ipaddress
import time

logger = logging.getLogger(__name__)


class SecurityConfig:
    """Central security configuration for the system"""
    
    def __init__(self):
        # Load from environment or use secure defaults
        self.SECRET_KEY = os.environ.get('APP_SECRET_KEY', secrets.token_urlsafe(32))
        self.API_KEY = os.environ.get('API_KEY', secrets.token_urlsafe(32))
        self.ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
        self.RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', '60'))
        self.MAX_UPLOAD_SIZE = int(os.environ.get('MAX_UPLOAD_SIZE', '10485760'))  # 10MB
        self.ENABLE_CORS = os.environ.get('ENABLE_CORS', 'false').lower() == 'true'
        self.CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
        self.LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
        self.SECURE_COOKIES = os.environ.get('SECURE_COOKIES', 'true').lower() == 'true'
        self.SESSION_TIMEOUT = int(os.environ.get('SESSION_TIMEOUT', '3600'))  # 1 hour
        
        # Security headers
        self.SECURITY_HEADERS = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
        
        # Input validation patterns
        self.VALIDATION_PATTERNS = {
            'ip_address': re.compile(r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$'),
            'port': re.compile(r'^[0-9]{1,5}$'),
            'mac_address': re.compile(r'^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'),
            'ssid': re.compile(r'^[a-zA-Z0-9\s\-_.]+$'),
            'filename': re.compile(r'^[a-zA-Z0-9\-_.]+$'),
        }
        
        # Rate limiting storage
        self.rate_limits = {}


security_config = SecurityConfig()


def validate_input(pattern_name: str, value: str) -> bool:
    """Validate input against predefined patterns"""
    if pattern_name not in security_config.VALIDATION_PATTERNS:
        return False
    
    pattern = security_config.VALIDATION_PATTERNS[pattern_name]
    return bool(pattern.match(value))


def sanitize_path(path: str) -> str:
    """Sanitize file paths to prevent directory traversal"""
    # Remove any directory traversal attempts
    path = os.path.normpath(path)
    path = path.replace('../', '').replace('..\\', '')
    
    # Remove leading slashes
    path = path.lstrip('/')
    
    return path


def validate_ip_address(ip: str) -> bool:
    """Validate IP address"""
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def validate_port(port: str) -> bool:
    """Validate port number"""
    try:
        port_num = int(port)
        return 1 <= port_num <= 65535
    except ValueError:
        return False


def hash_password(password: str) -> str:
    """Hash password using SHA256 with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash"""
    try:
        salt, hash_value = stored_hash.split(':')
        return hashlib.sha256((password + salt).encode()).hexdigest() == hash_value
    except ValueError:
        return False


def require_api_key(f):
    """Decorator to require API key for endpoint access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
        
        if not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        if api_key != security_config.API_KEY:
            logger.warning(f"Invalid API key attempt from {request.remote_addr}")
            return jsonify({'error': 'Invalid API key'}), 403
        
        return f(*args, **kwargs)
    return decorated_function


def rate_limit(max_per_minute: Optional[int] = None):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            limit = max_per_minute or security_config.RATE_LIMIT_PER_MINUTE
            client_ip = request.remote_addr
            current_minute = int(time.time() / 60)
            
            # Clean old entries
            security_config.rate_limits = {
                k: v for k, v in security_config.rate_limits.items()
                if k[1] == current_minute
            }
            
            key = (client_ip, current_minute)
            if key in security_config.rate_limits:
                if security_config.rate_limits[key] >= limit:
                    return jsonify({'error': 'Rate limit exceeded'}), 429
                security_config.rate_limits[key] += 1
            else:
                security_config.rate_limits[key] = 1
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def add_security_headers(response):
    """Add security headers to response"""
    for header, value in security_config.SECURITY_HEADERS.items():
        response.headers[header] = value
    return response


def validate_file_upload(file) -> bool:
    """Validate file upload"""
    if not file:
        return False
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > security_config.MAX_UPLOAD_SIZE:
        return False
    
    # Check filename
    filename = file.filename
    if not validate_input('filename', filename):
        return False
    
    # Check file extension
    allowed_extensions = {'.csv', '.json', '.txt', '.log'}
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed_extensions:
        return False
    
    return True


def create_audit_log_entry(action: str, user: str, details: Dict[str, Any]) -> Dict[str, Any]:
    """Create an audit log entry"""
    import time
    
    return {
        'timestamp': time.time(),
        'action': action,
        'user': user,
        'ip_address': request.remote_addr if request else 'system',
        'user_agent': request.headers.get('User-Agent', 'Unknown') if request else 'system',
        'details': details
    }


# Input sanitization functions
def sanitize_ssid(ssid: str) -> str:
    """Sanitize SSID input"""
    # Remove control characters and limit length
    ssid = ''.join(char for char in ssid if char.isprintable())
    return ssid[:32]  # Max SSID length


def sanitize_mac_address(mac: str) -> str:
    """Sanitize MAC address input"""
    # Remove any non-hex characters and format properly
    mac = ''.join(c for c in mac.upper() if c in '0123456789ABCDEF:')
    
    # Ensure proper format
    if len(mac.replace(':', '')) == 12:
        # Add colons if missing
        if ':' not in mac:
            mac = ':'.join(mac[i:i+2] for i in range(0, 12, 2))
    
    return mac if validate_input('mac_address', mac) else ''


if __name__ == '__main__':
    # Generate secure keys if running directly
    print("Generating secure configuration...")
    print(f"APP_SECRET_KEY={secrets.token_urlsafe(32)}")
    print(f"API_KEY={secrets.token_urlsafe(32)}")
    print(f"DB_ENCRYPTION_KEY={secrets.token_urlsafe(32)}")