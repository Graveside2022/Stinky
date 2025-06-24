<script lang="ts">
  import { onMount } from 'svelte';
  import { IconX } from '@tabler/icons-svelte';
  import Button from './Button.svelte';
  
  interface ModalProps {
    isOpen: boolean;
    onclose?: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children?: any;
  }
  
  let {
    isOpen = false,
    onclose,
    title,
    size = 'md',
    children
  }: ModalProps = $props();
  
  let dialogEl: HTMLDialogElement = $state();
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && onclose) {
      onclose();
    }
  }
  
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl && onclose) {
      onclose();
    }
  }
  
  $effect(() => {
    if (isOpen && dialogEl) {
      dialogEl.showModal();
    } else if (!isOpen && dialogEl) {
      dialogEl.close();
    }
  });
  
  onMount(() => {
    return () => {
      if (dialogEl?.open) {
        dialogEl.close();
      }
    };
  });
</script>

{#if isOpen}
  <dialog
    bind:this={dialogEl}
    class="modal"
    onkeydown={handleKeydown}
    onclick={handleBackdropClick}
  >
    <div class="modal-content {sizeClasses[size]}">
      {#if title || onclose}
        <div class="modal-header">
          {#if title}
            <h2 class="modal-title">{title}</h2>
          {/if}
          {#if onclose}
            <Button
              variant="ghost"
              size="sm"
              onclick={onclose}
              class="modal-close"
            >
              <IconX size={20} />
            </Button>
          {/if}
        </div>
      {/if}
      
      <div class="modal-body">
        {@render children?.()}
      </div>
    </div>
  </dialog>
{/if}

<style>
  .modal {
    padding: 0;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    max-width: 90vw;
    max-height: 90vh;
  }
  
  .modal::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .modal-content {
    background: var(--color-surface-100);
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  
  :global(.dark) .modal-content {
    background: var(--color-surface-800);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-surface-300);
  }
  
  :global(.dark) .modal-header {
    border-bottom-color: var(--color-surface-700);
  }
  
  .modal-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }
  
  :global(.modal-close) {
    margin-left: auto;
  }
  
  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    flex: 1;
  }
</style>