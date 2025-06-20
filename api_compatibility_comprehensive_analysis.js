#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Compatibility Analysis
 * Flask vs Node.js Implementation Comparison
 * 
 * This script performs a detailed analysis of API endpoints between
 * Flask (Python) and Node.js (Express) implementations in the Stinkster project.
 */

const fs = require('fs').promises;
const path = require('path');

// Flask Application Analysis Data
const FLASK_APPS = {
  spectrum_analyzer: {
    file: 'src/hackrf/spectrum_analyzer.py',
    port: 8092,
    endpoints: [
      { method: 'GET', path: '/', handler: 'index', template: 'spectrum.html' },
      { method: 'GET', path: '/api/status', handler: 'api_status', returns: 'status_info' },
      { method: 'GET', path: '/api/scan/<profile_id>', handler: 'api_scan', returns: 'scan_results' },
      { method: 'GET', path: '/api/profiles', handler: 'api_profiles', returns: 'scan_profiles' }
    ],
    websockets: [
      { event: 'connect', handler: 'handle_connect' },
      { event: 'fft_data', emitted: true, data: 'spectrum_data' }
    ],
    features: ['openwebrx_integration', 'real_time_fft', 'signal_detection', 'websocket_support']
  },
  wigle_to_tak: {
    file: 'src/wigletotak/WigleToTAK/TheStinkToTAK/WigleToTak2.py',
    port: 8000,
    endpoints: [
      { method: 'GET', path: '/', handler: 'index', template: 'WigleToTAK.html' },
      { method: 'POST', path: '/update_tak_settings', handler: 'update_tak_settings', body: ['tak_server_ip', 'tak_server_port'] },
      { method: 'POST', path: '/update_multicast_state', handler: 'update_multicast_state', body: ['takMulticast'] },
      { method: 'POST', path: '/update_analysis_mode', handler: 'update_analysis_mode', body: ['mode'] },
      { method: 'POST', path: '/update_antenna_sensitivity', handler: 'update_antenna_sensitivity', body: ['antenna_sensitivity', 'custom_factor'] },
      { method: 'GET', path: '/get_antenna_settings', handler: 'get_antenna_settings', returns: 'antenna_config' },
      { method: 'GET', path: '/list_wigle_files', handler: 'list_wigle_files', query: ['directory'], returns: 'file_list' },
      { method: 'POST', path: '/start_broadcast', handler: 'start_broadcast', body: ['directory', 'filename'] },
      { method: 'POST', path: '/stop_broadcast', handler: 'stop_broadcast' },
      { method: 'POST', path: '/add_to_whitelist', handler: 'add_to_whitelist', body: ['ssid', 'mac'] },
      { method: 'POST', path: '/remove_from_whitelist', handler: 'remove_from_whitelist', body: ['ssid', 'mac'] },
      { method: 'POST', path: '/add_to_blacklist', handler: 'add_to_blacklist', body: ['ssid', 'mac', 'argb_value'] },
      { method: 'POST', path: '/remove_from_blacklist', handler: 'remove_from_blacklist', body: ['ssid', 'mac'] }
    ],
    features: ['tak_broadcasting', 'wigle_csv_processing', 'antenna_sensitivity', 'whitelist_blacklist']
  }
};

