#!/usr/bin/env python3
"""
Metrics collection and monitoring using Prometheus
"""

import os
import time
import psutil
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps
from threading import Thread
import json

logger = logging.getLogger(__name__)


class MetricsCollector:
    """Prometheus-compatible metrics collector"""
    
    def __init__(self):
        self.enabled = os.environ.get('PROMETHEUS_ENABLED', 'false').lower() == 'true'
        self.port = int(os.environ.get('PROMETHEUS_PORT', '9090'))
        self.prefix = os.environ.get('METRICS_PREFIX', 'stinkster')
        
        # Metrics storage
        self.counters = {}
        self.gauges = {}
        self.histograms = {}
        self.summaries = {}
        
        # System metrics
        self.system_metrics_enabled = True
        
        # Initialize Prometheus client if available
        self.prometheus_client = None
        if self.enabled:
            try:
                import prometheus_client
                from prometheus_client import Counter, Gauge, Histogram, Summary, start_http_server
                
                self.prometheus_client = prometheus_client
                self.Counter = Counter
                self.Gauge = Gauge
                self.Histogram = Histogram
                self.Summary = Summary
                
                # Start metrics server
                start_http_server(self.port)
                logger.info(f"Prometheus metrics server started on port {self.port}")
                
                # Initialize default metrics
                self._init_default_metrics()
                
                # Start system metrics collection
                if self.system_metrics_enabled:
                    self._start_system_metrics_collection()
                
            except ImportError:
                logger.warning("prometheus_client not installed, metrics collection disabled")
                self.enabled = False
    
    def _init_default_metrics(self):
        """Initialize default application metrics"""
        if not self.enabled:
            return
        
        # Request metrics
        self.counters['http_requests_total'] = self.Counter(
            f'{self.prefix}_http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status']
        )
        
        self.histograms['http_request_duration_seconds'] = self.Histogram(
            f'{self.prefix}_http_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint']
        )
        
        # WiFi scanning metrics
        self.counters['wifi_devices_scanned'] = self.Counter(
            f'{self.prefix}_wifi_devices_scanned_total',
            'Total WiFi devices scanned'
        )
        
        self.gauges['wifi_devices_active'] = self.Gauge(
            f'{self.prefix}_wifi_devices_active',
            'Currently active WiFi devices'
        )
        
        # GPS metrics
        self.gauges['gps_satellites'] = self.Gauge(
            f'{self.prefix}_gps_satellites',
            'Number of GPS satellites in view'
        )
        
        self.gauges['gps_hdop'] = self.Gauge(
            f'{self.prefix}_gps_hdop',
            'GPS horizontal dilution of precision'
        )
        
        # HackRF metrics
        self.gauges['hackrf_signal_strength'] = self.Gauge(
            f'{self.prefix}_hackrf_signal_strength_dbm',
            'HackRF signal strength in dBm',
            ['frequency']
        )
        
        # System metrics
        self.gauges['system_cpu_percent'] = self.Gauge(
            f'{self.prefix}_system_cpu_percent',
            'System CPU usage percentage'
        )
        
        self.gauges['system_memory_percent'] = self.Gauge(
            f'{self.prefix}_system_memory_percent',
            'System memory usage percentage'
        )
        
        self.gauges['system_disk_percent'] = self.Gauge(
            f'{self.prefix}_system_disk_percent',
            'System disk usage percentage',
            ['mountpoint']
        )
        
        self.gauges['system_temperature'] = self.Gauge(
            f'{self.prefix}_system_temperature_celsius',
            'System temperature in Celsius',
            ['sensor']
        )
    
    def _start_system_metrics_collection(self):
        """Start background thread for system metrics collection"""
        def collect_system_metrics():
            while True:
                try:
                    # CPU usage
                    cpu_percent = psutil.cpu_percent(interval=1)
                    self.set_gauge('system_cpu_percent', cpu_percent)
                    
                    # Memory usage
                    memory = psutil.virtual_memory()
                    self.set_gauge('system_memory_percent', memory.percent)
                    
                    # Disk usage
                    for partition in psutil.disk_partitions():
                        try:
                            usage = psutil.disk_usage(partition.mountpoint)
                            self.set_gauge(
                                'system_disk_percent',
                                usage.percent,
                                labels={'mountpoint': partition.mountpoint}
                            )
                        except:
                            pass
                    
                    # Temperature (Raspberry Pi specific)
                    try:
                        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                            temp = float(f.read()) / 1000.0
                            self.set_gauge('system_temperature', temp, labels={'sensor': 'cpu'})
                    except:
                        pass
                    
                except Exception as e:
                    logger.error(f"Error collecting system metrics: {e}")
                
                time.sleep(10)  # Collect every 10 seconds
        
        thread = Thread(target=collect_system_metrics, daemon=True)
        thread.start()
    
    def increment_counter(self, name: str, value: float = 1, labels: Optional[Dict[str, str]] = None):
        """Increment a counter metric"""
        if not self.enabled:
            return
        
        try:
            if name in self.counters:
                counter = self.counters[name]
                if labels:
                    counter.labels(**labels).inc(value)
                else:
                    counter.inc(value)
        except Exception as e:
            logger.error(f"Error incrementing counter {name}: {e}")
    
    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Set a gauge metric"""
        if not self.enabled:
            return
        
        try:
            if name in self.gauges:
                gauge = self.gauges[name]
                if labels:
                    gauge.labels(**labels).set(value)
                else:
                    gauge.set(value)
        except Exception as e:
            logger.error(f"Error setting gauge {name}: {e}")
    
    def observe_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Observe a histogram metric"""
        if not self.enabled:
            return
        
        try:
            if name in self.histograms:
                histogram = self.histograms[name]
                if labels:
                    histogram.labels(**labels).observe(value)
                else:
                    histogram.observe(value)
        except Exception as e:
            logger.error(f"Error observing histogram {name}: {e}")
    
    def track_request_metrics(self, method: str, endpoint: str, status: int, duration: float):
        """Track HTTP request metrics"""
        self.increment_counter(
            'http_requests_total',
            labels={'method': method, 'endpoint': endpoint, 'status': str(status)}
        )
        self.observe_histogram(
            'http_request_duration_seconds',
            duration,
            labels={'method': method, 'endpoint': endpoint}
        )
    
    def track_wifi_scan(self, devices_count: int, active_count: int):
        """Track WiFi scanning metrics"""
        self.increment_counter('wifi_devices_scanned', devices_count)
        self.set_gauge('wifi_devices_active', active_count)
    
    def track_gps_status(self, satellites: int, hdop: float):
        """Track GPS status metrics"""
        self.set_gauge('gps_satellites', satellites)
        self.set_gauge('gps_hdop', hdop)
    
    def track_hackrf_signal(self, frequency: float, strength: float):
        """Track HackRF signal metrics"""
        self.set_gauge(
            'hackrf_signal_strength',
            strength,
            labels={'frequency': str(frequency)}
        )
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of current metrics"""
        summary = {
            'enabled': self.enabled,
            'port': self.port,
            'prefix': self.prefix,
            'metrics': {}
        }
        
        if self.enabled:
            # Add current metric values
            try:
                # System metrics
                summary['metrics']['system'] = {
                    'cpu_percent': psutil.cpu_percent(),
                    'memory_percent': psutil.virtual_memory().percent,
                    'disk_usage': {}
                }
                
                for partition in psutil.disk_partitions():
                    try:
                        usage = psutil.disk_usage(partition.mountpoint)
                        summary['metrics']['system']['disk_usage'][partition.mountpoint] = usage.percent
                    except:
                        pass
                
            except Exception as e:
                logger.error(f"Error getting metrics summary: {e}")
        
        return summary


# Global metrics collector instance
metrics = MetricsCollector()


def track_time(metric_name: str, labels: Optional[Dict[str, str]] = None):
    """Decorator to track function execution time"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                metrics.observe_histogram(metric_name, duration, labels)
        return wrapper
    return decorator


def setup_flask_metrics(app):
    """Setup metrics collection for Flask applications"""
    from flask import request, g
    
    @app.before_request
    def before_request():
        g.start_time = time.time()
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            metrics.track_request_metrics(
                method=request.method,
                endpoint=request.endpoint or 'unknown',
                status=response.status_code,
                duration=duration
            )
        return response


# Example usage
if __name__ == '__main__':
    # Test metrics collection
    import time
    
    # Track some metrics
    metrics.track_wifi_scan(devices_count=42, active_count=15)
    metrics.track_gps_status(satellites=8, hdop=1.2)
    metrics.track_hackrf_signal(frequency=145.0e6, strength=-65.3)
    
    # Simulate some requests
    for i in range(10):
        metrics.track_request_metrics(
            method='GET',
            endpoint='/api/status',
            status=200,
            duration=0.1 + (i * 0.01)
        )
        time.sleep(0.1)
    
    # Get metrics summary
    print(json.dumps(metrics.get_metrics_summary(), indent=2))