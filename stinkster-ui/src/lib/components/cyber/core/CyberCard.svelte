<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  
  interface Props extends HTMLAttributes<HTMLDivElement> {
    glow?: boolean
    interactive?: boolean
    variant?: 'default' | 'glass' | 'neon' | 'matrix'
  }
  
  let { 
    glow = true,
    interactive = true,
    variant = 'glass',
    class: className = '',
    children,
    ...restProps
  }: Props = $props()
</script>

<div 
  class="cyber-card {variant} {className}"
  class:glow
  class:interactive
  {...restProps}
>
  <div class="card-content">
    {@render children?.()}
  </div>
  <div class="card-border"></div>
  {#if glow}
    <div class="card-glow"></div>
  {/if}
</div>

<style>
  .cyber-card {
    position: relative;
    background: rgba(15, 20, 25, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 255, 170, 0.2);
    border-radius: 0;
    overflow: hidden;
    transition: all 0.3s ease;
    
    /* Corner cuts */
    clip-path: polygon(
      0 10px,
      10px 0,
      calc(100% - 10px) 0,
      100% 10px,
      100% calc(100% - 10px),
      calc(100% - 10px) 100%,
      10px 100%,
      0 calc(100% - 10px)
    );
  }
  
  /* Variants */
  .cyber-card.glass {
    background: rgba(15, 20, 25, 0.6);
    backdrop-filter: blur(20px);
  }
  
  .cyber-card.neon {
    background: rgba(15, 20, 25, 0.95);
    border-color: rgba(0, 255, 170, 0.5);
  }
  
  .cyber-card.matrix {
    background: rgba(0, 10, 0, 0.9);
    border-color: rgba(0, 255, 65, 0.3);
  }
  
  /* Interactive hover */
  .cyber-card.interactive:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 255, 170, 0.6);
  }
  
  .cyber-card.interactive.neon:hover {
    box-shadow: 0 0 30px rgba(0, 255, 170, 0.3);
  }
  
  /* Content */
  .card-content {
    position: relative;
    z-index: 2;
    padding: 1.5rem;
  }
  
  /* Animated border */
  .card-border {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      45deg,
      transparent 30%,
      rgba(0, 255, 170, 0.1) 50%,
      transparent 70%
    );
    background-size: 200% 200%;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .cyber-card.interactive:hover .card-border {
    opacity: 1;
    animation: borderShine 3s ease-in-out infinite;
  }
  
  /* Glow effect */
  .card-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle at center,
      rgba(0, 255, 170, 0.1) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  }
  
  .cyber-card.glow:hover .card-glow {
    opacity: 1;
  }
  
  @keyframes borderShine {
    0% { background-position: 200% 200%; }
    100% { background-position: -200% -200%; }
  }
</style>