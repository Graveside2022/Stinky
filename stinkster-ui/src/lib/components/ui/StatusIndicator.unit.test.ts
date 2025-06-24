import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import StatusIndicator from './StatusIndicator.svelte';
import { createMockStore } from '$test/utils';

describe('StatusIndicator Unit Tests', () => {
  describe('basic rendering', () => {
    it('renders with status prop', () => {
      render(StatusIndicator, {
        props: {
          status: 'connected',
          label: 'Connection Status',
        },
      });

      expect(screen.getByText('Connection Status')).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator')).toHaveClass('status-connected');
    });

    it('renders all status variants', () => {
      const statuses = ['connected', 'disconnected', 'error', 'warning', 'idle'] as const;
      
      statuses.forEach(status => {
        const { container, unmount } = render(StatusIndicator, {
          props: { status, label: `${status} status` },
        });

        const indicator = container.querySelector('[data-testid="status-indicator"]');
        expect(indicator).toHaveClass(`status-${status}`);
        
        unmount();
      });
    });
  });

  describe('reactive updates', () => {
    it('updates when status changes', async () => {
      const status = writable<string>('disconnected');
      
      const { container } = render(StatusIndicator, {
        props: {
          status: status as any,
          label: 'Dynamic Status',
        },
      });

      let indicator = container.querySelector('[data-testid="status-indicator"]');
      expect(indicator).toHaveClass('status-disconnected');

      // Update status
      status.set('connected');
      
      await waitFor(() => {
        indicator = container.querySelector('[data-testid="status-indicator"]');
        expect(indicator).toHaveClass('status-connected');
      });
    });
  });

  describe('animations', () => {
    it('shows pulse animation for active states', () => {
      const { container } = render(StatusIndicator, {
        props: {
          status: 'connected',
          animated: true,
        },
      });

      const indicator = container.querySelector('[data-testid="status-indicator"]');
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('does not animate when animated prop is false', () => {
      const { container } = render(StatusIndicator, {
        props: {
          status: 'connected',
          animated: false,
        },
      });

      const indicator = container.querySelector('[data-testid="status-indicator"]');
      expect(indicator).not.toHaveClass('animate-pulse');
    });
  });

  describe('tooltip behavior', () => {
    it('shows tooltip on hover when message provided', async () => {
      const { container } = render(StatusIndicator, {
        props: {
          status: 'error',
          label: 'Error Status',
          message: 'Connection failed: timeout',
        },
      });

      const indicator = container.querySelector('[data-testid="status-indicator"]');
      expect(indicator).toHaveAttribute('title', 'Connection failed: timeout');
    });
  });

  describe('custom icons', () => {
    it('allows custom icon override', () => {
      const { container } = render(StatusIndicator, {
        props: {
          status: 'connected',
          customIcon: '✓',
        },
      });

      expect(container.textContent).toContain('✓');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(StatusIndicator, {
        props: {
          status: 'error',
          label: 'System Status',
          message: 'Database connection error',
        },
      });

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveAttribute('role', 'status');
      expect(indicator).toHaveAttribute('aria-label', 'System Status: error');
      expect(indicator).toHaveAttribute('aria-describedby');
    });

    it('announces status changes', async () => {
      const status = writable('connected');
      
      render(StatusIndicator, {
        props: {
          status: status as any,
          label: 'Live Status',
          announceChanges: true,
        },
      });

      // Check for live region
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Change status
      status.set('error');

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Live Status: error');
      });
    });
  });

  describe('size variants', () => {
    it('renders different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;
      
      sizes.forEach(size => {
        const { container, unmount } = render(StatusIndicator, {
          props: { 
            status: 'connected',
            size,
          },
        });

        const indicator = container.querySelector('[data-testid="status-indicator"]');
        expect(indicator).toHaveClass(`size-${size}`);
        
        unmount();
      });
    });
  });

  describe('store integration', () => {
    it('works with mock stores', () => {
      const mockStatusStore = createMockStore('disconnected');
      
      render(StatusIndicator, {
        props: {
          status: mockStatusStore as any,
          label: 'Mock Store Status',
        },
      });

      expect(mockStatusStore.subscribe).toHaveBeenCalled();
      
      // Update store
      mockStatusStore.set('connected');
      expect(mockStatusStore.set).toHaveBeenCalledWith('connected');
    });
  });
});