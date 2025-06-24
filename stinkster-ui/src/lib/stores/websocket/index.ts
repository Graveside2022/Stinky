// Export all WebSocket stores with specific naming to avoid conflicts
export {
  connectionState as hackrfConnectionState,
  connectionError as hackrfConnectionError,
  isConnected as hackrfIsConnected,
  isConnecting as hackrfIsConnecting,
  spectrumData,
  signalData,
  connectHackRF,
  disconnectHackRF
} from './hackrf'

export {
  connectionState as wigleConnectionState,
  connectionError as wigleConnectionError,
  isConnected as wigleIsConnected,
  isConnecting as wigleIsConnecting,
  devices,
  deviceList,
  deviceCount,
  takStatus,
  scanStatus,
  connectWigle,
  disconnectWigle
} from './wigle'

export {
  connectionState as kismetConnectionState,
  connectionError as kismetConnectionError,
  isConnected as kismetIsConnected,
  isConnecting as kismetIsConnecting,
  kismetDevices,
  kismetAlerts,
  kismetSession,
  connectKismet,
  disconnectKismet
} from './kismet'