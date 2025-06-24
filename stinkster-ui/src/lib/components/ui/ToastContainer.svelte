<script lang="ts">
  import { writable } from 'svelte/store';
  import Toast from './Toast.svelte';
  
  interface ToastItem {
    id: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'default';
    title?: string;
    message: string;
    duration?: number;
    closable?: boolean;
    actions?: Array<{ label: string; onclick: () => void; variant?: 'primary' | 'secondary' | 'outline' }>;
  }
  
  interface ToastContainerProps {
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    maxToasts?: number;
  }
  
  let {
    position = 'top-right',
    maxToasts = 5
  }: ToastContainerProps = $props();
  
  // Create a store for managing toasts
  const toasts = writable<ToastItem[]>([]);
  
  // Function to add a new toast
  function addToast(toast: Omit<ToastItem, 'id'>) {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = { id, ...toast };
    
    toasts.update(current => {
      const updated = [newToast, ...current];
      // Limit the number of toasts
      if (updated.length > maxToasts) {
        return updated.slice(0, maxToasts);
      }
      return updated;
    });
    
    return id;
  }
  
  // Function to remove a toast
  function removeToast(id: string) {
    toasts.update(current => current.filter(toast => toast.id !== id));
  }
  
  // Function to clear all toasts
  function clearAllToasts() {
    toasts.set([]);
  }
  
  // Expose the toast functions globally (for use from anywhere in the app)
  if (typeof window !== 'undefined') {
    (window as any).toast = {
      success: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
        addToast({ type: 'success', message, ...options }),
      error: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
        addToast({ type: 'error', message, ...options }),
      warning: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
        addToast({ type: 'warning', message, ...options }),
      info: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'type' | 'message'>>) => 
        addToast({ type: 'info', message, ...options }),
      show: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message'>>) => 
        addToast({ message, ...options }),
      clear: clearAllToasts
    };
  }
  
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50 space-y-2',
    'top-left': 'fixed top-4 left-4 z-50 space-y-2',
    'bottom-right': 'fixed bottom-4 right-4 z-50 space-y-2',
    'bottom-left': 'fixed bottom-4 left-4 z-50 space-y-2',  
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2'
  };
</script>

{#if $toasts.length > 0}
  <div class={positionClasses[position]}>
    {#each $toasts as toast (toast.id)}
      <div class="transform transition-all duration-200 ease-out">
        <div class="flex max-w-sm w-full bg-surface-100 dark:bg-surface-800 shadow-lg rounded-lg border border-surface-200 dark:border-surface-700 p-4">
          <div class="flex-shrink-0 mr-3">
            {#if toast.type === 'success'}
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            {:else if toast.type === 'error'}
              <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            {:else if toast.type === 'warning'}
              <svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            {:else if toast.type === 'info'}
              <svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            {:else}
              <svg class="w-5 h-5 text-surface-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            {/if}
          </div>
          
          <div class="flex-1 min-w-0">
            {#if toast.title}
              <p class="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-1">
                {toast.title}
              </p>
            {/if}
            
            <p class="text-sm text-surface-700 dark:text-surface-300">
              {toast.message}
            </p>
            
            {#if toast.actions && toast.actions.length > 0}
              <div class="flex gap-2 mt-3">
                {#each toast.actions as action}
                  <button
                    class="text-xs px-2 py-1 rounded font-medium transition-colors
                           {action.variant === 'primary' ? 'bg-primary-600 text-white hover:bg-primary-700' :
                            action.variant === 'secondary' ? 'bg-secondary-600 text-white hover:bg-secondary-700' :
                            'border border-surface-300 text-surface-700 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800'}"
                    onclick={action.onclick}
                  >
                    {action.label}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          
          {#if toast.closable !== false}
            <div class="flex-shrink-0 ml-3">
              <button
                class="p-1 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300 transition-colors"
                onclick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Toast animation styles */
  div {
    animation: slideIn 0.3s ease-out;
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
</style>