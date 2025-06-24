<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let type: 'text' | 'number' | 'email' | 'password' | 'search' | 'tel' | 'url' = 'text';
  export let value: string | number = '';
  export let placeholder: string = '';
  export let label: string = '';
  export let unit: string = '';
  export let error: string = '';
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let readonly: boolean = false;
  export let autofocus: boolean = false;
  export let id: string = `input-${Math.random().toString(36).substr(2, 9)}`;
  export let name: string = '';
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | undefined = undefined;
  export let pattern: string | undefined = undefined;
  export let autocomplete: string | undefined = undefined;
  
  const dispatch = createEventDispatcher();
  
  let focused = false;
  let inputElement: HTMLInputElement;
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (type === 'number') {
      value = target.valueAsNumber || 0;
    } else {
      value = target.value;
    }
    dispatch('input', { value, event });
  }
  
  function handleChange(event: Event) {
    dispatch('change', { value, event });
  }
  
  function handleFocus(event: FocusEvent) {
    focused = true;
    dispatch('focus', event);
  }
  
  function handleBlur(event: FocusEvent) {
    focused = false;
    dispatch('blur', event);
  }
  
  function handleKeydown(event: KeyboardEvent) {
    dispatch('keydown', event);
  }
  
  export function focus() {
    inputElement?.focus();
  }
  
  export function blur() {
    inputElement?.blur();
  }
  
  $: classes = [
    'input-wrapper',
    focused && 'input-wrapper--focused',
    error && 'input-wrapper--error',
    disabled && 'input-wrapper--disabled',
    unit && 'input-wrapper--with-unit'
  ].filter(Boolean).join(' ');
</script>

<div class="input-container">
  {#if label}
    <label for={id} class="input-label">
      {label}
      {#if required}
        <span class="input-label__required">*</span>
      {/if}
    </label>
  {/if}
  
  <div class={classes}>
    <input
      bind:this={inputElement}
      {id}
      {type}
      {name}
      {value}
      {placeholder}
      {disabled}
      {required}
      {readonly}
      {autofocus}
      {min}
      {max}
      {step}
      {pattern}
      {autocomplete}
      class="input"
      on:input={handleInput}
      on:change={handleChange}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
    />
    
    {#if unit}
      <span class="input-unit">{unit}</span>
    {/if}
    
    <div class="input-glow" />
  </div>
  
  {#if error}
    <div class="input-error">
      {error}
    </div>
  {/if}
</div>

<style>
  .input-container {
    width: 100%;
  }
  
  .input-label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #e0e0e0;
  }
  
  .input-label__required {
    color: #ff4444;
    margin-left: 0.25rem;
  }
  
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.375rem;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
    overflow: hidden;
  }
  
  .input {
    flex: 1;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 0.875rem;
    line-height: 1.5;
    outline: none;
    width: 100%;
  }
  
  .input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  /* Remove default number input spinners */
  .input[type="number"]::-webkit-inner-spin-button,
  .input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  .input[type="number"] {
    -moz-appearance: textfield;
  }
  
  /* Unit display */
  .input-unit {
    padding: 0 1rem;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.875rem;
    font-weight: 500;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
  }
  
  /* Focus state with neon glow */
  .input-wrapper--focused {
    border-color: #0066ff;
    background: rgba(0, 102, 255, 0.05);
  }
  
  .input-glow {
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: #0066ff;
    border-radius: inherit;
    opacity: 0;
    filter: blur(8px);
    transition: opacity 0.2s ease;
    pointer-events: none;
    z-index: -1;
  }
  
  .input-wrapper--focused .input-glow {
    opacity: 0.3;
  }
  
  /* Error state */
  .input-wrapper--error {
    border-color: #ff4444;
  }
  
  .input-wrapper--error.input-wrapper--focused {
    border-color: #ff4444;
    background: rgba(255, 68, 68, 0.05);
  }
  
  .input-wrapper--error .input-glow {
    background: #ff4444;
  }
  
  .input-error {
    margin-top: 0.25rem;
    font-size: 0.75rem;
    color: #ff4444;
  }
  
  /* Disabled state */
  .input-wrapper--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .input-wrapper--disabled .input {
    cursor: not-allowed;
  }
  
  /* Hover effect */
  .input-wrapper:hover:not(.input-wrapper--disabled):not(.input-wrapper--focused) {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.07);
  }
  
  /* Autofill styles */
  .input:-webkit-autofill,
  .input:-webkit-autofill:hover,
  .input:-webkit-autofill:focus {
    -webkit-text-fill-color: #ffffff;
    -webkit-box-shadow: 0 0 0 30px rgba(255, 255, 255, 0.05) inset;
    transition: background-color 5000s ease-in-out 0s;
  }
  
  /* Search input clear button */
  .input[type="search"]::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    height: 1rem;
    width: 1rem;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cline x1='18' y1='6' x2='6' y2='18'/%3E%3Cline x1='6' y1='6' x2='18' y2='18'/%3E%3C/svg%3E") no-repeat center;
    background-size: contain;
    cursor: pointer;
    margin-right: 0.5rem;
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .input {
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
    }
  }
</style>