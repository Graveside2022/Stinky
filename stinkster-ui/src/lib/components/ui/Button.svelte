<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let fullWidth: boolean = false;
  export let href: string | undefined = undefined;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  
  const dispatch = createEventDispatcher();
  
  function handleClick(event: MouseEvent) {
    if (!disabled && !loading) {
      dispatch('click', event);
    }
  }
  
  $: classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    fullWidth && 'button--full-width',
    (disabled || loading) && 'button--disabled'
  ].filter(Boolean).join(' ');
</script>

{#if href && !disabled && !loading}
  <a 
    {href}
    class={classes}
    on:click={handleClick}
  >
    {#if loading}
      <span class="button__spinner" />
    {/if}
    <span class="button__content" class:button__content--loading={loading}>
      <slot />
    </span>
  </a>
{:else}
  <button
    {type}
    class={classes}
    disabled={disabled || loading}
    on:click={handleClick}
  >
    {#if loading}
      <span class="button__spinner" />
    {/if}
    <span class="button__content" class:button__content--loading={loading}>
      <slot />
    </span>
  </button>
{/if}

<style>
  .button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1;
    text-decoration: none;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
    white-space: nowrap;
  }
  
  .button:focus {
    outline: none;
  }
  
  .button:focus-visible {
    outline: 2px solid #06f;
    outline-offset: 2px;
  }
  
  /* Size variants */
  .button--small {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }
  
  .button--large {
    padding: 1rem 2rem;
    font-size: 1rem;
  }
  
  .button--full-width {
    width: 100%;
  }
  
  /* Primary variant with neon glow */
  .button--primary {
    background: linear-gradient(135deg, #0066ff 0%, #004dcc 100%);
    color: white;
    box-shadow: 0 0 0 0 rgba(0, 102, 255, 0.4);
    position: relative;
    overflow: hidden;
  }
  
  .button--primary::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #0066ff, #00ccff, #0066ff);
    border-radius: inherit;
    opacity: 0;
    z-index: -1;
    transition: opacity 0.3s ease;
    animation: shimmer 3s ease-in-out infinite;
  }
  
  .button--primary:hover:not(.button--disabled) {
    transform: translateY(-1px);
    box-shadow: 
      0 0 20px rgba(0, 102, 255, 0.5),
      0 0 40px rgba(0, 102, 255, 0.3),
      0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .button--primary:hover:not(.button--disabled)::before {
    opacity: 1;
  }
  
  .button--primary:active:not(.button--disabled) {
    transform: translateY(0);
  }
  
  /* Secondary variant */
  .button--secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
  
  .button--secondary:hover:not(.button--disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .button--secondary:active:not(.button--disabled) {
    transform: translateY(0);
  }
  
  /* Ghost variant */
  .button--ghost {
    background: transparent;
    color: #0066ff;
    border: 1px solid transparent;
  }
  
  .button--ghost:hover:not(.button--disabled) {
    background: rgba(0, 102, 255, 0.1);
    border-color: rgba(0, 102, 255, 0.2);
  }
  
  /* Disabled state */
  .button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Loading spinner */
  .button__spinner {
    position: absolute;
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  
  .button__content {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    transition: opacity 0.2s ease;
  }
  
  .button__content--loading {
    opacity: 0;
  }
  
  /* Animations */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% center;
    }
    100% {
      background-position: 200% center;
    }
  }
  
  /* Shine effect for primary button */
  .button--primary::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 70%
    );
    transform: rotate(45deg) translate(-100%, -100%);
    transition: transform 0.6s;
  }
  
  .button--primary:hover:not(.button--disabled)::after {
    transform: rotate(45deg) translate(100%, 100%);
  }
</style>