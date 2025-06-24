import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import HackRFApp from '$hackrf/App.svelte';
import { mockFetch, createMockWebSocketClient, fixtures, flushPromises } from '../utils';
import { hackrfStatus, spectrumData } from '$lib/stores/websocket/hackrf';

// Mock the WebSocket module
vi.mock('socket.io-client', () => {
  const mockClient = createMockWebSocketClient();
  return {
    io: vi.fn(() => mockClient),
  };
});

describe('HackRF App Integration', () => {
  let mockSocket: ReturnType<typeof createMockWebSocketClient>;

  beforeEach(async () => {
    // Setup API mocks
    mockFetch([
      {
        url: '/api/hackrf/status',
        response: fixtures.hackrf.status,
      },
      {
        url: '/api/hackrf/config',
        response: {
          frequency: 433000000,
          sampleRate: 2000000,
          gain: 30,
        },
      },
    ]);

    // Get mock socket instance
    const { io } = await import('socket.io-client');
    mockSocket = (io as any)();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render and connect to WebSocket', async () => {
    render(HackRFApp);

    // Check initial UI
    expect(screen.getByText(/HackRF Spectrum Analyzer/i)).toBeInTheDocument();
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();

    // Simulate WebSocket connection
    mockSocket.simulateMessage({
      type: 'status',
      payload: fixtures.hackrf.status,
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.queryByText(/Connecting/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Connected/i)).toBeInTheDocument();
    });
  });

  it('should display spectrum data', async () => {
    render(HackRFApp);

    // Simulate spectrum data
    mockSocket.simulateMessage({
      type: 'spectrum',
      payload: fixtures.hackrf.spectrum,
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(get(spectrumData)).toEqual(fixtures.hackrf.spectrum);
    });

    // Check if spectrum chart is rendered
    expect(screen.getByTestId('spectrum-chart')).toBeInTheDocument();
  });

  it('should handle frequency changes', async () => {
    render(HackRFApp);

    // Connect first
    mockSocket.isConnected = true;
    mockSocket.simulateMessage({
      type: 'status',
      payload: fixtures.hackrf.status,
      timestamp: Date.now(),
    });

    await flushPromises();

    // Find and change frequency input
    const frequencyInput = screen.getByLabelText(/Frequency/i) as HTMLInputElement;
    await fireEvent.change(frequencyInput, { target: { value: '915000000' } });
    await fireEvent.blur(frequencyInput);

    // Verify config update was sent
    expect(mockSocket.emit).toHaveBeenCalledWith('config_update', {
      frequency: 915000000,
    });
  });

  it('should handle connection errors', async () => {
    render(HackRFApp);

    // Simulate connection error
    mockSocket.simulateError(new Error('Connection failed'));

    await waitFor(() => {
      expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
    });
  });

  it('should display signal strength indicators', async () => {
    render(HackRFApp);

    // Send spectrum data with peaks
    const spectrumWithPeaks = {
      ...fixtures.hackrf.spectrum,
      magnitude: Array(1024).fill(-80).map((v, i) => {
        // Add some peaks
        if (i === 100 || i === 500 || i === 900) return -30;
        return v;
      }),
    };

    mockSocket.simulateMessage({
      type: 'spectrum',
      payload: spectrumWithPeaks,
      timestamp: Date.now(),
    });

    await waitFor(() => {
      // Should show peak detection or signal strength
      expect(screen.getByText(/Peak Signal/i)).toBeInTheDocument();
    });
  });

  it('should toggle between different view modes', async () => {
    render(HackRFApp);

    // Check for view toggle buttons
    const waterfallButton = screen.getByRole('button', { name: /Waterfall/i });
    const spectrumButton = screen.getByRole('button', { name: /Spectrum/i });

    // Default should be spectrum view
    expect(spectrumButton).toHaveClass('active');

    // Switch to waterfall
    await fireEvent.click(waterfallButton);
    expect(waterfallButton).toHaveClass('active');
    expect(screen.getByTestId('waterfall-display')).toBeInTheDocument();
  });

  it('should handle gain adjustments', async () => {
    render(HackRFApp);

    // Connect first
    mockSocket.isConnected = true;
    mockSocket.simulateMessage({
      type: 'status',
      payload: fixtures.hackrf.status,
      timestamp: Date.now(),
    });

    // Find gain slider
    const gainSlider = screen.getByLabelText(/Gain/i) as HTMLInputElement;
    await fireEvent.change(gainSlider, { target: { value: '40' } });

    expect(mockSocket.emit).toHaveBeenCalledWith('config_update', {
      gain: 40,
    });
  });

  it('should display recording controls and handle recording', async () => {
    render(HackRFApp);

    const recordButton = screen.getByRole('button', { name: /Record/i });
    expect(recordButton).toBeInTheDocument();

    // Start recording
    await fireEvent.click(recordButton);
    expect(recordButton).toHaveTextContent(/Stop/i);

    // Mock recording response
    mockFetch([
      {
        url: '/api/hackrf/recording/start',
        response: { recordingId: 'rec-123', status: 'recording' },
      },
    ]);

    // Stop recording
    await fireEvent.click(recordButton);
    expect(recordButton).toHaveTextContent(/Record/i);
  });
});