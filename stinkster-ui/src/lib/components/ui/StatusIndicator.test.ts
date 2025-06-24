import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import StatusIndicator from './StatusIndicator.svelte';

describe('StatusIndicator Component', () => {
  it('renders with required props', () => {
    const { container } = render(StatusIndicator, {
      props: {
        status: 'online'
      }
    });
    
    const indicator = container.querySelector('div');
    expect(indicator).toBeInTheDocument();
    
    const dot = container.querySelector('span');
    expect(dot).toHaveClass('bg-success', 'w-3', 'h-3');
  });

  it('applies correct colors for each status', () => {
    const statuses = ['online', 'offline', 'warning', 'error', 'idle'] as const;
    const expectedColors = {
      online: 'bg-success',
      offline: 'bg-surface-400',
      warning: 'bg-warning',
      error: 'bg-error',
      idle: 'bg-info'
    };
    
    statuses.forEach((status) => {
      const { container } = render(StatusIndicator, {
        props: { status }
      });
      
      const dot = container.querySelector('span');
      expect(dot).toHaveClass(expectedColors[status]);
    });
  });

  it('applies size classes correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const expectedClasses = {
      sm: ['w-2', 'h-2'],
      md: ['w-3', 'h-3'],
      lg: ['w-4', 'h-4']
    };
    
    sizes.forEach((size) => {
      const { container } = render(StatusIndicator, {
        props: {
          status: 'online',
          size
        }
      });
      
      const dot = container.querySelector('span');
      expectedClasses[size].forEach(cls => {
        expect(dot).toHaveClass(cls);
      });
    });
  });

  it('shows label when showLabel is true', () => {
    const { container } = render(StatusIndicator, {
      props: {
        status: 'online',
        showLabel: true
      }
    });
    
    expect(container).toHaveTextContent('Online');
  });

  it('uses custom label when provided', () => {
    const { container } = render(StatusIndicator, {
      props: {
        status: 'online',
        showLabel: true,
        label: 'Connected'
      }
    });
    
    expect(container).toHaveTextContent('Connected');
    expect(container).not.toHaveTextContent('Online');
  });

  it('applies pulse animation for online and warning statuses', () => {
    const { container: onlineContainer } = render(StatusIndicator, {
      props: {
        status: 'online',
        pulse: true
      }
    });
    
    const onlineDot = onlineContainer.querySelector('span');
    expect(onlineDot).toHaveClass('animate-pulse-subtle');
    
    const { container: offlineContainer } = render(StatusIndicator, {
      props: {
        status: 'offline',
        pulse: true
      }
    });
    
    const offlineDot = offlineContainer.querySelector('span');
    expect(offlineDot).not.toHaveClass('animate-pulse-subtle');
  });

  it('disables pulse animation when pulse is false', () => {
    const { container } = render(StatusIndicator, {
      props: {
        status: 'online',
        pulse: false
      }
    });
    
    const dot = container.querySelector('span');
    expect(dot).not.toHaveClass('animate-pulse-subtle');
  });
});