/**
 * Signal Visualization Demo
 * Generates simulated signal data for testing the visualization
 */

(function () {
  'use strict';

  let isRunning = false;
  let intervalId = null;
  const activeSignals = new Map();

  // Demo configuration
  const DEMO_CONFIG = {
    MAX_SIGNALS: 100,
    UPDATE_INTERVAL: 1000,
    SIGNAL_LIFETIME: 60000, // 1 minute
    CENTER_LAT: 37.7749, // San Francisco
    CENTER_LON: -122.4194,
    RADIUS: 0.1, // degrees
  };

  // Signal types for demo
  const SIGNAL_TYPES = ['wifi', 'cellular', 'bluetooth'];

  // Common WiFi network names
  const WIFI_NAMES = [
    'Starbucks WiFi',
    'xfinitywifi',
    'ATT-WIFI',
    'NETGEAR',
    'Linksys',
    'FBI Surveillance Van',
    'Pretty Fly for a WiFi',
    'LAN Solo',
    'Drop It Like Its Hotspot',
    'The Promised LAN',
  ];

  // Cellular providers
  const CELL_NAMES = ['Verizon LTE', 'AT&T 5G', 'T-Mobile', 'Sprint'];

  // Bluetooth device types
  const BT_NAMES = ['iPhone', 'AirPods', 'Samsung Galaxy', 'Smart Watch', 'Car Audio'];

  /**
   * Generate random position within radius of center
   */
  function generateRandomPosition() {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.sqrt(Math.random()) * DEMO_CONFIG.RADIUS;

    return {
      latitude: DEMO_CONFIG.CENTER_LAT + radius * Math.cos(angle),
      longitude: DEMO_CONFIG.CENTER_LON + radius * Math.sin(angle),
      altitude: Math.random() * 100, // 0-100 meters
    };
  }

  /**
   * Generate random signal strength based on type
   */
  function generateSignalStrength(type) {
    switch (type) {
      case 'wifi':
        return -30 - Math.random() * 60; // -30 to -90 dBm
      case 'cellular':
        return -50 - Math.random() * 40; // -50 to -90 dBm
      case 'bluetooth':
        return -40 - Math.random() * 50; // -40 to -90 dBm
      default:
        return -70 - Math.random() * 20; // -70 to -90 dBm
    }
  }

  /**
   * Generate signal name based on type
   */
  function generateSignalName(type) {
    switch (type) {
      case 'wifi':
        return WIFI_NAMES[Math.floor(Math.random() * WIFI_NAMES.length)];
      case 'cellular':
        return CELL_NAMES[Math.floor(Math.random() * CELL_NAMES.length)];
      case 'bluetooth':
        return BT_NAMES[Math.floor(Math.random() * BT_NAMES.length)];
      default:
        return `Unknown Signal ${Math.floor(Math.random() * 1000)}`;
    }
  }

  /**
   * Create a new signal
   */
  function createSignal() {
    const type = SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)];
    const position = generateRandomPosition();
    const id = `demo-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const signal = {
      id: id,
      type: type,
      name: generateSignalName(type),
      ...position,
      strength: generateSignalStrength(type),
      timestamp: Date.now(),
    };

    activeSignals.set(id, signal);
    return signal;
  }

  /**
   * Update existing signals
   */
  function updateSignals() {
    const now = Date.now();
    const toRemove = [];

    activeSignals.forEach((signal, id) => {
      // Remove old signals
      if (now - signal.timestamp > DEMO_CONFIG.SIGNAL_LIFETIME) {
        toRemove.push(id);
        return;
      }

      // Update signal strength (simulate movement/changes)
      signal.strength += (Math.random() - 0.5) * 5;
      signal.strength = Math.max(-100, Math.min(-20, signal.strength));

      // Slight position drift
      signal.latitude += (Math.random() - 0.5) * 0.0001;
      signal.longitude += (Math.random() - 0.5) * 0.0001;
    });

    // Remove old signals
    toRemove.forEach((id) => {
      activeSignals.delete(id);
      if (window.SignalVisualization) {
        window.SignalVisualization.removeSignal(id);
      }
    });
  }

  /**
   * Start the demo
   */
  function startDemo() {
    if (isRunning) return;

    if (!window.SignalVisualization) {
      console.error('SignalVisualization module not loaded');
      return;
    }

    isRunning = true;
    console.log('Starting signal visualization demo...');

    // Create initial batch of signals
    const initialSignals = [];
    for (let i = 0; i < 20; i++) {
      initialSignals.push(createSignal());
    }
    window.SignalVisualization.batchUpdateSignals(initialSignals);

    // Start update loop
    intervalId = setInterval(() => {
      // Update existing signals
      updateSignals();

      // Add new signals occasionally
      if (activeSignals.size < DEMO_CONFIG.MAX_SIGNALS && Math.random() < 0.3) {
        const newSignal = createSignal();
        window.SignalVisualization.addSignal(newSignal);
      }

      // Update existing signals
      const updates = Array.from(activeSignals.values());
      window.SignalVisualization.batchUpdateSignals(updates);

      // Log stats
      const stats = window.SignalVisualization.getPerformanceStats();
      console.log(
        `Active signals: ${activeSignals.size}, Visible: ${stats.visibleEntities}, FPS: ${stats.fps}`,
      );
    }, DEMO_CONFIG.UPDATE_INTERVAL);
  }

  /**
   * Stop the demo
   */
  function stopDemo() {
    if (!isRunning) return;

    isRunning = false;

    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    // Clear all signals
    if (window.SignalVisualization) {
      window.SignalVisualization.clearAllSignals();
    }

    activeSignals.clear();
    console.log('Signal visualization demo stopped');
  }

  /**
   * Set demo center location
   */
  function setCenterLocation(lat, lon) {
    DEMO_CONFIG.CENTER_LAT = lat;
    DEMO_CONFIG.CENTER_LON = lon;

    // If demo is running, restart with new location
    if (isRunning) {
      stopDemo();
      setTimeout(startDemo, 100);
    }
  }

  // Public API
  window.SignalDemo = {
    start: startDemo,
    stop: stopDemo,
    setCenterLocation: setCenterLocation,
    isRunning: () => isRunning,
    getSignalCount: () => activeSignals.size,
  };

  // Auto-start demo if requested via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('demo') === 'signals') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startDemo, 2000); // Wait for Cesium to initialize
    });
  }
})();