// Node.js Application Analysis Data
const NODEJS_APPS = {
  wigle_to_tak: {
    file: 'src/nodejs/wigle-to-tak/server.js',
    port: 3002,
    endpoints: [
      { method: 'GET', path: '/', handler: 'static_html', template: 'WigleToTAK.html' },
      { method: 'GET', path: '/api/status', handler: 'status', returns: 'status_info' },
      { method: 'POST', path: '/update_tak_settings', handler: 'update_tak_settings', body: ['tak_server_ip', 'tak_server_port'] },
      { method: 'POST', path: '/update_multicast_state', handler: 'update_multicast_state', body: ['takMulticast'] },
      { method: 'POST', path: '/update_analysis_mode', handler: 'update_analysis_mode', body: ['mode'] },
      { method: 'POST', path: '/update_antenna_sensitivity', handler: 'update_antenna_sensitivity', body: ['antenna_sensitivity', 'custom_factor'] },
      { method: 'GET', path: '/get_antenna_settings', handler: 'get_antenna_settings', returns: 'antenna_config' },
      { method: 'GET', path: '/list_wigle_files', handler: 'list_wigle_files', query: ['directory'], returns: 'enhanced_file_list' },
      { method: 'POST', path: '/start_broadcast', handler: 'start_broadcast', body: ['directory', 'filename'] },
      { method: 'POST', path: '/stop_broadcast', handler: 'stop_broadcast' },
      { method: 'POST', path: '/add_to_whitelist', handler: 'add_to_whitelist', body: ['ssid', 'mac'] },
      { method: 'POST', path: '/remove_from_whitelist', handler: 'remove_from_whitelist', body: ['ssid', 'mac'] },
      { method: 'POST', path: '/add_to_blacklist', handler: 'add_to_blacklist', body: ['ssid', 'mac', 'argb_value'] },
      { method: 'POST', path: '/remove_from_blacklist', handler: 'remove_from_blacklist', body: ['ssid', 'mac'] },
      // Additional Node.js specific endpoints
      { method: 'POST', path: '/upload_csv', handler: 'upload_csv', middleware: 'multer', body: ['csvFile'] },
      { method: 'POST', path: '/api/start', handler: 'api_start', alias_for: '/start_broadcast' },
      { method: 'POST', path: '/api/stop', handler: 'api_stop', alias_for: '/stop_broadcast' },
      { method: 'POST', path: '/api/config', handler: 'api_config', body: ['analysisMode', 'antennaSensitivity', 'takServerIp', 'takServerPort'] },
      { method: 'GET', path: '/health', handler: 'health_check', returns: 'health_status' }
    ],
    features: ['tak_broadcasting', 'wigle_csv_processing', 'antenna_sensitivity', 'whitelist_blacklist', 'file_upload', 'health_check', 'enhanced_api']
  },
  kismet_operations: {
    file: 'src/nodejs/kismet-operations/server.js',
    port: 8092,
    endpoints: [
      { method: 'GET', path: '/', handler: 'hi_html', template: 'hi.html' },
      { method: 'GET', path: '/hi.html', handler: 'hi_html_direct', template: 'hi.html' },
      { method: 'GET', path: '/health', handler: 'health_check', returns: 'extended_health' },
      // Webhook endpoints for frontend compatibility
      { method: 'POST', path: '/run-script', handler: 'run_script', starts: 'gps_kismet_wigle' },
      { method: 'POST', path: '/stop-script', handler: 'stop_script', stops: 'gps_kismet_wigle' },
      { method: 'GET', path: '/script-status', handler: 'script_status', returns: 'service_status' },
      // API endpoints
      { method: 'GET', path: '/api/config', handler: 'get_config', returns: 'spectrum_config' },
      { method: 'POST', path: '/api/config', handler: 'update_config', body: ['fft_size', 'center_freq', 'samp_rate'] },
      { method: 'GET', path: '/api/status', handler: 'get_status', returns: 'extended_status' },
      { method: 'POST', path: '/api/connect', handler: 'connect_openwebrx', body: ['url'] },
      { method: 'POST', path: '/api/disconnect', handler: 'disconnect_openwebrx' },
      { method: 'GET', path: '/api/signals', handler: 'get_signals', query: ['threshold'], returns: 'detected_signals' },
      { method: 'GET', path: '/api/signals/stats', handler: 'get_signal_stats', returns: 'signal_statistics' },
      { method: 'GET', path: '/api/fft/latest', handler: 'get_latest_fft', returns: 'fft_data' },
      { method: 'POST', path: '/api/fft/clear', handler: 'clear_fft_buffer' },
      // Legacy endpoints
      { method: 'GET', path: '/api/profiles', handler: 'get_profiles', returns: 'scan_profiles' },
      { method: 'GET', path: '/api/scan/:profileId', handler: 'scan_profile', params: ['profileId'], returns: 'scan_results' },
      { method: 'GET', path: '/api/kismet-data', handler: 'get_kismet_data', returns: 'kismet_data_with_demo_fallback' }
    ],
    websockets: [
      { event: 'connection', handler: 'handle_connection' },
      { event: 'disconnect', handler: 'handle_disconnect' },
      { event: 'requestStatus', handler: 'send_status' },
      { event: 'requestLatestFFT', handler: 'send_latest_fft' },
      { event: 'requestSignals', handler: 'send_signals', data: ['threshold'] },
      { event: 'requestKismetData', handler: 'send_kismet_data' },
      // Emitted events
      { event: 'fftData', emitted: true, data: 'spectrum_data' },
      { event: 'signalsDetected', emitted: true, data: 'detected_signals' },
      { event: 'openwebrxConnected', emitted: true, data: 'connection_status' },
      { event: 'openwebrxDisconnected', emitted: true, data: 'disconnection_status' },
      { event: 'openwebrxError', emitted: true, data: 'error_info' },
      { event: 'configUpdated', emitted: true, data: 'new_config' },
      { event: 'bufferCleared', emitted: true, data: 'clear_confirmation' },
      { event: 'kismetData', emitted: true, data: 'kismet_update' },
      { event: 'kismetDataUpdate', emitted: true, data: 'automated_kismet_update' }
    ],
    features: ['spectrum_analysis', 'openwebrx_integration', 'kismet_integration', 'script_management', 'websocket_support', 'health_monitoring', 'signal_detection']
  }
};

