#!/usr/bin/env python3
"""
Error tracking implementation using GlitchTip (open-source Sentry alternative)
and fallback local error logging
"""

import os
import sys
import json
import time
import traceback
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps
import threading
import queue

logger = logging.getLogger(__name__)


class ErrorTracker:
    """Error tracking system with GlitchTip integration and local fallback"""
    
    def __init__(self):
        self.dsn = os.environ.get('GLITCHTIP_DSN')
        self.environment = os.environ.get('GLITCHTIP_ENVIRONMENT', 'development')
        self.release = os.environ.get('GLITCHTIP_RELEASE', '1.0.0')
        self.enabled = self.dsn is not None
        
        # Local error storage
        self.error_queue = queue.Queue(maxsize=1000)
        self.error_log_path = os.environ.get('ERROR_LOG_PATH', '/var/log/stinkster/errors.json')
        
        # Initialize GlitchTip SDK if available
        self.glitchtip_client = None
        if self.enabled:
            try:
                import sentry_sdk
                sentry_sdk.init(
                    dsn=self.dsn,
                    environment=self.environment,
                    release=self.release,
                    traces_sample_rate=0.1,
                    before_send=self._before_send
                )
                self.glitchtip_client = sentry_sdk
                logger.info("GlitchTip error tracking initialized")
            except ImportError:
                logger.warning("sentry-sdk not installed, using local error tracking only")
                self.enabled = False
        
        # Start error processing thread
        self.processing_thread = threading.Thread(target=self._process_errors, daemon=True)
        self.processing_thread.start()
    
    def _before_send(self, event, hint):
        """Process event before sending to GlitchTip"""
        # Sanitize sensitive data
        if 'request' in event:
            request = event['request']
            # Remove sensitive headers
            if 'headers' in request:
                sensitive_headers = ['Authorization', 'X-API-Key', 'Cookie']
                for header in sensitive_headers:
                    if header in request['headers']:
                        request['headers'][header] = '[REDACTED]'
            
            # Remove sensitive query parameters
            if 'query_string' in request:
                # Parse and sanitize query string
                pass
        
        return event
    
    def capture_exception(self, exception: Exception, context: Optional[Dict[str, Any]] = None):
        """Capture an exception with context"""
        error_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': type(exception).__name__,
            'message': str(exception),
            'traceback': traceback.format_exc(),
            'context': context or {},
            'environment': self.environment,
            'release': self.release
        }
        
        # Send to GlitchTip if available
        if self.enabled and self.glitchtip_client:
            try:
                with self.glitchtip_client.configure_scope() as scope:
                    if context:
                        for key, value in context.items():
                            scope.set_extra(key, value)
                    self.glitchtip_client.capture_exception(exception)
            except Exception as e:
                logger.error(f"Failed to send error to GlitchTip: {e}")
        
        # Always log locally
        try:
            self.error_queue.put_nowait(error_data)
        except queue.Full:
            # If queue is full, remove oldest and add new
            try:
                self.error_queue.get_nowait()
                self.error_queue.put_nowait(error_data)
            except:
                pass
        
        # Log to standard logger
        logger.error(f"{error_data['type']}: {error_data['message']}", exc_info=True)
    
    def capture_message(self, message: str, level: str = 'info', context: Optional[Dict[str, Any]] = None):
        """Capture a message with context"""
        message_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': level,
            'message': message,
            'context': context or {},
            'environment': self.environment,
            'release': self.release
        }
        
        # Send to GlitchTip if available
        if self.enabled and self.glitchtip_client:
            try:
                with self.glitchtip_client.configure_scope() as scope:
                    if context:
                        for key, value in context.items():
                            scope.set_extra(key, value)
                    self.glitchtip_client.capture_message(message, level=level)
            except Exception as e:
                logger.error(f"Failed to send message to GlitchTip: {e}")
        
        # Log locally
        try:
            self.error_queue.put_nowait(message_data)
        except queue.Full:
            pass
        
        # Log to standard logger
        getattr(logger, level)(message)
    
    def _process_errors(self):
        """Background thread to process and save errors"""
        while True:
            errors_to_save = []
            
            # Collect errors from queue
            while not self.error_queue.empty() and len(errors_to_save) < 100:
                try:
                    error = self.error_queue.get_nowait()
                    errors_to_save.append(error)
                except queue.Empty:
                    break
            
            # Save errors to file
            if errors_to_save:
                self._save_errors_to_file(errors_to_save)
            
            # Sleep before next batch
            time.sleep(5)
    
    def _save_errors_to_file(self, errors: list):
        """Save errors to JSON file"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.error_log_path), exist_ok=True)
            
            # Read existing errors
            existing_errors = []
            if os.path.exists(self.error_log_path):
                try:
                    with open(self.error_log_path, 'r') as f:
                        existing_errors = json.load(f)
                except:
                    existing_errors = []
            
            # Append new errors
            existing_errors.extend(errors)
            
            # Keep only last 10000 errors
            if len(existing_errors) > 10000:
                existing_errors = existing_errors[-10000:]
            
            # Write back to file
            with open(self.error_log_path, 'w') as f:
                json.dump(existing_errors, f, indent=2)
        
        except Exception as e:
            logger.error(f"Failed to save errors to file: {e}")
    
    def get_recent_errors(self, limit: int = 100) -> list:
        """Get recent errors from local storage"""
        try:
            if os.path.exists(self.error_log_path):
                with open(self.error_log_path, 'r') as f:
                    errors = json.load(f)
                    return errors[-limit:]
        except Exception as e:
            logger.error(f"Failed to read errors from file: {e}")
        
        return []


# Global error tracker instance
error_tracker = ErrorTracker()


def track_errors(func):
    """Decorator to automatically track errors in functions"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            # Capture exception with function context
            context = {
                'function': func.__name__,
                'module': func.__module__,
                'args': str(args)[:1000],  # Limit size
                'kwargs': str(kwargs)[:1000]
            }
            error_tracker.capture_exception(e, context)
            raise
    return wrapper


def setup_flask_error_handling(app):
    """Setup error handling for Flask applications"""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        # Get request context
        from flask import request
        
        context = {
            'url': request.url,
            'method': request.method,
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown'),
            'endpoint': request.endpoint
        }
        
        # Log 500 errors
        if not isinstance(e, HTTPException):
            error_tracker.capture_exception(e, context)
            return {'error': 'Internal server error'}, 500
        
        # Log 4xx errors as messages
        if 400 <= e.code < 500:
            error_tracker.capture_message(
                f"HTTP {e.code}: {e.description}",
                level='warning',
                context=context
            )
        
        return {'error': e.description}, e.code


def setup_system_error_handling():
    """Setup system-wide error handling"""
    
    def handle_exception(exc_type, exc_value, exc_traceback):
        """Handle uncaught exceptions"""
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        # Log the error
        error_tracker.capture_exception(
            exc_value,
            context={
                'type': 'uncaught_exception',
                'exc_type': str(exc_type),
                'argv': sys.argv
            }
        )
    
    # Set the exception hook
    sys.excepthook = handle_exception


# Example usage
if __name__ == '__main__':
    # Test error tracking
    setup_system_error_handling()
    
    try:
        # This will be tracked
        raise ValueError("Test error")
    except ValueError as e:
        error_tracker.capture_exception(e, {'test': True})
    
    # Log a message
    error_tracker.capture_message("System started", level='info')
    
    # Get recent errors
    print("Recent errors:", error_tracker.get_recent_errors(5))