/**
 * GPS/Location Type Definitions
 * Types for GPS data, MAVLink integration, and location tracking
 */

// Basic GPS Position
export interface GPSPosition {
  latitude: number;
  longitude: number;
  altitude?: number;      // meters above sea level
  timestamp: number;
  accuracy?: number;      // meters
  speed?: number;         // m/s
  heading?: number;       // degrees (0-360)
  satellites?: number;
  fixType?: GPSFixType;
  hdop?: number;          // Horizontal Dilution of Precision
  vdop?: number;          // Vertical Dilution of Precision
  pdop?: number;          // Position Dilution of Precision
}

// GPS Fix Types
export type GPSFixType = 
  | 'NO_FIX'
  | '2D'
  | '3D'
  | 'DGPS'
  | 'RTK_FLOAT'
  | 'RTK_FIXED';

// GPSD Protocol Messages
export interface GPSDMessage {
  class: 'TPV' | 'SKY' | 'DEVICE' | 'WATCH' | 'VERSION' | 'DEVICES' | 'ERROR';
}

export interface GPSDTPV extends GPSDMessage {
  class: 'TPV';
  tag?: string;
  device?: string;
  mode: 0 | 1 | 2 | 3;  // 0=no fix, 1=no fix, 2=2D, 3=3D
  time?: string;        // ISO 8601 timestamp
  ept?: number;         // Time error estimate
  lat?: number;
  lon?: number;
  alt?: number;
  epx?: number;         // Longitude error estimate (meters)
  epy?: number;         // Latitude error estimate (meters)
  epv?: number;         // Altitude error estimate (meters)
  track?: number;       // Course over ground (degrees)
  speed?: number;       // Speed over ground (m/s)
  climb?: number;       // Vertical speed (m/s)
  epd?: number;         // Track error estimate
  eps?: number;         // Speed error estimate
  epc?: number;         // Climb error estimate
}

export interface GPSDSKY extends GPSDMessage {
  class: 'SKY';
  tag?: string;
  device?: string;
  time?: string;
  xdop?: number;
  ydop?: number;
  vdop?: number;
  tdop?: number;
  hdop?: number;
  pdop?: number;
  gdop?: number;
  satellites?: GPSSatellite[];
}

export interface GPSSatellite {
  PRN: number;          // Satellite ID
  el: number;           // Elevation (degrees)
  az: number;           // Azimuth (degrees)
  ss: number;           // Signal strength (dB Hz)
  used: boolean;        // Used in fix
}

export interface GPSDDevice extends GPSDMessage {
  class: 'DEVICE';
  path: string;
  driver: string;
  activated?: string;
  flags?: number;
  native?: number;
  bps?: number;
  parity?: string;
  stopbits?: number;
  cycle?: number;
}

// MAVLink GPS Messages
export interface MAVLinkGPSRaw {
  time_usec: number;
  fix_type: number;
  lat: number;          // Latitude * 1e7
  lon: number;          // Longitude * 1e7
  alt: number;          // Altitude * 1000 (mm)
  eph?: number;         // GPS HDOP * 100
  epv?: number;         // GPS VDOP * 100
  vel?: number;         // GPS ground speed (m/s * 100)
  cog?: number;         // Course over ground (cd) * 100
  satellites_visible: number;
}

export interface MAVLinkGlobalPosition {
  time_boot_ms: number;
  lat: number;          // Latitude * 1e7
  lon: number;          // Longitude * 1e7
  alt: number;          // Altitude above MSL (mm)
  relative_alt: number; // Altitude above ground (mm)
  vx: number;           // X velocity (cm/s)
  vy: number;           // Y velocity (cm/s)
  vz: number;           // Z velocity (cm/s)
  hdg: number;          // Compass heading (cd)
}

// GPS Track/Trail
export interface GPSTrack {
  id: string;
  name?: string;
  startTime: number;
  endTime?: number;
  points: GPSPosition[];
  totalDistance?: number;  // meters
  maxSpeed?: number;       // m/s
  avgSpeed?: number;       // m/s
  maxAltitude?: number;    // meters
  minAltitude?: number;    // meters
}

// Geofence
export interface Geofence {
  id: string;
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  active: boolean;
  action: 'alert' | 'log' | 'both';
  // Circle specific
  center?: GPSPosition;
  radius?: number;        // meters
  // Polygon specific
  vertices?: GPSPosition[];
  // Rectangle specific
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// GPS Device Configuration
export interface GPSConfig {
  source: 'gpsd' | 'mavlink' | 'serial' | 'network';
  // GPSD config
  gpsdHost?: string;
  gpsdPort?: number;
  // MAVLink config
  mavlinkConnection?: string;  // e.g., "tcp:localhost:14550"
  mavlinkBaud?: number;
  // Serial config
  serialPort?: string;
  serialBaud?: number;
  // Update rates
  updateRate?: number;    // Hz
  // Filters
  minSatellites?: number;
  maxHDOP?: number;
}

// Location Services
export interface LocationUpdate {
  source: 'gps' | 'wifi' | 'manual' | 'calculated';
  position: GPSPosition;
  confidence?: number;    // 0-1
  provider?: string;
}

// Coordinate Systems
export interface CoordinateConversion {
  wgs84: {
    lat: number;
    lon: number;
  };
  utm?: {
    zone: number;
    hemisphere: 'N' | 'S';
    easting: number;
    northing: number;
  };
  mgrs?: string;
  maidenhead?: string;
}

// GPS Bridge Status
export interface GPSBridgeStatus {
  connected: boolean;
  source: string;
  lastUpdate: number;
  packetsReceived: number;
  packetsForwarded: number;
  errors: number;
  currentPosition?: GPSPosition;
}