// Security Configuration Analysis
const SECURITY_COMPARISON = {
  flask: {
    cors: { 
      implementation: 'flask-socketio cors_allowed_origins="*"',
      level: 'basic',
      issues: ['wildcard_cors', 'no_explicit_cors_middleware']
    },
    headers: {
      implementation: 'none',
      level: 'minimal',
      issues: ['no_security_headers', 'no_csp', 'no_helmet_equivalent']
    },
    authentication: {
      implementation: 'none',
      level: 'none',
      issues: ['no_auth', 'no_api_keys', 'no_rate_limiting']
    }
  },
  nodejs: {
    cors: {
      implementation: 'cors middleware',
      level: 'standard',
      features: ['express_cors_middleware']
    },
    headers: {
      implementation: 'helmet middleware',
      level: 'good',
      features: ['csp_configuration', 'security_headers', 'xss_protection']
    },
    authentication: {
      implementation: 'partial',
      level: 'basic',
      features: ['kismet_api_key_support'],
      missing: ['jwt_auth', 'session_management', 'rate_limiting']
    }
  }
};

// Error Handling Analysis
const ERROR_HANDLING_COMPARISON = {
  flask: {
    pattern: 'try/except blocks',
    consistency: 'inconsistent',
    status_codes: ['basic_http_codes'],
    logging: 'python_logging',
    issues: ['inconsistent_error_format', 'missing_status_codes', 'limited_error_context']
  },
  nodejs: {
    pattern: 'try/catch + middleware',
    consistency: 'good',
    status_codes: ['comprehensive_http_codes', 'proper_4xx_5xx_usage'],
    logging: 'winston_structured',
    features: ['error_middleware', 'structured_logging', 'consistent_error_format']
  }
};

// WebSocket Implementation Analysis
const WEBSOCKET_COMPARISON = {
  flask: {
    library: 'flask-socketio',
    events: ['connect', 'fft_data'],
    features: ['basic_emit', 'connection_handling'],
    issues: ['limited_event_handling', 'no_client_management', 'basic_error_handling']
  },
  nodejs: {
    library: 'socket.io',
    events: ['connection', 'disconnect', 'requestStatus', 'requestLatestFFT', 'requestSignals', 'requestKismetData'],
    emitted_events: ['fftData', 'signalsDetected', 'openwebrxConnected', 'openwebrxDisconnected', 'openwebrxError', 'configUpdated', 'bufferCleared', 'kismetData', 'kismetDataUpdate'],
    features: ['comprehensive_event_handling', 'client_management', 'event_forwarding', 'error_handling', 'connection_tracking'],
    advanced: ['automated_updates', 'polling_integration', 'graceful_disconnection']
  }
};

class APICompatibilityAnalyzer {
  constructor() {
    this.analysis = {
      timestamp: new Date().toISOString(),
      flask_apps: FLASK_APPS,
      nodejs_apps: NODEJS_APPS,
      compatibility_matrix: {},
      gaps: [],
      security_analysis: SECURITY_COMPARISON,
      error_handling: ERROR_HANDLING_COMPARISON,
      websocket_analysis: WEBSOCKET_COMPARISON,
      recommendations: []
    };
  }

  analyze() {
    console.log('🔍 Starting Comprehensive API Compatibility Analysis...\n');
    
    this.analyzeEndpointCompatibility();
    this.analyzeSecurityImplementations();
    this.analyzeErrorHandling();
    this.analyzeWebSocketImplementations();
    this.identifyGapsAndIssues();
    this.generateRecommendations();
    
    return this.analysis;
  }

