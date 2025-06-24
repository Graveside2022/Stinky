#!/usr/bin/env python3
"""
Secure Flask application wrapper with security middleware
"""

import os
import logging
from flask import Flask, request, g
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
import time
from .security_config import security_config, add_security_headers, create_audit_log_entry

logger = logging.getLogger(__name__)


class SecureFlaskApp:
    """Secure Flask application with built-in security features"""
    
    def __init__(self, name: str, **kwargs):
        self.app = Flask(name, **kwargs)
        self.configure_security()
        self.setup_middleware()
        self.audit_logger = self.setup_audit_logging()
        
    def configure_security(self):
        """Configure security settings"""
        self.app.config['SECRET_KEY'] = security_config.SECRET_KEY
        self.app.config['SESSION_COOKIE_SECURE'] = security_config.SECURE_COOKIES
        self.app.config['SESSION_COOKIE_HTTPONLY'] = True
        self.app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        self.app.config['PERMANENT_SESSION_LIFETIME'] = security_config.SESSION_TIMEOUT
        self.app.config['MAX_CONTENT_LENGTH'] = security_config.MAX_UPLOAD_SIZE
        
        # Setup rate limiting
        self.limiter = Limiter(
            self.app,
            key_func=get_remote_address,
            default_limits=[f"{security_config.RATE_LIMIT_PER_MINUTE} per minute"]
        )
        
        # Setup HTTPS enforcement and security headers
        if os.environ.get('FLASK_ENV') == 'production':
            self.talisman = Talisman(
                self.app,
                force_https=True,
                strict_transport_security=True,
                strict_transport_security_max_age=31536000,
                content_security_policy={
                    'default-src': "'self'",
                    'script-src': "'self' 'unsafe-inline'",
                    'style-src': "'self' 'unsafe-inline'",
                    'img-src': "'self' data:",
                    'connect-src': "'self' ws: wss:"
                }
            )
    
    def setup_middleware(self):
        """Setup security middleware"""
        
        @self.app.before_request
        def before_request():
            """Security checks before each request"""
            g.start_time = time.time()
            
            # Check allowed hosts
            if request.host not in security_config.ALLOWED_HOSTS:
                logger.warning(f"Rejected request from unauthorized host: {request.host}")
                return "Forbidden", 403
            
            # Log request
            logger.info(f"{request.method} {request.path} from {request.remote_addr}")
        
        @self.app.after_request
        def after_request(response):
            """Add security headers and logging after each request"""
            # Add security headers
            response = add_security_headers(response)
            
            # Add CORS headers if enabled
            if security_config.ENABLE_CORS:
                origin = request.headers.get('Origin')
                if origin in security_config.CORS_ORIGINS or '*' in security_config.CORS_ORIGINS:
                    response.headers['Access-Control-Allow-Origin'] = origin or '*'
                    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-API-Key'
            
            # Log response time
            if hasattr(g, 'start_time'):
                elapsed = time.time() - g.start_time
                logger.info(f"{request.method} {request.path} completed in {elapsed:.3f}s with status {response.status_code}")
            
            return response
        
        @self.app.errorhandler(400)
        def bad_request(error):
            logger.warning(f"Bad request: {error}")
            return {'error': 'Bad request'}, 400
        
        @self.app.errorhandler(403)
        def forbidden(error):
            logger.warning(f"Forbidden access attempt: {error}")
            return {'error': 'Forbidden'}, 403
        
        @self.app.errorhandler(404)
        def not_found(error):
            return {'error': 'Not found'}, 404
        
        @self.app.errorhandler(429)
        def rate_limit_exceeded(error):
            logger.warning(f"Rate limit exceeded from {request.remote_addr}")
            return {'error': 'Rate limit exceeded'}, 429
        
        @self.app.errorhandler(500)
        def internal_error(error):
            logger.error(f"Internal server error: {error}")
            return {'error': 'Internal server error'}, 500
    
    def setup_audit_logging(self):
        """Setup audit logging"""
        import logging.handlers
        
        # Create audit logger
        audit_logger = logging.getLogger('audit')
        audit_logger.setLevel(logging.INFO)
        
        # Create rotating file handler
        handler = logging.handlers.RotatingFileHandler(
            '/var/log/stinkster/audit.log',
            maxBytes=10485760,  # 10MB
            backupCount=10
        )
        
        formatter = logging.Formatter('%(asctime)s - %(message)s')
        handler.setFormatter(formatter)
        audit_logger.addHandler(handler)
        
        return audit_logger
    
    def log_audit(self, action: str, user: str = 'anonymous', details: dict = None):
        """Log an audit event"""
        entry = create_audit_log_entry(action, user, details or {})
        self.audit_logger.info(entry)
    
    def get_app(self):
        """Get the Flask app instance"""
        return self.app


def create_secure_app(name: str, **kwargs) -> Flask:
    """Create a secure Flask application"""
    secure_app = SecureFlaskApp(name, **kwargs)
    return secure_app.get_app()


# Example usage for retrofitting existing apps
def secure_existing_app(app: Flask) -> Flask:
    """Add security features to an existing Flask app"""
    # Apply security configuration
    app.config['SECRET_KEY'] = security_config.SECRET_KEY
    app.config['SESSION_COOKIE_SECURE'] = security_config.SECURE_COOKIES
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['MAX_CONTENT_LENGTH'] = security_config.MAX_UPLOAD_SIZE
    
    # Add rate limiting
    limiter = Limiter(
        app,
        key_func=get_remote_address,
        default_limits=[f"{security_config.RATE_LIMIT_PER_MINUTE} per minute"]
    )
    
    # Add security headers middleware
    @app.after_request
    def add_headers(response):
        return add_security_headers(response)
    
    return app