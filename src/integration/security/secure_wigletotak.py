#!/usr/bin/env python3
"""
Security-hardened wrapper for WigleToTAK application
"""

import os
import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'wigletotak' / 'WigleToTAK' / 'TheStinkToTAK'))

from integration.security.secure_app import create_secure_app, secure_existing_app
from integration.security.security_config import (
    security_config, require_api_key, rate_limit, 
    validate_input, sanitize_path, sanitize_ssid, sanitize_mac_address
)
from integration.monitoring.error_tracking import error_tracker, setup_flask_error_handling, track_errors
from integration.monitoring.metrics import metrics, setup_flask_metrics

# Import the original application
import v2WigleToTak2

# Apply security enhancements
app = v2WigleToTak2.app
app = secure_existing_app(app)

# Setup error tracking
setup_flask_error_handling(app)

# Setup metrics
setup_flask_metrics(app)

# Override sensitive routes with security checks
original_update_tak_settings = v2WigleToTak2.update_tak_settings
original_scan_directory = v2WigleToTak2.scan_directory

@app.route('/update_tak_settings', methods=['POST'])
@require_api_key
@rate_limit(max_per_minute=10)
@track_errors
def secure_update_tak_settings():
    """Secure version of TAK settings update"""
    from flask import request, jsonify
    
    data = request.json
    tak_server_ip = data.get('tak_server_ip')
    tak_server_port = data.get('tak_server_port')
    
    # Validate inputs
    if not validate_input('ip_address', tak_server_ip):
        error_tracker.capture_message(
            f"Invalid IP address attempt: {tak_server_ip}",
            level='warning',
            context={'ip': request.remote_addr}
        )
        return jsonify({'error': 'Invalid IP address format'}), 400
    
    if not validate_input('port', tak_server_port):
        return jsonify({'error': 'Invalid port number'}), 400
    
    # Call original function with validated data
    request.json = {
        'tak_server_ip': tak_server_ip,
        'tak_server_port': tak_server_port
    }
    
    return original_update_tak_settings()

@app.route('/scan_directory', methods=['POST'])
@require_api_key
@rate_limit(max_per_minute=30)
@track_errors
def secure_scan_directory():
    """Secure version of directory scanning"""
    from flask import request
    
    data = request.json
    directory = data.get('directory', '')
    
    # Sanitize directory path
    directory = sanitize_path(directory)
    
    # Ensure directory is within allowed paths
    allowed_base_paths = [
        '/home/pi/kismet_ops',
        '/tmp/kismet',
        '/var/lib/stinkster/wigle'
    ]
    
    is_allowed = False
    for base_path in allowed_base_paths:
        if directory.startswith(base_path):
            is_allowed = True
            break
    
    if not is_allowed:
        error_tracker.capture_message(
            f"Directory traversal attempt: {directory}",
            level='warning',
            context={'ip': request.remote_addr}
        )
        return jsonify({'error': 'Access denied'}), 403
    
    # Update request data
    request.json = {'directory': directory}
    
    return original_scan_directory()

# Add endpoint for health checks
@app.route('/health', methods=['GET'])
@rate_limit(max_per_minute=60)
def health_check():
    """Health check endpoint"""
    from flask import jsonify
    import psutil
    
    health_status = {
        'status': 'healthy',
        'uptime': psutil.boot_time(),
        'cpu_percent': psutil.cpu_percent(),
        'memory_percent': psutil.virtual_memory().percent,
        'metrics': metrics.get_metrics_summary()
    }
    
    return jsonify(health_status)

# Add endpoint for metrics
@app.route('/metrics', methods=['GET'])
@require_api_key
def prometheus_metrics():
    """Prometheus metrics endpoint"""
    if not metrics.enabled:
        return "Metrics not enabled", 404
    
    # Return Prometheus format metrics
    from prometheus_client import generate_latest
    return generate_latest()


if __name__ == '__main__':
    # Load production configuration
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent.parent / '.env.production')
    
    # Run with gunicorn in production
    if os.environ.get('FLASK_ENV') == 'production':
        print("Please run with gunicorn:")
        print("gunicorn -w 4 -b 0.0.0.0:8000 secure_wigletotak:app")
    else:
        # Development mode
        app.run(
            host='0.0.0.0',
            port=int(os.environ.get('FLASK_PORT', 8000)),
            debug=False
        )