  analyzeEndpointCompatibility() {
    console.log('📊 Analyzing Endpoint Compatibility...');
    
    // Compare Spectrum Analyzer (Flask vs Node.js Kismet Operations)
    this.analysis.compatibility_matrix.spectrum_analyzer = this.compareApps(
      FLASK_APPS.spectrum_analyzer,
      NODEJS_APPS.kismet_operations,
      'Spectrum Analyzer'
    );
    
    // Compare WigleToTAK (Flask vs Node.js)
    this.analysis.compatibility_matrix.wigle_to_tak = this.compareApps(
      FLASK_APPS.wigle_to_tak,
      NODEJS_APPS.wigle_to_tak,
      'WigleToTAK'
    );
  }

  compareApps(flaskApp, nodeApp, appName) {
    const comparison = {
      app_name: appName,
      flask_port: flaskApp.port,
      nodejs_port: nodeApp.port,
      endpoint_mapping: [],
      missing_in_nodejs: [],
      additional_in_nodejs: [],
      compatibility_score: 0,
      issues: []
    };

    // Create endpoint maps for comparison
    const flaskEndpointMap = new Map();
    const nodeEndpointMap = new Map();

    flaskApp.endpoints.forEach(ep => {
      const key = `${ep.method}:${ep.path}`;
      flaskEndpointMap.set(key, ep);
    });

    nodeApp.endpoints.forEach(ep => {
      const key = `${ep.method}:${ep.path}`;
      nodeEndpointMap.set(key, ep);
    });

    // Find matching endpoints
    let matchedCount = 0;
    flaskEndpointMap.forEach((flaskEp, key) => {
      if (nodeEndpointMap.has(key)) {
        const nodeEp = nodeEndpointMap.get(key);
        comparison.endpoint_mapping.push({
          endpoint: key,
          flask_handler: flaskEp.handler,
          nodejs_handler: nodeEp.handler,
          status: 'MATCHED',
          compatibility: this.checkEndpointCompatibility(flaskEp, nodeEp)
        });
        matchedCount++;
      } else {
        comparison.missing_in_nodejs.push({
          endpoint: key,
          flask_handler: flaskEp.handler,
          status: 'MISSING',
          impact: 'HIGH'
        });
      }
    });

    // Find additional Node.js endpoints
    nodeEndpointMap.forEach((nodeEp, key) => {
      if (!flaskEndpointMap.has(key)) {
        comparison.additional_in_nodejs.push({
          endpoint: key,
          nodejs_handler: nodeEp.handler,
          status: 'ADDITIONAL',
          benefit: this.assessAdditionalEndpointBenefit(nodeEp)
        });
      }
    });

    // Calculate compatibility score
    const totalFlaskEndpoints = flaskApp.endpoints.length;
    comparison.compatibility_score = totalFlaskEndpoints > 0 ? 
      Math.round((matchedCount / totalFlaskEndpoints) * 100) : 100;

    // Port mismatch check
    if (flaskApp.port !== nodeApp.port) {
      comparison.issues.push({
        type: 'PORT_MISMATCH',
        description: `Flask runs on port ${flaskApp.port}, Node.js on port ${nodeApp.port}`,
        impact: 'MEDIUM'
      });
    }

    return comparison;
  }

  checkEndpointCompatibility(flaskEp, nodeEp) {
    const issues = [];
    
    // Check request body parameters
    if (flaskEp.body && nodeEp.body) {
      const flaskParams = new Set(flaskEp.body);
      const nodeParams = new Set(nodeEp.body);
      
      flaskParams.forEach(param => {
        if (!nodeParams.has(param)) {
          issues.push(`Missing body parameter: ${param}`);
        }
      });
    }

    // Check query parameters
    if (flaskEp.query && nodeEp.query) {
      const flaskQuery = new Set(flaskEp.query);
      const nodeQuery = new Set(nodeEp.query);
      
      flaskQuery.forEach(param => {
        if (!nodeQuery.has(param)) {
          issues.push(`Missing query parameter: ${param}`);
        }
      });
    }

    return {
      compatible: issues.length === 0,
      issues: issues,
      confidence: issues.length === 0 ? 'HIGH' : issues.length <= 2 ? 'MEDIUM' : 'LOW'
    };
  }

  assessAdditionalEndpointBenefit(nodeEp) {
    if (nodeEp.path.includes('/health')) return 'HIGH';
    if (nodeEp.path.includes('/api/')) return 'MEDIUM';
    if (nodeEp.path.includes('upload')) return 'HIGH';
    return 'LOW';
  }

