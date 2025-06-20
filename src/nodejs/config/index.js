/**
 * Configuration Management for Stinkster Node.js
 * 
 * Centralized configuration system that supports:
 * - Environment-specific configs (development, production, test)
 * - Environment variable overrides
 * - Configuration validation
 * - Default fallbacks
 */

const path = require('path');
const fs = require('fs');
const Joi = require('joi');

class ConfigManager {
    constructor() {
        this.env = process.env.NODE_ENV || 'production';
        this.config = this.loadConfiguration();
        this.validateConfiguration();
    }

    loadConfiguration() {
        // Default configuration
        const defaultConfig = {
            environment: this.env,
            
            // Global settings
            global: {
                logLevel: process.env.LOG_LEVEL || 'info',
                timezone: process.env.TZ || 'UTC',
                healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT) || 9000
            },

            // Spectrum Analyzer Service
            spectrum: {
                port: parseInt(process.env.SPECTRUM_PORT) || 8092,
                openwebrx: {
                    url: process.env.OPENWEBRX_URL || 'http://localhost:8073',
                    websocket_url: process.env.OPENWEBRX_WS_URL || 'ws://localhost:8073/ws/',
                    health_check_interval: parseInt(process.env.OPENWEBRX_HEALTH_INTERVAL) || 30000,
                    connection_timeout: parseInt(process.env.OPENWEBRX_TIMEOUT) || 10000,
                    reconnect_attempts: parseInt(process.env.OPENWEBRX_RECONNECT_ATTEMPTS) || 3,
                    reconnect_delay: parseInt(process.env.OPENWEBRX_RECONNECT_DELAY) || 5000
                },
                fft: {
                    buffer_size: parseInt(process.env.FFT_BUFFER_SIZE) || 10,
                    max_data_points: parseInt(process.env.FFT_MAX_POINTS) || 500,
                    update_interval: parseInt(process.env.FFT_UPDATE_INTERVAL) || 100
                },
                signal_processing: {
                    noise_floor_threshold: parseFloat(process.env.NOISE_FLOOR) || -80,
                    peak_detection_threshold: parseFloat(process.env.PEAK_THRESHOLD) || -50,
                    bandwidth_estimation: process.env.BANDWIDTH_ESTIMATION || 'auto'
                },
                websocket: {
                    cors_origin: process.env.SPECTRUM_CORS_ORIGIN || '*',
                    ping_interval: parseInt(process.env.WS_PING_INTERVAL) || 25000,
                    ping_timeout: parseInt(process.env.WS_PING_TIMEOUT) || 5000
                }
            },

            // WigleToTAK Service
            wigleToTak: {
                port: parseInt(process.env.WIGLE_TO_TAK_PORT) || 8000,
                data: {
                    wigle_directory: process.env.WIGLE_DATA_DIR || '/data/kismet',
                    file_watch_interval: parseInt(process.env.FILE_WATCH_INTERVAL) || 1000,
                    max_file_size: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
                    processed_cache_size: parseInt(process.env.PROCESSED_CACHE_SIZE) || 10000
                },
                tak: {
                    default_server_ip: process.env.TAK_SERVER_IP || '0.0.0.0',
                    default_server_port: parseInt(process.env.TAK_SERVER_PORT) || 6969,
                    multicast_group: process.env.TAK_MULTICAST_GROUP || '239.2.3.1',
                    multicast_port: parseInt(process.env.TAK_MULTICAST_PORT) || 6969,
                    multicast_ttl: parseInt(process.env.TAK_MULTICAST_TTL) || 1,
                    stale_time_hours: parseInt(process.env.TAK_STALE_HOURS) || 24,
                    default_color_argb: process.env.TAK_DEFAULT_COLOR || '-65281'
                },
                filtering: {
                    enable_whitelist: process.env.ENABLE_WHITELIST === 'true',
                    enable_blacklist: process.env.ENABLE_BLACKLIST === 'true',
                    max_list_size: parseInt(process.env.MAX_LIST_SIZE) || 1000
                },
                antenna: {
                    default_sensitivity: process.env.ANTENNA_SENSITIVITY || 'standard',
                    sensitivity_factors: {
                        'standard': 1.0,
                        'alfa_card': 1.5,
                        'high_gain': 2.0,
                        'rpi_internal': 0.7,
                        'custom': parseFloat(process.env.CUSTOM_ANTENNA_FACTOR) || 1.0
                    }
                }
            },

            // GPS Bridge Service
            gpsBridge: {
                port: parseInt(process.env.GPS_BRIDGE_PORT) || 2947,
                mavlink: {
                    connection: process.env.MAVLINK_CONNECTION || 'tcp:localhost:14550',
                    connection_timeout: parseInt(process.env.MAVLINK_TIMEOUT) || 10000,
                    heartbeat_interval: parseInt(process.env.MAVLINK_HEARTBEAT) || 1000,
                    reconnect_attempts: parseInt(process.env.MAVLINK_RECONNECT_ATTEMPTS) || 5,
                    reconnect_delay: parseInt(process.env.MAVLINK_RECONNECT_DELAY) || 5000
                },
                gpsd: {
                    protocol_version: process.env.GPSD_PROTOCOL_VERSION || '3.11',
                    release_version: process.env.GPSD_RELEASE_VERSION || '3.17',
                    device_path: process.env.GPSD_DEVICE_PATH || 'mavlink',
                    driver_name: process.env.GPSD_DRIVER || 'MAVLink'
                },
                positioning: {
                    coordinate_precision: parseInt(process.env.COORD_PRECISION) || 7,
                    altitude_precision: parseInt(process.env.ALT_PRECISION) || 3,
                    speed_precision: parseInt(process.env.SPEED_PRECISION) || 2,
                    bearing_precision: parseInt(process.env.BEARING_PRECISION) || 2
                }
            },

            // Shared utilities configuration
            shared: {
                logging: {
                    level: process.env.LOG_LEVEL || 'info',
                    format: process.env.LOG_FORMAT || 'combined',
                    file_path: process.env.LOG_FILE_PATH || './logs',
                    max_file_size: process.env.LOG_MAX_SIZE || '10m',
                    max_files: parseInt(process.env.LOG_MAX_FILES) || 5,
                    enable_console: process.env.LOG_CONSOLE !== 'false'
                },
                security: {
                    enable_helmet: process.env.ENABLE_HELMET !== 'false',
                    enable_cors: process.env.ENABLE_CORS !== 'false',
                    enable_compression: process.env.ENABLE_COMPRESSION !== 'false',
                    rate_limit_window: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
                    rate_limit_max: parseInt(process.env.RATE_LIMIT_MAX) || 100
                },
                performance: {
                    enable_clustering: process.env.ENABLE_CLUSTERING === 'true',
                    memory_limit_mb: parseInt(process.env.MEMORY_LIMIT_MB) || 512,
                    cpu_threshold: parseFloat(process.env.CPU_THRESHOLD) || 80.0,
                    monitor_interval: parseInt(process.env.MONITOR_INTERVAL) || 30000
                }
            }
        };

