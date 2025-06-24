/**
 * Shared Constants for Stinkster Node.js
 * 
 * Centralized constants used across all services
 */

module.exports = {
    // Application metadata
    APP: {
        NAME: 'Stinkster Node.js',
        VERSION: '2.0.0',
        DESCRIPTION: 'Raspberry Pi SDR & WiFi Intelligence Platform'
    },

    // Default ports
    PORTS: {
        SPECTRUM_ANALYZER: 8092,
        WIGLE_TO_TAK: 8000,
        GPS_BRIDGE: 2947,
        OPENWEBRX: 8073,
        HEALTH_CHECK: 9000
    },

    // Service names
    SERVICES: {
        SPECTRUM_ANALYZER: 'spectrum-analyzer',
        WIGLE_TO_TAK: 'wigle-to-tak',
        GPS_BRIDGE: 'gps-bridge',
        OPENWEBRX: 'openwebrx'
    },

    // File extensions and types
    FILE_TYPES: {
        WIGLE_CSV: '.wiglecsv',
        CONFIG_JSON: '.json',
        LOG: '.log',
        BACKUP: '.bak'
    },

    // Network constants
    NETWORK: {
        TAK: {
            DEFAULT_MULTICAST_GROUP: '239.2.3.1',
            DEFAULT_MULTICAST_PORT: 6969,
            DEFAULT_UNICAST_PORT: 6969,
            MULTICAST_TTL: 1,
            DEFAULT_STALE_TIME_HOURS: 24
        },
        GPSD: {
            DEFAULT_PORT: 2947,
            PROTOCOL_VERSION: '3.11',
            RELEASE_VERSION: '3.17'
        },
        MAVLINK: {
            DEFAULT_CONNECTION: 'tcp:localhost:14550',
            HEARTBEAT_INTERVAL: 1000
        }
    },

    // Signal processing constants
    SIGNAL_PROCESSING: {
        FFT: {
            DEFAULT_SIZE: 1024,
            MAX_BUFFER_SIZE: 100,
            MIN_THRESHOLD_DB: -120,
            MAX_THRESHOLD_DB: 0
        },
        FREQUENCIES: {
            VHF_LOW: 144e6,    // 144 MHz
            VHF_HIGH: 148e6,   // 148 MHz
            UHF_LOW: 420e6,    // 420 MHz
            UHF_HIGH: 450e6,   // 450 MHz
            ISM_LOW: 2400e6,   // 2.4 GHz
            ISM_HIGH: 2485e6   // 2.485 GHz
        },
        SCAN_PROFILES: {
            VHF: {
                name: 'VHF Amateur (144-148 MHz)',
                ranges: [[144.0, 148.0]],
                step: 25,
                description: 'VHF Amateur Radio Band'
            },
            UHF: {
                name: 'UHF Amateur (420-450 MHz)',
                ranges: [[420.0, 450.0]],
                step: 25,
                description: 'UHF Amateur Radio Band'
            },
            ISM: {
                name: 'ISM Band (2.4 GHz)',
                ranges: [[2400.0, 2485.0]],
                step: 1000,
                description: 'Industrial, Scientific, Medical Band'
            }
        }
    },

    // WiFi and antenna constants
    WIFI: {
        ANTENNA_SENSITIVITY: {
            STANDARD: 1.0,
            ALFA_CARD: 1.5,
            HIGH_GAIN: 2.0,
            RPI_INTERNAL: 0.7,
            CUSTOM: 1.0
        },
        RSSI: {
            EXCELLENT: -30,
            GOOD: -50,
            FAIR: -70,
            POOR: -90
        },
        CHANNELS: {
            '2.4GHZ': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            '5GHZ': [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165]
        }
    },

    // TAK/CoT constants
    TAK: {
        COT: {
            VERSION: '2.0',
            DEFAULT_TYPE: 'b-m-p-s-m',
            DEFAULT_HOW: 'm-g',
            DEFAULT_COLOR_ARGB: '-65281', // Red
            POINT: {
                DEFAULT_HAE: '999999',
                DEFAULT_CE: '35.0',
                DEFAULT_LE: '999999'
            }
        },
        COLORS: {
            RED: '-65536',
            GREEN: '-16711936',
            BLUE: '-16776961',
            YELLOW: '-256',
            ORANGE: '-23296',
            PURPLE: '-8388353',
            CYAN: '-16711681',
            WHITE: '-1',
            BLACK: '-16777216'
        }
    },

    // GPS constants
    GPS: {
        FIX_TYPES: {
            NO_FIX: 0,
            GPS_FIX: 1,
            DGPS_FIX: 2,
            PPS_FIX: 3,
            RTK_FIXED: 4,
            RTK_FLOAT: 5,
            ESTIMATED: 6,
            MANUAL: 7,
            SIMULATION: 8
        },
        COORDINATE_PRECISION: 7,
        ALTITUDE_PRECISION: 3,
        SPEED_PRECISION: 2,
        BEARING_PRECISION: 2
    },

    // Error codes
    ERROR_CODES: {
        // General errors
        UNKNOWN_ERROR: 'UNKNOWN_ERROR',
        CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        
        // Network errors
        CONNECTION_ERROR: 'CONNECTION_ERROR',
        CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
        CONNECTION_REFUSED: 'CONNECTION_REFUSED',
        
        // File system errors
        FILE_NOT_FOUND: 'FILE_NOT_FOUND',
        FILE_ACCESS_ERROR: 'FILE_ACCESS_ERROR',
        FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
        
        // Service errors
        SERVICE_NOT_AVAILABLE: 'SERVICE_NOT_AVAILABLE',
        SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',
        SERVICE_ERROR: 'SERVICE_ERROR',
        
        // Protocol errors
        PROTOCOL_ERROR: 'PROTOCOL_ERROR',
        INVALID_MESSAGE: 'INVALID_MESSAGE',
        UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION'
    },

    // HTTP status codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        METHOD_NOT_ALLOWED: 405,
        CONFLICT: 409,
        INTERNAL_SERVER_ERROR: 500,
        BAD_GATEWAY: 502,
        SERVICE_UNAVAILABLE: 503,
        GATEWAY_TIMEOUT: 504
    },

    // Log levels
    LOG_LEVELS: {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug',
        VERBOSE: 'verbose',
        SILLY: 'silly'
    },

    // Rate limiting
    RATE_LIMITS: {
        API_CALLS_PER_MINUTE: 60,
        WEBSOCKET_MESSAGES_PER_SECOND: 10,
        FILE_PROCESSING_PER_MINUTE: 100
    },

    // Performance thresholds
    PERFORMANCE: {
        MAX_RESPONSE_TIME_MS: 1000,
        MAX_MEMORY_USAGE_MB: 512,
        MAX_CPU_USAGE_PERCENT: 80,
        HEALTH_CHECK_INTERVAL_MS: 30000
    },

    // Security settings
    SECURITY: {
        MAX_REQUEST_SIZE: '10mb',
        BCRYPT_ROUNDS: 12,
        JWT_EXPIRY: '24h',
        CORS_MAX_AGE: 86400 // 24 hours
    },

    // File system limits
    FILE_LIMITS: {
        MAX_LOG_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_LOG_FILES: 5,
        MAX_CSV_FILE_SIZE: 100 * 1024 * 1024, // 100MB
        MAX_CONFIG_FILE_SIZE: 1024 * 1024 // 1MB
    },

    // Environment types
    ENVIRONMENTS: {
        DEVELOPMENT: 'development',
        PRODUCTION: 'production',
        TEST: 'test'
    },

    // WebSocket event types
    WEBSOCKET_EVENTS: {
        CONNECT: 'connect',
        DISCONNECT: 'disconnect',
        ERROR: 'error',
        FFT_DATA: 'fft_data',
        STATUS: 'status',
        SIGNAL_DETECTED: 'signal_detected',
        CONNECTION_STATUS: 'connection_status'
    },

    // Regular expressions for validation
    REGEX: {
        IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
        EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        FREQUENCY: /^[0-9]+(\.[0-9]+)?\s*(Hz|kHz|MHz|GHz)$/,
        FILENAME: /^[a-zA-Z0-9\-_.]+$/
    },

    // Timeout values (milliseconds)
    TIMEOUTS: {
        CONNECTION: 10000,      // 10 seconds
        REQUEST: 30000,         // 30 seconds
        HEALTH_CHECK: 5000,     // 5 seconds
        FILE_WATCH: 1000,       // 1 second
        WEBSOCKET_PING: 25000,  // 25 seconds
        SHUTDOWN: 5000          // 5 seconds
    },

    // Buffer sizes
    BUFFER_SIZES: {
        FFT_BUFFER: 10,
        PROCESSED_MAC_CACHE: 10000,
        LOG_BUFFER: 100,
        WEBSOCKET_BUFFER: 50
    },

    // Default configuration values
    DEFAULTS: {
        LOG_LEVEL: 'info',
        CONFIG_FILE: 'config.json',
        DATA_DIRECTORY: './data',
        LOG_DIRECTORY: './logs',
        BACKUP_DIRECTORY: './backups'
    }
};