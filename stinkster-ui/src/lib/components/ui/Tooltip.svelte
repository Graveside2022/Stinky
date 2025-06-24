<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  
  export let content: string;
  export let placement: 'top' | 'bottom' | 'left' | 'right' = 'top';
  export let delay: number = 500;
  export let offset: number = 8;
  export let arrow: boolean = true;
  
  let trigger: HTMLElement;
  let tooltip: HTMLElement;
  let visible = false;
  let timer: ReturnType<typeof setTimeout>;
  let position = { x: 0, y: 0 };
  
  const arrowSize = 6;
  
  function calculatePosition() {
    if (!trigger || !tooltip) return;
    
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = 0;
    let y = 0;
    
    // Calculate base position
    switch (placement) {
      case 'top':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.top - tooltipRect.height - offset - (arrow ? arrowSize : 0);
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        y = triggerRect.bottom + offset + (arrow ? arrowSize : 0);
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - offset - (arrow ? arrowSize : 0);
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        x = triggerRect.right + offset + (arrow ? arrowSize : 0);
        y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        break;
    }
    
    // Prevent tooltip from going off-screen
    x = Math.max(8, Math.min(x, viewportWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, viewportHeight - tooltipRect.height - 8));
    
    position = { x, y };
  }
  
  function showTooltip() {
    timer = setTimeout(() => {
      visible = true;
      requestAnimationFrame(calculatePosition);
    }, delay);
  }
  
  function hideTooltip() {
    clearTimeout(timer);
    visible = false;
  }
  
  function handleMouseEnter() {
    showTooltip();
  }
  
  function handleMouseLeave() {
    hideTooltip();
  }
  
  function handleFocus() {
    showTooltip();
  }
  
  function handleBlur() {
    hideTooltip();
  }
  
  onMount(() => {
    window.addEventListener('scroll', calculatePosition, true);
    window.addEventListener('resize', calculatePosition);
  });
  
  onDestroy(() => {
    clearTimeout(timer);
    window.removeEventListener('scroll', calculatePosition, true);
    window.removeEventListener('resize', calculatePosition);
  });
  
  const arrowClasses = {
    top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full',
    bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full',
    left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 rotate-90',
    right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90'
  };
</script>

<div class="relative inline-block">
  <div
    bind:this={trigger}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    on:focus={handleFocus}
    on:blur={handleBlur}
    role="tooltip"
    aria-describedby={visible ? 'tooltip' : undefined}
  >
    <slot />
  </div>
  
  {#if visible}
    <div
      bind:this={tooltip}
      id="tooltip"
      class="fixed z-50 pointer-events-none"
      style="left: {position.x}px; top: {position.y}px;"
      transition:fade={{ duration: 200, easing: cubicOut }}
    >
      <div class="
        relative px-3 py-2 text-sm font-medium text-white
        bg-gray-900/95 backdrop-blur-sm rounded-lg
        border border-gray-700/50
        shadow-[0_0_30px_rgba(0,255,157,0.15)]
      ">
        {content}
        
        {#if arrow}
          <div
            class="absolute w-0 h-0 {arrowClasses[placement]}"
            style="
              border-left: {arrowSize}px solid transparent;
              border-right: {arrowSize}px solid transparent;
              border-top: {arrowSize}px solid rgb(17 24 39 / 0.95);
            "
          />
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :global([role="tooltip"]) {
    cursor: help;
  }
</style>