<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let variant: 'feature' | 'dashboard' | 'metric' | 'info' = 'dashboard';
  export let hoverable: boolean = false;
  export let clickable: boolean = false;
  export let gradient: 'blue' | 'purple' | 'green' | 'orange' | 'none' = 'none';
  export let glowOnHover: boolean = true;
  
  const dispatch = createEventDispatcher();
  
  function handleClick(event: MouseEvent) {
    if (clickable) {
      dispatch('click', event);
    }
  }
  
  $: classes = [
    'card',
    `card--${variant}`,
    hoverable && 'card--hoverable',
    clickable && 'card--clickable',
    gradient !== 'none' && `card--gradient-${gradient}`,
    glowOnHover && 'card--glow'
  ].filter(Boolean).join(' ');
</script>

<div
  class={classes}
  on:click={handleClick}
  on:keypress={(e) => e.key === 'Enter' && handleClick(e)}
  role={clickable ? 'button' : 'article'}
  tabindex={clickable ? 0 : undefined}
>
  {#if $$slots.icon}
    <div class="card__icon">
      <slot name="icon" />
    </div>
  {/if}
  
  {#if $$slots.header}
    <div class="card__header">
      <slot name="header" />
    </div>
  {/if}
  
  <div class="card__content">
    <slot />
  </div>
  
  {#if $$slots.footer}
    <div class="card__footer">
      <slot name="footer" />
    </div>
  {/if}
</div>

<style>
  .card {
    position: relative;
    background: rgba(18, 18, 18, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
    padding: 1.5rem;
    transition: all 0.3s ease;
    overflow: hidden;
  }
  
  /* Glass morphism base */
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.025) 100%
    );
    pointer-events: none;
  }
  
  /* Variants */
  .card--feature {
    padding: 2rem;
    text-align: center;
  }
  
  .card--dashboard {
    position: relative;
  }
  
  .card--metric {
    padding: 1.25rem;
  }
  
  .card--info {
    padding: 1rem 1.25rem;
  }
  
  /* Hover effects */
  .card--hoverable:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .card--clickable {
    cursor: pointer;
  }
  
  .card--clickable:active {
    transform: translateY(0);
  }
  
  /* Glow effect */
  .card--glow::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(
      circle,
      rgba(0, 102, 255, 0.1) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .card--glow:hover::after {
    opacity: 1;
  }
  
  /* Gradient backgrounds */
  .card--gradient-blue {
    background: linear-gradient(
      135deg,
      rgba(0, 102, 255, 0.15) 0%,
      rgba(0, 102, 255, 0.05) 100%
    );
  }
  
  .card--gradient-purple {
    background: linear-gradient(
      135deg,
      rgba(124, 58, 237, 0.15) 0%,
      rgba(124, 58, 237, 0.05) 100%
    );
  }
  
  .card--gradient-green {
    background: linear-gradient(
      135deg,
      rgba(34, 197, 94, 0.15) 0%,
      rgba(34, 197, 94, 0.05) 100%
    );
  }
  
  .card--gradient-orange {
    background: linear-gradient(
      135deg,
      rgba(251, 146, 60, 0.15) 0%,
      rgba(251, 146, 60, 0.05) 100%
    );
  }
  
  /* Card sections */
  .card__icon {
    margin-bottom: 1rem;
    color: #0066ff;
  }
  
  .card--feature .card__icon {
    font-size: 2.5rem;
    margin-bottom: 1.25rem;
  }
  
  .card__header {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .card__content {
    position: relative;
    z-index: 1;
  }
  
  .card__footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .card {
      padding: 1rem;
    }
    
    .card--feature {
      padding: 1.5rem;
    }
  }
  
  /* Focus styles */
  .card--clickable:focus {
    outline: none;
  }
  
  .card--clickable:focus-visible {
    outline: 2px solid #0066ff;
    outline-offset: 2px;
  }
  
  /* Animation for metric cards */
  .card--metric {
    position: relative;
    overflow: hidden;
  }
  
  .card--metric::before {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    animation: shimmer 2s ease-in-out infinite;
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
</style>