  analyzeSecurityImplementations() {
    console.log('🔒 Analyzing Security Implementations...');
    
    const securityGaps = [];
    
    // CORS Analysis
    if (SECURITY_COMPARISON.flask.cors.issues.includes('wildcard_cors')) {
      securityGaps.push({
        component: 'Flask CORS',
        issue: 'Wildcard CORS origins (*) allows any domain',
        severity: 'HIGH',
        recommendation: 'Configure specific allowed origins'
      });
    }
    
    // Security Headers
    if (SECURITY_COMPARISON.flask.headers.level === 'minimal') {
      securityGaps.push({
        component: 'Flask Security Headers',
        issue: 'No security headers implementation',
        severity: 'HIGH',
        recommendation: 'Implement security headers similar to Node.js helmet configuration'
      });
    }
    
    // Authentication
    if (SECURITY_COMPARISON.flask.authentication.level === 'none') {
      securityGaps.push({
        component: 'Flask Authentication',
        issue: 'No authentication mechanism',
        severity: 'MEDIUM',
        recommendation: 'Implement API key or JWT authentication'
      });
    }

    this.analysis.security_gaps = securityGaps;
  }

  analyzeErrorHandling() {
    console.log('⚠️ Analyzing Error Handling Patterns...');
    
    const errorHandlingIssues = [];
    
    if (ERROR_HANDLING_COMPARISON.flask.consistency === 'inconsistent') {
      errorHandlingIssues.push({
        component: 'Flask Error Handling',
        issue: 'Inconsistent error response format across endpoints',
        impact: 'MEDIUM',
        recommendation: 'Standardize error response format with consistent structure'
      });
    }
    
    if (ERROR_HANDLING_COMPARISON.flask.issues.includes('missing_status_codes')) {
      errorHandlingIssues.push({
        component: 'Flask HTTP Status Codes',
        issue: 'Missing proper HTTP status codes for error conditions',
        impact: 'MEDIUM',
        recommendation: 'Implement proper 4xx and 5xx status codes'
      });
    }

    this.analysis.error_handling_issues = errorHandlingIssues;
  }

  analyzeWebSocketImplementations() {
    console.log('🔌 Analyzing WebSocket Implementations...');
    
    const websocketGaps = [];
    
    // Event handling comparison
    const flaskEvents = WEBSOCKET_COMPARISON.flask.events.length;
    const nodeEvents = WEBSOCKET_COMPARISON.nodejs.events.length;
    
    if (nodeEvents > flaskEvents) {
      websocketGaps.push({
        component: 'WebSocket Events',
        issue: `Node.js implements ${nodeEvents} events vs Flask's ${flaskEvents}`,
        gap: `Missing ${nodeEvents - flaskEvents} event types in Flask`,
        recommendation: 'Implement comprehensive WebSocket event handling in Flask'
      });
    }
    
    // Advanced features
    if (WEBSOCKET_COMPARISON.nodejs.features.includes('client_management') && 
        !WEBSOCKET_COMPARISON.flask.features.includes('client_management')) {
      websocketGaps.push({
        component: 'WebSocket Client Management',
        issue: 'Flask lacks client connection management',
        recommendation: 'Implement client tracking and management'
      });
    }

    this.analysis.websocket_gaps = websocketGaps;
  }

  identifyGapsAndIssues() {
    console.log('🎯 Identifying Critical Gaps and Issues...');
    
    const criticalGaps = [];
    
    // Missing Flask endpoints in Node.js
    Object.values(this.analysis.compatibility_matrix).forEach(comparison => {
      comparison.missing_in_nodejs.forEach(missing => {
        if (missing.impact === 'HIGH') {
          criticalGaps.push({
            type: 'MISSING_ENDPOINT',
            description: `${missing.endpoint} not implemented in Node.js`,
            component: comparison.app_name,
            severity: 'HIGH'
          });
        }
      });
    });
    
    // Port mismatches
    if (NODEJS_APPS.kismet_operations.port === FLASK_APPS.spectrum_analyzer.port) {
      criticalGaps.push({
        type: 'PORT_CONFLICT',
        description: 'Kismet Operations (Node.js) and Spectrum Analyzer (Flask) both use port 8092',
        component: 'Infrastructure',
        severity: 'HIGH'
      });
    }
    
    // Feature gaps
    const flaskFeatures = new Set([
      ...FLASK_APPS.spectrum_analyzer.features,
      ...FLASK_APPS.wigle_to_tak.features
    ]);
    
    const nodeFeatures = new Set([
      ...NODEJS_APPS.kismet_operations.features,
      ...NODEJS_APPS.wigle_to_tak.features
    ]);
    
    flaskFeatures.forEach(feature => {
      if (!nodeFeatures.has(feature)) {
        criticalGaps.push({
          type: 'MISSING_FEATURE',
          description: `Feature '${feature}' not implemented in Node.js`,
          component: 'Features',
          severity: 'MEDIUM'
        });
      }
    });

    this.analysis.critical_gaps = criticalGaps;
  }

