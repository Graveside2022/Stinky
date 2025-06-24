import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import App from '../../apps/wigle/App.svelte'

// Mock the WebSocket store
vi.mock('$lib/stores/websocket/wigle', async () => {
  const { writable } = await vi.importActual<typeof import('svelte/store')>('svelte/store')
  
  return {
    connectWigle: vi.fn(),
    disconnectWigle: vi.fn(),
    isConnected: writable(false),
    deviceCount: writable(0),
    connectionError: writable(null),
    deviceList: writable([])
  }
})

// Mock the API client
vi.mock('$lib/services/api/WigleApiClient', () => ({
  WigleApiClient: vi.fn().mockImplementation(() => ({
    getDevices: vi.fn().mockResolvedValue({ data: { data: [] } }),
    getTAKConfig: vi.fn().mockResolvedValue({ 
      data: {
        takServer: '192.168.1.100',
        takPort: 6969,
        callsign: 'STINKY-1',
        team: 'Yellow',
        role: 'Team Member',
        antennaHeight: 1.5,
        scanInterval: 30
      }
    }),
    getScanSettings: vi.fn().mockResolvedValue({
      data: {
        scanInterval: 30,
        signalThreshold: -90,
        maxAge: 3600,
        channels: [],
        ignoreBSSIDs: []
      }
    })
  }))
}))

describe('WigleToTAK App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the app with navigation tabs', async () => {
    render(App)
    
    // Check header
    expect(screen.getByText('WigleToTAK')).toBeInTheDocument()
    
    // Check navigation tabs
    expect(screen.getByRole('button', { name: 'Devices' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Map' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'TAK Config' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import/Export' })).toBeInTheDocument()
  })

  it('switches between panels when tabs are clicked', async () => {
    render(App)
    
    // Default should show devices panel
    expect(screen.getByText('WiFi Devices')).toBeInTheDocument()
    
    // Click on Map tab
    await fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    expect(screen.getByText('Device Map')).toBeInTheDocument()
    
    // Click on TAK Config tab
    await fireEvent.click(screen.getByRole('button', { name: 'TAK Config' }))
    expect(screen.getByText('TAK Server Configuration')).toBeInTheDocument()
  })

  it('shows connection status', async () => {
    const { rerender } = render(App)
    
    // Import mocked stores
    const { isConnected, deviceCount } = await import('$lib/stores/websocket/wigle')
    
    // Initially disconnected
    expect(screen.getByText('🔴 Disconnected')).toBeInTheDocument()
    expect(screen.getByText('📡 0 devices')).toBeInTheDocument()
    
    // Update to connected state
    isConnected.set(true)
    deviceCount.set(5)
    
    await waitFor(() => {
      expect(screen.getByText('🟢 Connected')).toBeInTheDocument()
      expect(screen.getByText('📡 5 devices')).toBeInTheDocument()
    })
  })

  it('connects to WebSocket on mount', async () => {
    const { connectWigle } = await import('$lib/stores/websocket/wigle')
    
    render(App)
    
    expect(connectWigle).toHaveBeenCalled()
  })

  it('disconnects from WebSocket on unmount', async () => {
    const { disconnectWigle } = await import('$lib/stores/websocket/wigle')
    
    const { unmount } = render(App)
    
    unmount()
    
    expect(disconnectWigle).toHaveBeenCalled()
  })
})