<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { fly, fade } from 'svelte/transition';
  import { X } from 'lucide-svelte';
  
  interface $$Props extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md' | 'lg';
    glow?: boolean;
    closable?: boolean;
    onClose?: () => void;
  }
  
  export let variant: $$Props['variant'] = 'primary';
  export let size: $$Props['size'] = 'md';
  export let glow: $$Props['glow'] = false;
  export let closable: $$Props['closable'] = false;
  export let onClose: $$Props['onClose'] = undefined;
  
  let className: $$Props['class'] = '';
  export { className as class };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2'
  };
  
  const variantClasses = {
    primary: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    secondary: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    success: 'bg-green-500/20 text-green-300 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  };
  
  const glowClasses = {
    primary: 'shadow-[0_0_20px_rgba(0,255,157,0.3)]',
    secondary: 'shadow-[0_0_20px_rgba(156,163,175,0.3)]',
    success: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    warning: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    error: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    info: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]'
  };
  
  function handleClose() {
    onClose?.();
  }
  
  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };
</script>

<span
  class="
    inline-flex items-center font-medium rounded-full border backdrop-blur-sm
    transition-all duration-200
    {sizeClasses[size]}
    {variantClasses[variant]}
    {glow ? glowClasses[variant] : ''}
    {className}
  "
  in:fly={{ x: -10, duration: 200 }}
  out:fade={{ duration: 150 }}
  {...$$restProps}
>
  {#if $$slots.icon}
    <span class="flex-shrink-0">
      <slot name="icon" />
    </span>
  {/if}
  
  <slot />
  
  {#if closable}
    <button
      type="button"
      class="
        flex-shrink-0 ml-0.5 -mr-0.5 rounded-full p-0.5
        hover:bg-white/10 transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-white/20
      "
      on:click={handleClose}
      aria-label="Remove"
    >
      <X size={iconSizes[size]} />
    </button>
  {/if}
</span>