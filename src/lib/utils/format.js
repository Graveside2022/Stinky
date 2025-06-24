/**
 * Format frequency value to human-readable string
 * @param {number} freq - Frequency in Hz
 * @returns {string} Formatted frequency string
 */
export function formatFrequency(freq) {
  if (freq >= 1e9) {
    return (freq / 1e9).toFixed(3) + ' GHz'
  } else if (freq >= 1e6) {
    return (freq / 1e6).toFixed(3) + ' MHz'
  } else if (freq >= 1e3) {
    return (freq / 1e3).toFixed(3) + ' kHz'
  }
  return freq + ' Hz'
}

/**
 * Format byte size to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i]
}

/**
 * Format duration to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Format GPS coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} precision - Decimal places
 * @returns {string} Formatted coordinates
 */
export function formatCoordinates(lat, lon, precision = 6) {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(precision)}°${latDir}, ${Math.abs(lon).toFixed(precision)}°${lonDir}`
}

/**
 * Format signal strength (dBm)
 * @param {number} dbm - Signal strength in dBm
 * @returns {string} Formatted signal strength
 */
export function formatSignalStrength(dbm) {
  if (dbm >= -30) return `${dbm} dBm (Excellent)`
  if (dbm >= -50) return `${dbm} dBm (Good)`
  if (dbm >= -70) return `${dbm} dBm (Fair)`
  if (dbm >= -85) return `${dbm} dBm (Poor)`
  return `${dbm} dBm (Very Poor)`
}