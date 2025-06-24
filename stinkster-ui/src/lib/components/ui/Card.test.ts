import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Card from './Card.svelte';

describe('Card Component', () => {
  it('renders with default props', () => {
    const { container } = render(Card, {
      props: {
        children: () => 'Card content'
      }
    });
    
    const card = container.querySelector('div');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Card content');
    expect(card).toHaveClass('bg-surface-100', 'p-6');
  });

  it('applies variant classes correctly', () => {
    const variants = ['default', 'elevated', 'bordered'] as const;
    
    variants.forEach((variant) => {
      const { container } = render(Card, {
        props: {
          variant,
          children: () => 'Card'
        }
      });
      
      const card = container.querySelector('div');
      
      if (variant === 'default') {
        expect(card).toHaveClass('bg-surface-100');
        expect(card).not.toHaveClass('shadow-lg');
        expect(card).not.toHaveClass('border');
      } else if (variant === 'elevated') {
        expect(card).toHaveClass('bg-surface-100', 'shadow-lg');
      } else if (variant === 'bordered') {
        expect(card).toHaveClass('bg-surface-50', 'border', 'border-surface-300');
      }
    });
  });

  it('applies padding classes correctly', () => {
    const paddings = ['none', 'sm', 'md', 'lg'] as const;
    
    paddings.forEach((padding) => {
      const { container } = render(Card, {
        props: {
          padding,
          children: () => 'Card'
        }
      });
      
      const card = container.querySelector('div');
      
      if (padding === 'none') {
        expect(card).not.toHaveClass('p-3', 'p-6', 'p-8');
      } else if (padding === 'sm') {
        expect(card).toHaveClass('p-3');
      } else if (padding === 'md') {
        expect(card).toHaveClass('p-6');
      } else if (padding === 'lg') {
        expect(card).toHaveClass('p-8');
      }
    });
  });

  it('applies custom classes', () => {
    const { container } = render(Card, {
      props: {
        class: 'custom-card-class',
        children: () => 'Custom'
      }
    });
    
    const card = container.querySelector('div');
    expect(card).toHaveClass('custom-card-class');
  });

  it('passes through HTML attributes', () => {
    const { container } = render(Card, {
      props: {
        id: 'test-card',
        'data-testid': 'card-test',
        children: () => 'Card'
      }
    });
    
    const card = container.querySelector('div');
    expect(card).toHaveAttribute('id', 'test-card');
    expect(card).toHaveAttribute('data-testid', 'card-test');
  });
});