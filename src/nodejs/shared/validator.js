/**
 * Validation Utilities for Stinkster Node.js
 * 
 * Provides validation functions for various data types and formats
 */

const Joi = require('joi');

// Error classes
class ValidationError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ValidationError';
        this.code = 'VALIDATION_ERROR';
        this.statusCode = 400;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp
        };
    }

    toUserResponse() {
        return {
            error: {
                code: this.code,
                message: this.message,
                timestamp: this.timestamp
            }
        };
    }
}

class Validator {
    /**
     * Validate data against Joi schema
     * @param {any} data - Data to validate
     * @param {object} schema - Joi schema
     * @param {object} options - Validation options
     * @returns {any} Validated data
     * @throws {ValidationError} If validation fails
     */
    static validate(data, schema, options = {}) {
        if (!schema || typeof schema.validate !== 'function') {
            throw new Error('Invalid schema provided - must be a Joi schema');
        }
        
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true,
            ...options
        });
        
        if (error) {
            throw new ValidationError(error.details.map(d => d.message).join(', '));
        }
        
        return value;
    }

    /**
     * Validate coordinates
     * @param {number} latitude - Latitude value
     * @param {number} longitude - Longitude value
     * @throws {ValidationError} If coordinates are invalid
     */
    static validateCoordinates(latitude, longitude) {
        const schema = Joi.object({
            latitude: Joi.number().min(-90).max(90).required(),
            longitude: Joi.number().min(-180).max(180).required()
        });
        
        return this.validate({ latitude, longitude }, schema);
    }

    /**
     * Validate TAK settings
     */
    static validateTAKSettings(data) {
        const schema = Joi.object({
            tak_server_ip: Joi.string().ip().required(),
            tak_server_port: Joi.alternatives().try(
                Joi.number().integer().min(1).max(65535),
                Joi.string().pattern(/^\d+$/)
            ).required()
        });
        
        return this.validate(data, schema);
    }

    /**
     * Validate multicast settings
     */
    static validateMulticastSettings(data) {
        const schema = Joi.object({
            takMulticast: Joi.boolean().required()
        });
        
        return this.validate(data, schema);
    }

    /**
     * Check if valid IP address
     */
    static isValidIP(ip) {
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip);
    }

    /**
     * Check if valid port
     */
    static isValidPort(port) {
        const num = parseInt(port, 10);
        return !isNaN(num) && num >= 1 && num <= 65535;
    }

    /**
     * Parse host:port string
     */
    static parseHostPort(hostPort) {
        const parts = hostPort.split(':');
        if (parts.length === 2) {
            return {
                host: parts[0],
                port: parseInt(parts[1], 10)
            };
        } else {
            return {
                host: hostPort,
                port: 80
            };
        }
    }

    /**
     * Check if valid MAC address
     */
    static isValidMAC(mac) {
        return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
    }

    /**
     * Check if valid SSID
     */
    static isValidSSID(ssid) {
        return typeof ssid === 'string' && ssid.length >= 0 && ssid.length <= 32;
    }

    /**
     * Check if valid RSSI
     */
    static isValidRSSI(rssi) {
        const num = parseInt(rssi, 10);
        return !isNaN(num) && num >= -120 && num <= 0;
    }

    /**
     * Check if valid coordinate
     */
    static isValidCoordinate(coord, type = 'longitude') {
        const num = parseFloat(coord);
        if (isNaN(num)) return false;
        
        if (type === 'latitude') {
            return num >= -90 && num <= 90;
        } else {
            return num >= -180 && num <= 180;
        }
    }

    /**
     * Sanitize filename
     */
    static sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9\-_.]/g, '_');
    }

    /**
     * Sanitize MAC address
     */
    static sanitizeMAC(mac) {
        if (!mac || typeof mac !== 'string') {
            return 'UNKNOWN';
        }
        
        // Check if it's already a valid MAC format
        if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
            return mac; // Return as-is if already valid
        }
        
        // Remove all non-hex characters and convert to uppercase
        const cleaned = mac.replace(/[^0-9A-Fa-f]/g, '');
        
        // If we have exactly 12 hex characters, format as MAC with colons
        if (cleaned.length === 12) {
            return cleaned.match(/.{2}/g).join(':').toUpperCase();
        }
        
        // For invalid inputs that don't form a valid MAC, return INVALIDMAC
        return 'INVALIDMAC';
    }
}

module.exports = Validator;