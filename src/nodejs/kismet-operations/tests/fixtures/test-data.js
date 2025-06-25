/**
 * Test data fixtures for comprehensive testing
 */

// Wigle CSV test data
const VALID_WIGLE_CSV = `MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
AA:BB:CC:DD:EE:FF,TestNetwork1,WPA2,2024-01-01 12:00:00,6,-70,40.7128,-74.0060,10.5,5,WIFI
11:22:33:44:55:66,TestNetwork2,Open,2024-01-01 12:01:00,11,-65,40.7130,-74.0062,10.5,5,WIFI
77:88:99:AA:BB:CC,HiddenNetwork,[WPS],2024-01-01 12:02:00,1,-80,40.7132,-74.0064,10.5,5,WIFI
DE:AD:BE:EF:CA:FE,SecureNet,WPA3,2024-01-01 12:03:00,36,-75,40.7134,-74.0066,10.5,5,WIFI
CA:FE:BA:BE:00:01,GuestNetwork,WPA2-Enterprise,2024-01-01 12:04:00,149,-68,40.7136,-74.0068,10.5,5,WIFI`;

const MALFORMED_WIGLE_CSV = `MAC,SSID,Wrong,Headers,Here
AA:BB:CC:DD:EE:FF,TestNetwork1,Missing,Required,Data
NotAMAC,InvalidData,More,Bad,Stuff`;

const EMPTY_WIGLE_CSV = `MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type`;

// GPS test data
const GPS_TEST_DATA = {
  FIX_3D: {
    class: 'TPV',
    device: '/dev/ttyUSB0',
    mode: 3,
    time: '2024-01-01T12:00:00.000Z',
    ept: 0.005,
    lat: 40.7128,
    lon: -74.0060,
    alt: 10.5,
    epx: 15.0,
    epy: 15.0,
    epv: 30.0,
    track: 45.0,
    speed: 5.2,
    climb: 0.1,
    eps: 0.01,
    epc: 0.02
  },
  
  FIX_2D: {
    class: 'TPV',
    device: '/dev/ttyUSB0',
    mode: 2,
    time: '2024-01-01T12:00:00.000Z',
    lat: 40.7128,
    lon: -74.0060,
    epx: 20.0,
    epy: 20.0,
    track: 0.0,
    speed: 0.0
  },
  
  NO_FIX: {
    class: 'TPV',
    device: '/dev/ttyUSB0',
    mode: 0,
    time: '2024-01-01T12:00:00.000Z'
  },
  
  SATELLITES: {
    class: 'SKY',
    device: '/dev/ttyUSB0',
    satellites: [
      { PRN: 1, el: 45, az: 180, ss: 40, used: true },
      { PRN: 2, el: 30, az: 90, ss: 35, used: true },
      { PRN: 3, el: 60, az: 270, ss: 38, used: true },
      { PRN: 4, el: 15, az: 45, ss: 25, used: false },
      { PRN: 5, el: 80, az: 0, ss: 42, used: true },
      { PRN: 6, el: 20, az: 135, ss: 20, used: false }
    ]
  }
};

// FFT data generators
function generateFFTData(options = {}) {
  const {
    size = 1024,
    centerFreq = 145000000,
    sampRate = 2400000,
    noiseFloor = -90,
    signals = []
  } = options;

  const data = new Float32Array(size);
  
  // Generate noise floor
  for (let i = 0; i < size; i++) {
    data[i] = noiseFloor + (Math.random() - 0.5) * 5;
  }
  
  // Add signals
  signals.forEach(signal => {
    addSignal(data, signal.bin || size / 2, signal.power || -60, signal.width || 10);
  });
  
  return {
    timestamp: Date.now(),
    data: Array.from(data),
    center_freq: centerFreq,
    samp_rate: sampRate,
    fft_size: size
  };
}

function addSignal(data, position, power, width) {
  for (let i = -width; i <= width; i++) {
    const index = Math.floor(position + i);
    if (index >= 0 && index < data.length) {
      const envelope = Math.exp(-0.5 * Math.pow(i / (width / 3), 2));
      const signalPower = power - 20 * Math.log10(1 / envelope);
      if (signalPower > data[index]) {
        data[index] = signalPower;
      }
    }
  }
}

// Binary FFT data for WebSocket testing
function generateBinaryFFTData(size = 1024) {
  const buffer = Buffer.allocUnsafe(size * 4);
  
  for (let i = 0; i < size; i++) {
    // Generate values between 0.00001 and 0.1 (logarithmic distribution)
    const value = 0.00001 * Math.pow(10000, Math.random());
    buffer.writeFloatLE(value, i * 4);
  }
  
  // Add some stronger signals
  buffer.writeFloatLE(0.1, 256 * 4);  // -20 dBFS
  buffer.writeFloatLE(0.05, 512 * 4); // -26 dBFS
  buffer.writeFloatLE(0.02, 768 * 4); // -34 dBFS
  
  return buffer;
}

