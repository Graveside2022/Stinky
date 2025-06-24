/**
 * Shared Utilities Export Module
 * 
 * Centralizes all shared utilities for easy importing across services
 */

module.exports = {
    logger: require('./logger'),
    validator: require('./validator'),
    utils: require('./utils'),
    constants: require('./constants'),
    errors: require('./errors'),
    
    // New utilities from migration spec
    createLogger: require('./utils/logger').createLogger,
    ConfigManager: require('./utils/config').ConfigManager,
    errorHandler: require('./middleware/errorHandler')
};