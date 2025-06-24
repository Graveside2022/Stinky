<script lang="ts">
  import { onMount } from 'svelte';
  import { IconX, IconCheck, IconAlertTriangle, IconAlertCircle, IconInfoCircle } from '@tabler/icons-svelte';
  import Button from './Button.svelte';
  
  interface ToastProps {
    id?: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'default';
    title?: string;
    message: string;
    duration?: number; // in milliseconds, 0 for persistent
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    closable?: boolean;
    onclose?: (id?: string) => void;
    actions?: Array<{ label: string; onclick: () => void; variant?: 'primary' | 'secondary' | 'outline' }>;
  }
  
  let {
    id,
    type = 'default',
    title,
    message,
    duration = 5000,
    position = 'top-right',
    closable = true,
    onclose,
    actions = []
  }: ToastProps = $props();
  
  let visible = $state(true);
  let timeoutId: number | undefined = undefined;
  
  const typeConfig = {
    success: {
      icon: IconCheck,
      bgClass: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      iconClass: 'text-green-600 dark:text-green-400',
      titleClass: 'text-green-800 dark:text-green-200',
      messageClass: 'text-green-700 dark:text-green-300'
    },
    error: {
      icon: IconAlertCircle,
      bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      iconClass: 'text-red-600 dark:text-red-400',
      titleClass: 'text-red-800 dark:text-red-200',
      messageClass: 'text-red-700 dark:text-red-300'
    },
    warning: {
      icon: IconAlertTriangle,
      bgClass: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      iconClass: 'text-yellow-600 dark:text-yellow-400',
      titleClass: 'text-yellow-800 dark:text-yellow-200',
      messageClass: 'text-yellow-700 dark:text-yellow-300'
    },
    info: {
      icon: IconInfoCircle,
      bgClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      iconClass: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-blue-800 dark:text-blue-200',
      messageClass: 'text-blue-700 dark:text-blue-300'
    },
    default: {
      icon: IconInfoCircle,
      bgClass: 'bg-surface-100 dark:bg-surface-800 border-surface-200 dark:border-surface-700',
      iconClass: 'text-surface-600 dark:text-surface-400',
      titleClass: 'text-surface-800 dark:text-surface-200',
      messageClass: 'text-surface-700 dark:text-surface-300'
    }
  };
  
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50'
  };
  
  const config = $derived(typeConfig[type]);
  
  function handleClose() {
    visible = false;
    if (timeoutId) clearTimeout(timeoutId);
    
    // Wait for animation to complete before calling onclose
    setTimeout(() => {
      onclose?.(id);
    }, 200);
  }
  
  onMount(() => {
    if (duration > 0) {
      timeoutId = setTimeout(handleClose, duration);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });
</script>

{#if visible}
  <div
    class="toast-container {positionClasses[position]} transition-all duration-200 ease-out"
    class:opacity-100={visible}
    class:opacity-0={!visible}
    class:translate-y-0={visible}
    class:translate-y-2={!visible}
    role="alert"
    aria-live="polite"
  >
    <div class="flex max-w-sm w-full {config.bgClass} shadow-lg rounded-lg border p-4">
      <div class="flex-shrink-0 mr-3">
        {#if config.icon}
          {@const IconComponent = config.icon}
          <IconComponent size={20} class={config.iconClass} />
        {/if}
      </div>
      
      <div class="flex-1 min-w-0">
        {#if title}
          <p class="text-sm font-semibold {config.titleClass} mb-1">
            {title}
          </p>
        {/if}
        
        <p class="text-sm {config.messageClass}">
          {message}
        </p>
        
        {#if actions.length > 0}
          <div class="flex gap-2 mt-3">
            {#each actions as action}
              <Button
                variant={action.variant || 'outline'}
                size="sm"
                onclick={action.onclick}
                class="text-xs"
              >
                {action.label}
              </Button>
            {/each}
          </div>
        {/if}
      </div>
      
      {#if closable}
        <div class="flex-shrink-0 ml-3">
          <Button
            variant="ghost"
            size="sm"
            onclick={handleClose}
            class="p-1 h-6 w-6 {config.iconClass} hover:bg-opacity-20"
            aria-label="Dismiss notification"
          >
            <IconX size={16} />
          </Button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .toast-container {
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  /* Adjust slide direction based on position */
  .toast-container:global(.fixed.left-4),
  .toast-container:global(.fixed.left-1\/2) {
    animation: slideInLeft 0.2s ease-out;
  }
  
  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>