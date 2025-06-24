/**
 * TAK (Team Awareness Kit) Type Definitions
 * Types for Cursor on Target (CoT) messages and TAK integration
 */

// CoT Event Types
export type CoTType = 
  | 'a'    // Atoms (units)
  | 'b'    // Bits (infrastructure)
  | 'c'    // Capability
  | 'u'    // Unknown
  | 't'    // Tasks
  | 'r'    // Requests/Reports
  | 's'    // Special
  | 'i'    // Intel
  | 'o'    // Operations
  | 'p'    // Points
  | 'x'    // Sensor;

// Full CoT type hierarchy (e.g., "a-f-G-U-C" for friendly ground unit)
export interface CoTHierarchy {
  affiliation: 'f' | 'h' | 'n' | 'u' | 'a' | 'j' | 'k' | 's' | 'o';  
  // f=friend, h=hostile, n=neutral, u=unknown, a=assumed friend, etc.
  battleDimension?: 'A' | 'G' | 'S' | 'U';  
  // A=Air, G=Ground, S=Sea Surface, U=Subsurface
  function?: string;
}

// Main CoT Event
export interface CoTEvent {
  version: '2.0';
  uid: string;
  type: string;           // Full CoT type (e.g., "a-f-G-U-C")
  time: string;           // ISO 8601 timestamp
  start: string;          // ISO 8601 timestamp
  stale: string;          // ISO 8601 timestamp
  how: CoTHow;
  access?: string;
  point: CoTPoint;
  detail?: CoTDetail;
}

// How the CoT was generated
export type CoTHow = 
  | 'h-e'    // Human entry
  | 'm-g'    // Machine generated
  | 'h-g-i-g-o'  // Human geo-referenced
  | 'm-r'    // Machine reported
  | 'm-s'    // Machine simulated;

// CoT Point (location)
export interface CoTPoint {
  lat: number;            // Latitude (decimal degrees)
  lon: number;            // Longitude (decimal degrees)
  hae: number;            // Height above ellipsoid (meters)
  ce: number;             // Circular error (meters)
  le: number;             // Linear error (meters)
}

// CoT Detail (extended information)
export interface CoTDetail {
  // Shape information
  shape?: CoTShape;
  
  // Contact information
  contact?: {
    callsign: string;
    phone?: string;
    email?: string;
    xmppUsername?: string;
  };
  
  // Remarks/notes
  remarks?: string;
  
  // Status
  status?: {
    battery?: number;
    readiness?: boolean;
  };
  
  // Track information
  track?: {
    speed: number;        // m/s
    course: number;       // degrees
  };
  
  // Precision location
  precisionlocation?: {
    altsrc?: string;
    geopointsrc?: string;
  };
  
  // Group/team membership
  __group?: {
    name: string;
    role?: string;
  };
  
  // Color/styling
  color?: {
    argb?: string;        // ARGB hex color
  };
  strokeColor?: {
    value: string;
  };
  fillColor?: {
    value: string;
  };
  strokeWeight?: {
    value: string;
  };
  
  // Links to other entities
  link?: CoTLink[];
  
  // Archive flag
  archive?: boolean;
  
  // Labels
  labels_on?: {
    value: boolean;
  };
  
  // Additional custom fields
  [key: string]: any;
}

// CoT Shape types
export interface CoTShape {
  ellipse?: {
    major: number;        // Major axis (meters)
    minor: number;        // Minor axis (meters)
    angle: number;        // Rotation angle (degrees)
  };
  polyline?: {
    points: string;       // Space-separated lat,lon pairs
    closed?: boolean;
  };
  dxf?: {
    data: string;         // DXF format shape data
  };
}

// CoT Link
export interface CoTLink {
  uid: string;
  type: string;
  relation: string;
  parent_callsign?: string;
  production_time?: string;
}

// TAK Server Configuration
export interface TAKServerConfig {
  address: string;
  port: number;
  protocol: 'TCP' | 'UDP' | 'multicast';
  multicastGroup?: string;
  ssl?: {
    enabled: boolean;
    cert?: string;
    key?: string;
    ca?: string;
  };
}

// TAK Message wrapper
export interface TAKMessage {
  event: CoTEvent;
  rawXML?: string;
  timestamp: number;
  source?: string;
  destination?: string | string[];
}

// WiFi Device to TAK conversion
export interface WiFiToTAKConfig {
  // Type mappings
  typeMapping: {
    AP: string;           // CoT type for access points
    Client: string;       // CoT type for clients
    Unknown: string;      // CoT type for unknown devices
  };
  
  // Visualization
  visualization: {
    useEllipse: boolean;
    ellipseBasedOnRSSI: boolean;
    minEllipseSize: number;  // meters
    maxEllipseSize: number;  // meters
  };
  
  // Colors
  colors: {
    default: string;      // ARGB hex
    strong: string;       // For strong signals
    medium: string;       // For medium signals
    weak: string;         // For weak signals
  };
  
  // Filtering
  includeClients: boolean;
  includeHidden: boolean;
  minRSSI?: number;
  
  // Antenna compensation
  antennaType: string;
  sensitivityFactor: number;
}

// TAK Broadcast Status
export interface TAKBroadcastStatus {
  broadcasting: boolean;
  startTime?: number;
  messagesSent: number;
  bytesTransmitted: number;
  lastError?: string;
  destinations: Array<{
    address: string;
    port: number;
    type: 'unicast' | 'multicast';
    active: boolean;
  }>;
}

// KML Style for TAK (used in shape links)
export interface KMLStyle {
  LineStyle?: {
    color: string;        // AABBGGRR format
    width: number;
  };
  PolyStyle?: {
    color: string;        // AABBGGRR format
    fill?: boolean;
    outline?: boolean;
  };
  IconStyle?: {
    Icon: {
      href: string;
    };
    scale?: number;
    color?: string;
  };
}

// TAK Analysis Modes
export type TAKAnalysisMode = 'realtime' | 'postcollection';

// TAK Filter Lists
export interface TAKFilterLists {
  whitelist: {
    ssids: string[];
    macs: string[];
  };
  blacklist: {
    ssids: Record<string, string>;  // SSID -> ARGB color
    macs: Record<string, string>;   // MAC -> ARGB color
  };
}