// Large dataset generators
function generateLargeWigleCSV(deviceCount = 1000) {
  const header = 'MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type';
  const rows = [header];
  
  const authModes = ['Open', 'WPA2', 'WPA3', 'WEP', '[WPS]', 'WPA2-Enterprise'];
  const channels = [1, 6, 11, 36, 40, 44, 48, 149, 153, 157, 161];
  
  for (let i = 0; i < deviceCount; i++) {
    const mac = generateRandomMAC();
    const ssid = `Network_${i % 100}_${Math.random().toString(36).substr(2, 5)}`;
    const authMode = authModes[Math.floor(Math.random() * authModes.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const rssi = -50 - Math.floor(Math.random() * 40);
    const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const lon = -74.0060 + (Math.random() - 0.5) * 0.1;
    const alt = 10 + Math.random() * 50;
    const timestamp = new Date(Date.now() - Math.random() * 3600000).toISOString().replace('T', ' ').substr(0, 19);
    
    rows.push(`${mac},${ssid},${authMode},${timestamp},${channel},${rssi},${lat.toFixed(6)},${lon.toFixed(6)},${alt.toFixed(1)},5,WIFI`);
  }
  
  return rows.join('\n');
}

function generateRandomMAC() {
  return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => 
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  );
}

// TAK message templates
const TAK_MESSAGE_TEMPLATES = {
  WIFI_DEVICE: (device) => `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="${device.uid || device.mac.replace(/:/g, '')}" type="a-f-G-U-C" time="${new Date().toISOString()}" start="${new Date().toISOString()}" stale="${new Date(Date.now() + 300000).toISOString()}" how="m-g">
  <point lat="${device.lat}" lon="${device.lon}" hae="${device.alt || 0}" ce="10.0" le="0"/>
  <detail>
    <contact callsign="${device.ssid || 'Unknown'}"/>
    <remarks>MAC: ${device.mac}, RSSI: ${device.rssi}dB, Channel: ${device.channel}</remarks>
    <usericon iconsetpath="34ae1613-9645-4222-a9d2-e5f243dea2865/Military/Signals_Intelligence.png"/>
  </detail>
</event>`,

  GPS_POSITION: (position) => `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="GPS-${Date.now()}" type="a-f-G-U-C" time="${new Date().toISOString()}" start="${new Date().toISOString()}" stale="${new Date(Date.now() + 60000).toISOString()}" how="m-g">
  <point lat="${position.lat}" lon="${position.lon}" hae="${position.alt || 0}" ce="${position.epx || 10}" le="${position.epv || 0}"/>
  <detail>
    <contact callsign="Scanner Position"/>
    <remarks>GPS Fix: ${position.mode}D, Speed: ${position.speed || 0}m/s</remarks>
  </detail>
</event>`
};

// Performance test data
const PERFORMANCE_TEST_SCENARIOS = {
  LIGHT_LOAD: {
    deviceCount: 10,
    updateRate: 1000, // 1 Hz
    fftSize: 512,
    signalCount: 2
  },
  
  NORMAL_LOAD: {
    deviceCount: 100,
    updateRate: 100, // 10 Hz
    fftSize: 1024,
    signalCount: 5
  },
  
  HEAVY_LOAD: {
    deviceCount: 1000,
    updateRate: 50, // 20 Hz
    fftSize: 2048,
    signalCount: 10
  },
  
  STRESS_TEST: {
    deviceCount: 5000,
    updateRate: 20, // 50 Hz
    fftSize: 4096,
    signalCount: 20
  }
};

// Configuration test cases
const CONFIG_TEST_CASES = {
  VALID_CONFIGS: [
    {
      name: 'Basic 2m band',
      config: {
        center_freq: 145000000,
        samp_rate: 2400000,
        fft_size: 1024,
        signal_threshold: -70
      }
    },
    {
      name: '70cm band',
      config: {
        center_freq: 435000000,
        samp_rate: 2400000,
        fft_size: 2048,
        signal_threshold: -75
      }
    },
    {
      name: 'Wide bandwidth',
      config: {
        center_freq: 146000000,
        samp_rate: 10000000,
        fft_size: 4096,
        signal_threshold: -80
      }
    }
  ],
  
  INVALID_CONFIGS: [
    {
      name: 'Negative frequency',
      config: { center_freq: -145000000 },
      expectedError: 'Invalid center frequency'
    },
    {
      name: 'Invalid sample rate',
      config: { samp_rate: 0 },
      expectedError: 'Invalid sample rate'
    },
    {
      name: 'Non-power-of-2 FFT size',
      config: { fft_size: 1000 },
      expectedError: 'FFT size must be power of 2'
    },
    {
      name: 'String values',
      config: { center_freq: 'not-a-number' },
      expectedError: 'Invalid configuration format'
    }
  ]
};

// Error scenarios for testing
const ERROR_SCENARIOS = {
  NETWORK_ERRORS: [
    { type: 'ECONNREFUSED', message: 'Connection refused' },
    { type: 'ETIMEDOUT', message: 'Connection timeout' },
    { type: 'EHOSTUNREACH', message: 'Host unreachable' },
    { type: 'ENETUNREACH', message: 'Network unreachable' }
  ],
  
  FILE_ERRORS: [
    { type: 'ENOENT', message: 'File not found' },
    { type: 'EACCES', message: 'Permission denied' },
    { type: 'ENOSPC', message: 'No space left on device' },
    { type: 'EISDIR', message: 'Is a directory' }
  ],
  
  VALIDATION_ERRORS: [
    { type: 'INVALID_FORMAT', message: 'Invalid file format' },
    { type: 'MISSING_FIELDS', message: 'Required fields missing' },
    { type: 'INVALID_DATA', message: 'Invalid data values' },
    { type: 'SIZE_LIMIT', message: 'File size exceeds limit' }
  ]
};

module.exports = {
  // Wigle CSV data
  VALID_WIGLE_CSV,
  MALFORMED_WIGLE_CSV,
  EMPTY_WIGLE_CSV,
  generateLargeWigleCSV,
  generateRandomMAC,
  
  // GPS data
  GPS_TEST_DATA,
  
  // FFT data
  generateFFTData,
  generateBinaryFFTData,
  
  // TAK messages
  TAK_MESSAGE_TEMPLATES,
  
  // Test scenarios
  PERFORMANCE_TEST_SCENARIOS,
  CONFIG_TEST_CASES,
  ERROR_SCENARIOS
};