        // Environment-specific overrides
        const envConfig = this.loadEnvironmentConfig();
        
        // File-based configuration override
        const fileConfig = this.loadFileConfig();

        // Merge configurations (file config takes precedence)
        return {
            ...defaultConfig,
            ...envConfig,
            ...fileConfig
        };
    }

    loadEnvironmentConfig() {
        // Environment-specific configurations
        const configs = {
            development: {
                global: {
                    logLevel: 'debug'
                },
                spectrum: {
                    openwebrx: {
                        health_check_interval: 10000 // More frequent checks in dev
                    },
                    fft: {
                        update_interval: 50 // Faster updates for development
                    }
                },
                wigleToTak: {
                    data: {
                        file_watch_interval: 500 // More responsive file watching
                    }
                },
                shared: {
                    logging: {
                        level: 'debug',
                        enable_console: true
                    }
                }
            },

            test: {
                global: {
                    logLevel: 'silent'
                },
                spectrum: {
                    port: 0, // Random port for testing
                    openwebrx: {
                        url: 'http://localhost:8073',
                        connection_timeout: 1000
                    }
                },
                wigleToTak: {
                    port: 0, // Random port for testing
                    data: {
                        wigle_directory: './test-data'
                    }
                },
                gpsBridge: {
                    port: 0, // Random port for testing
                    mavlink: {
                        connection: 'mock://test'
                    }
                },
                shared: {
                    logging: {
                        level: 'silent',
                        enable_console: false
                    }
                }
            },

            production: {
                shared: {
                    logging: {
                        level: 'info',
                        enable_console: false
                    },
                    security: {
                        enable_helmet: true,
                        enable_cors: true,
                        enable_compression: true
                    }
                }
            }
        };

        return configs[this.env] || {};
    }

    loadFileConfig() {
        const configFile = process.env.CONFIG_FILE || 
                          path.join(__dirname, `${this.env}.json`);
        
        if (fs.existsSync(configFile)) {
            try {
                const fileContent = fs.readFileSync(configFile, 'utf8');
                return JSON.parse(fileContent);
            } catch (error) {
                console.warn(`Warning: Could not parse config file ${configFile}:`, error.message);
                return {};
            }
        }

        return {};
    }

    validateConfiguration() {
        const schema = Joi.object({
            environment: Joi.string().valid('development', 'production', 'test').required(),
            
            global: Joi.object({
                logLevel: Joi.string().valid('error', 'warn', 'info', 'debug', 'silent').required(),
                timezone: Joi.string().required(),
                healthCheckPort: Joi.number().port().required()
            }).required(),

            spectrum: Joi.object({
                port: Joi.number().port().required(),
                openwebrx: Joi.object({
                    url: Joi.string().uri().required(),
                    websocket_url: Joi.string().required(),
                    health_check_interval: Joi.number().positive().required(),
                    connection_timeout: Joi.number().positive().required(),
                    reconnect_attempts: Joi.number().min(0).required(),
                    reconnect_delay: Joi.number().positive().required()
                }).required(),
                fft: Joi.object({
                    buffer_size: Joi.number().positive().required(),
                    max_data_points: Joi.number().positive().required(),
                    update_interval: Joi.number().positive().required()
                }).required(),
                signal_processing: Joi.object({
                    noise_floor_threshold: Joi.number().required(),
                    peak_detection_threshold: Joi.number().required(),
                    bandwidth_estimation: Joi.string().required()
                }).required()
            }).required(),

            wigleToTak: Joi.object({
                port: Joi.number().port().required(),
                data: Joi.object({
                    wigle_directory: Joi.string().required(),
                    file_watch_interval: Joi.number().positive().required(),
                    max_file_size: Joi.number().positive().required()
                }).required(),
                tak: Joi.object({
                    default_server_ip: Joi.string().ip().required(),
                    default_server_port: Joi.number().port().required(),
                    multicast_group: Joi.string().ip().required(),
                    multicast_port: Joi.number().port().required()
                }).required()
            }).required(),

            gpsBridge: Joi.object({
                port: Joi.number().port().required(),
                mavlink: Joi.object({
                    connection: Joi.string().required(),
                    connection_timeout: Joi.number().positive().required(),
                    heartbeat_interval: Joi.number().positive().required()
                }).required()
            }).required()
        });

        const { error, value } = schema.validate(this.config);
        
        if (error) {
            throw new Error(`Configuration validation failed: ${error.details[0].message}`);
        }

        this.config = value;
    }

    get(path = '') {
        if (!path) {
            return this.config;
        }

        const keys = path.split('.');
        let result = this.config;

        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                return undefined;
            }
        }

        return result;
    }

    set(path, value) {
        const keys = path.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    // Get environment-specific configuration
    getServiceConfig(serviceName) {
        return this.get(serviceName) || {};
    }

    // Get shared configuration
    getSharedConfig() {
        return this.get('shared') || {};
    }

    // Debug method to dump configuration (without sensitive values)
    dumpConfig(hideSensitive = true) {
        const configCopy = JSON.parse(JSON.stringify(this.config));
        
        if (hideSensitive) {
            // Hide potentially sensitive configuration values
            const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];
            
            const maskSensitive = (obj) => {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        maskSensitive(value);
                    } else if (typeof value === 'string' && 
                               sensitiveKeys.some(sensitive => 
                                   key.toLowerCase().includes(sensitive))) {
                        obj[key] = '***HIDDEN***';
                    }
                }
            };
            
            maskSensitive(configCopy);
        }
        
        return configCopy;
    }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = configManager.config;
module.exports.ConfigManager = ConfigManager;
module.exports.get = (path) => configManager.get(path);
module.exports.set = (path, value) => configManager.set(path, value);
module.exports.getServiceConfig = (serviceName) => configManager.getServiceConfig(serviceName);
module.exports.getSharedConfig = () => configManager.getSharedConfig();
module.exports.dumpConfig = (hideSensitive) => configManager.dumpConfig(hideSensitive);