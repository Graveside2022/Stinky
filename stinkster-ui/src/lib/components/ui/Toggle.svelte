<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  
  interface ToggleProps extends Omit<HTMLInputAttributes, 'type'> {
    checked?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    onchange?: (checked: boolean) => void;
  }
  
  let {
    checked = $bindable(false),
    disabled = false,
    size = 'md',
    onchange,
    ...restProps
  }: ToggleProps = $props();
  
  const sizeClasses = {
    sm: 'toggle-sm',
    md: 'toggle-md',
    lg: 'toggle-lg'
  };
  
  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    checked = target.checked;
    onchange?.(checked);
  }
</script>

<label class="toggle-wrapper {sizeClasses[size]}" class:disabled>
  <input
    type="checkbox"
    bind:checked
    {disabled}
    onchange={handleChange}
    class="toggle-input"
    {...restProps}
  />
  <span class="toggle-slider"></span>
</label>

<style>
  .toggle-wrapper {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }
  
  .toggle-wrapper.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  /* Size variations */
  .toggle-sm {
    width: 2rem;
    height: 1rem;
  }
  
  .toggle-md {
    width: 2.5rem;
    height: 1.25rem;
  }
  
  .toggle-lg {
    width: 3rem;
    height: 1.5rem;
  }
  
  .toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-surface-400);
    border-radius: 9999px;
    transition: all 0.2s;
  }
  
  .toggle-slider::before {
    content: '';
    position: absolute;
    background-color: white;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  /* Size-specific slider */
  .toggle-sm .toggle-slider::before {
    width: 0.75rem;
    height: 0.75rem;
    left: 0.125rem;
    top: 0.125rem;
  }
  
  .toggle-md .toggle-slider::before {
    width: 1rem;
    height: 1rem;
    left: 0.125rem;
    top: 0.125rem;
  }
  
  .toggle-lg .toggle-slider::before {
    width: 1.25rem;
    height: 1.25rem;
    left: 0.125rem;
    top: 0.125rem;
  }
  
  /* Checked state */
  .toggle-input:checked + .toggle-slider {
    background-color: var(--color-primary-500);
  }
  
  .toggle-sm .toggle-input:checked + .toggle-slider::before {
    transform: translateX(1rem);
  }
  
  .toggle-md .toggle-input:checked + .toggle-slider::before {
    transform: translateX(1.25rem);
  }
  
  .toggle-lg .toggle-input:checked + .toggle-slider::before {
    transform: translateX(1.5rem);
  }
  
  /* Focus state */
  .toggle-input:focus + .toggle-slider {
    box-shadow: 0 0 0 2px var(--color-primary-200);
  }
  
  :global(.dark) .toggle-input:focus + .toggle-slider {
    box-shadow: 0 0 0 2px var(--color-primary-700);
  }
  
  /* Hover state */
  .toggle-wrapper:not(.disabled):hover .toggle-slider {
    background-color: var(--color-surface-500);
  }
  
  .toggle-wrapper:not(.disabled):hover .toggle-input:checked + .toggle-slider {
    background-color: var(--color-primary-600);
  }
</style>