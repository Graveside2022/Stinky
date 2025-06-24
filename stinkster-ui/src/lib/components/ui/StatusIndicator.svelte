<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  
  interface StatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
    status: 'online' | 'offline' | 'warning' | 'error' | 'idle';
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    label?: string;
    pulse?: boolean;
    class?: string;
  }
  
  let {
    status,
    size = 'md',
    showLabel = false,
    label = '',
    pulse = true,
    class: className = '',
    ...restProps
  }: StatusIndicatorProps = $props();
  
  const statusColors = {
    online: 'bg-success',
    offline: 'bg-surface-400',
    warning: 'bg-warning',
    error: 'bg-error',
    idle: 'bg-info'
  };
  
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };
  
  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    warning: 'Warning',
    error: 'Error',
    idle: 'Idle'
  };
  
  const displayLabel = $derived(label || statusLabels[status]);
  const shouldPulse = $derived(pulse && (status === 'online' || status === 'warning'));
</script>

<div
  class="inline-flex items-center gap-2 {className}"
  {...restProps}
>
  <span
    class="rounded-full {statusColors[status]} {sizeClasses[size]}"
    class:animate-pulse-subtle={shouldPulse}
  ></span>
  {#if showLabel}
    <span class="text-sm text-surface-700 dark:text-surface-300">
      {displayLabel}
    </span>
  {/if}
</div>