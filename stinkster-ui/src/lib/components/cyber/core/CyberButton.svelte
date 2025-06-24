<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements'
  
  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'danger' | 'ghost' | 'matrix'
    size?: 'sm' | 'md' | 'lg'
    glow?: boolean
    pulse?: boolean
  }
  
  let { 
    variant = 'primary',
    size = 'md',
    glow = true,
    pulse = false,
    disabled = false,
    class: className = '',
    onclick,
    children,
    ...restProps
  }: Props = $props()
  
  let isClicked = $state(false)
  
  function handleClick(e: MouseEvent) {
    if (disabled) return
    
    isClicked = true
    setTimeout(() => isClicked = false, 300)
    
    if (onclick) {
      onclick(e)
    }
  }
</script>

<button 
  class="cyber-button {variant} {size} {className}" 
  class:glow 
  class:pulse
  class:glitch={isClicked}
  class:disabled
  {disabled}
  onclick={handleClick}
  {...restProps}
>
  <span class="button-content">
    {@render children?.()}
  </span>
  {#if glow}
    <span class="button-glow"></span>
  {/if}
  <span class="button-border"></span>
</button>

<style>
  .cyber-button {
    position: relative;
    background: rgba(15, 20, 25, 0.85);
    border: 1px solid transparent;
    color: #00ffaa;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    overflow: hidden;
    transition: all 0.3s ease;
    cursor: pointer;
    isolation: isolate;
  }
  
  .cyber-button.primary {
    --button-color: #00ffaa;
    --button-shadow: rgba(0, 255, 170, 0.4);
  }
  
  .cyber-button.danger {
    --button-color: #ff0040;
    --button-shadow: rgba(255, 0, 64, 0.4);
  }
  
  .cyber-button.ghost {
    --button-color: #0080ff;
    --button-shadow: rgba(0, 128, 255, 0.4);
    background: transparent;
  }
  
  .cyber-button.matrix {
    --button-color: #00ff41;
    --button-shadow: rgba(0, 255, 65, 0.4);
  }
  
  /* Sizes */
  .cyber-button.sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }
  
  .cyber-button.md {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
  
  .cyber-button.lg {
    padding: 0.625rem 1.25rem;
    font-size: 1rem;
  }
  
  /* Hover effects */
  .cyber-button:not(.disabled):hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px var(--button-shadow);
    border-color: var(--button-color);
  }
  
  .cyber-button:not(.disabled):active {
    transform: translateY(0);
  }
  
  .cyber-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Button content */
  .button-content {
    position: relative;
    z-index: 2;
  }
  
  /* Glow effect */
  .button-glow {
    position: absolute;
    inset: -2px;
    background: conic-gradient(
      from 0deg,
      transparent,
      var(--button-color),
      transparent 30%
    );
    border-radius: inherit;
    animation: rotate 3s linear infinite;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 1;
  }
  
  .cyber-button:not(.disabled):hover .button-glow {
    opacity: 0.8;
  }
  
  /* Border animation */
  .button-border {
    position: absolute;
    inset: 0;
    border: 1px solid var(--button-color);
    border-radius: inherit;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .cyber-button:not(.disabled):hover .button-border {
    opacity: 1;
  }
  
  /* Pulse animation */
  .cyber-button.pulse:not(.disabled) {
    animation: pulse 2s infinite;
  }
  
  /* Glitch effect */
  .cyber-button.glitch .button-content {
    animation: glitch 0.3s ease-out;
  }
  
  @keyframes rotate {
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--button-shadow); }
    50% { box-shadow: 0 0 20px 5px var(--button-shadow); }
  }
  
  @keyframes glitch {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-2px); }
    40% { transform: translateX(2px); }
    60% { transform: translateX(-1px); }
    80% { transform: translateX(1px); }
  }
</style>