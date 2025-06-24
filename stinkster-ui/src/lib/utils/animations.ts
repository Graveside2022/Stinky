import { cubicOut, elasticOut, backOut, linear } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

/**
 * Common animation durations in milliseconds
 */
export const durations = {
  instant: 0,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 750,
  slowest: 1000
} as const;

/**
 * Reusable transition configurations
 */
export const transitions = {
  fadeIn: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.normal,
    easing: cubicOut
  }),
  
  fadeOut: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.fast,
    easing: cubicOut
  }),
  
  slideIn: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.normal,
    easing: cubicOut,
    x: 20
  }),
  
  slideUp: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.normal,
    easing: cubicOut,
    y: 20
  }),
  
  scaleIn: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.normal,
    easing: elasticOut,
    start: 0.95
  }),
  
  bounceIn: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.slow,
    easing: elasticOut
  }),
  
  glowPulse: (delay = 0): TransitionConfig => ({
    delay,
    duration: durations.slower,
    easing: linear
  })
} as const;

/**
 * Stagger animation helper for lists
 */
export function stagger(index: number, baseDelay = 0, increment = 50): number {
  return baseDelay + (index * increment);
}

/**
 * Creates a custom spring configuration for smoother animations
 */
export function springConfig(stiffness = 0.15, damping = 0.8) {
  return { stiffness, damping };
}

/**
 * Performance-optimized animation settings
 */
export const performanceSettings = {
  // Use will-change for elements that will animate
  willChange: 'transform, opacity',
  
  // GPU acceleration
  transform: 'translateZ(0)',
  
  // Contain paint and layout
  contain: 'layout style paint',
  
  // Reduce motion for accessibility
  reducedMotion: '@media (prefers-reduced-motion: reduce)'
} as const;

/**
 * Keyframe animations for CSS
 */
export const keyframes = {
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  
  glow: `
    @keyframes glow {
      0%, 100% { 
        filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor);
      }
      50% { 
        filter: drop-shadow(0 0 20px currentColor) drop-shadow(0 0 40px currentColor);
      }
    }
  `,
  
  scan: `
    @keyframes scan {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }
  `,
  
  rotate: `
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  
  float: `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  `
} as const;

/**
 * Animation class utilities
 */
export const animationClasses = {
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  ping: 'animate-ping',
  bounce: 'animate-bounce',
  
  // Custom animations
  glow: 'animate-glow',
  scan: 'animate-scan',
  float: 'animate-float'
} as const;

/**
 * Intersection Observer configuration for scroll animations
 */
export const observerConfig = {
  threshold: 0.1,
  rootMargin: '50px'
};

/**
 * Debounced animation frame helper
 */
export function debounceRAF(fn: Function) {
  let frame: number;
  
  return (...args: any[]) => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fn(...args));
  };
}

/**
 * Animation sequence helper
 */
export async function sequence(
  animations: Array<() => Promise<void>>,
  delay = 0
): Promise<void> {
  for (const animation of animations) {
    await animation();
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Parallel animation helper
 */
export async function parallel(
  animations: Array<() => Promise<void>>
): Promise<void> {
  await Promise.all(animations.map(animation => animation()));
}

/**
 * CSS transition utility
 */
export function transition(
  property: string | string[],
  duration = durations.normal,
  easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
): string {
  const props = Array.isArray(property) ? property : [property];
  return props
    .map(prop => `${prop} ${duration}ms ${easing}`)
    .join(', ');
}