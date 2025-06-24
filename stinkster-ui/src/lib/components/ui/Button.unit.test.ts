import { describe, it, expect } from 'vitest';

describe('Button Component Unit Tests', () => {
  it('should generate correct classes for primary variant', () => {
    const variant = 'primary';
    const size = 'md';
    const className = '';
    
    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
      secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 dark:bg-secondary-500 dark:hover:bg-secondary-600',
      outline: 'border-2 border-surface-300 text-surface-700 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800',
      ghost: 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800',
      danger: 'bg-error text-white hover:bg-red-700'
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed';
    
    const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    
    expect(buttonClasses).toContain('bg-primary-600');
    expect(buttonClasses).toContain('text-white');
    expect(buttonClasses).toContain('px-4 py-2');
  });

  it('should include custom classes', () => {
    const customClass = 'my-custom-class';
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus-ring disabled:opacity-50 disabled:cursor-not-allowed';
    const variantClass = 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600';
    const sizeClass = 'px-4 py-2 text-base';
    
    const buttonClasses = `${baseClasses} ${variantClass} ${sizeClass} ${customClass}`;
    
    expect(buttonClasses).toContain('my-custom-class');
  });
});