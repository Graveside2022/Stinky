import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button Component', () => {
  it('renders with default props', () => {
    const { container } = render(Button, {
      props: {
        children: () => 'Click me'
      }
    });
    
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('applies variant classes correctly', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;
    
    variants.forEach((variant) => {
      const { container } = render(Button, {
        props: {
          variant,
          children: () => 'Button'
        }
      });
      
      const button = container.querySelector('button');
      
      if (variant === 'primary') {
        expect(button).toHaveClass('bg-primary-600');
      } else if (variant === 'secondary') {
        expect(button).toHaveClass('bg-secondary-600');
      } else if (variant === 'outline') {
        expect(button).toHaveClass('border-2');
      } else if (variant === 'ghost') {
        expect(button).toHaveClass('text-surface-700');
      } else if (variant === 'danger') {
        expect(button).toHaveClass('bg-error');
      }
    });
  });

  it('applies size classes correctly', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    
    sizes.forEach((size) => {
      const { container } = render(Button, {
        props: {
          size,
          children: () => 'Button'
        }
      });
      
      const button = container.querySelector('button');
      
      if (size === 'sm') {
        expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
      } else if (size === 'md') {
        expect(button).toHaveClass('px-4', 'py-2', 'text-base');
      } else if (size === 'lg') {
        expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
      }
    });
  });

  it('handles disabled state', () => {
    const { container } = render(Button, {
      props: {
        disabled: true,
        children: () => 'Disabled'
      }
    });
    
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    
    const { container } = render(Button, {
      props: {
        onclick: handleClick,
        children: () => 'Click me'
      }
    });
    
    const button = container.querySelector('button')!;
    await fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom classes', () => {
    const { container } = render(Button, {
      props: {
        class: 'custom-class',
        children: () => 'Custom'
      }
    });
    
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });
});