  generateRecommendations() {
    console.log('💡 Generating Recommendations...');
    
    const recommendations = [
      {
        priority: 'HIGH',
        category: 'Security',
        title: 'Implement Comprehensive Security Headers',
        description: 'Add helmet.js equivalent security headers to Flask applications',
        implementation: 'Use Flask-Talisman or custom middleware for CSP, HSTS, XSS protection'
      },
      {
        priority: 'HIGH',
        category: 'API Compatibility',
        title: 'Standardize Error Response Format',
        description: 'Implement consistent error response structure across Flask and Node.js',
        implementation: 'Use JSON error format: {success: false, error: message, code: http_code}'
      },
      {
        priority: 'MEDIUM',
        category: 'WebSocket',
        title: 'Enhance Flask WebSocket Implementation',
        description: 'Add comprehensive WebSocket event handling to match Node.js capabilities',
        implementation: 'Implement client management, event forwarding, and error handling'
      },
      {
        priority: 'MEDIUM',
        category: 'Infrastructure',
        title: 'Resolve Port Conflicts',
        description: 'Address port 8092 conflict between Flask and Node.js applications',
        implementation: 'Configure different ports or implement proper service orchestration'
      },
      {
        priority: 'LOW',
        category: 'Enhancement',
        title: 'Add Health Check Endpoints',
        description: 'Implement /health endpoints in Flask applications',
        implementation: 'Add health check routes returning service status and dependencies'
      }
    ];

    this.analysis.recommendations = recommendations;
  }

  generateReport() {
    const report = {
      ...this.analysis,
      summary: {
        total_flask_endpoints: 
          FLASK_APPS.spectrum_analyzer.endpoints.length + 
          FLASK_APPS.wigle_to_tak.endpoints.length,
        total_nodejs_endpoints: 
          NODEJS_APPS.kismet_operations.endpoints.length + 
          NODEJS_APPS.wigle_to_tak.endpoints.length,
        compatibility_scores: Object.values(this.analysis.compatibility_matrix)
          .map(c => c.compatibility_score),
        critical_issues_count: this.analysis.critical_gaps?.length || 0,
        security_gaps_count: this.analysis.security_gaps?.length || 0
      }
    };

    return report;
  }
}

// Execute Analysis
async function runAnalysis() {
  try {
    const analyzer = new APICompatibilityAnalyzer();
    const analysis = analyzer.analyze();
    const report = analyzer.generateReport();
    
    // Write detailed report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `/home/pi/projects/stinkster_malone/stinkster/api-compatibility-analysis-${timestamp}.json`;
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📋 Analysis Complete!');
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Print Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Flask Endpoints: ${report.summary.total_flask_endpoints}`);
    console.log(`Node.js Endpoints: ${report.summary.total_nodejs_endpoints}`);
    console.log(`Compatibility Scores: ${report.summary.compatibility_scores.join('%, ')}%`);
    console.log(`Critical Issues: ${report.summary.critical_issues_count}`);
    console.log(`Security Gaps: ${report.summary.security_gaps_count}`);
    
    // Print Critical Gaps
    if (report.critical_gaps && report.critical_gaps.length > 0) {
      console.log('\n🚨 CRITICAL GAPS:');
      report.critical_gaps.forEach((gap, index) => {
        console.log(`${index + 1}. [${gap.severity}] ${gap.description}`);
      });
    }
    
    // Print Top Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      report.recommendations
        .filter(r => r.priority === 'HIGH')
        .forEach((rec, index) => {
          console.log(`${index + 1}. ${rec.title}`);
          console.log(`   ${rec.description}`);
        });
    }
    
    return reportPath;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runAnalysis()
    .then(reportPath => {
      console.log(`\n✅ API Compatibility Analysis completed successfully`);
      console.log(`📁 Report location: ${reportPath}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { APICompatibilityAnalyzer, runAnalysis };