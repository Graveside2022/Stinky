<script>
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let antennaSensitivity = 'standard';
  
  const dispatch = createEventDispatcher();
  
  let selectedType = antennaSensitivity;
  let customFactor = 1.0;
  let showCustom = false;
  
  const antennaTypes = [
    { value: 'high', label: 'High Sensitivity (-3dB)' },
    { value: 'standard', label: 'Standard (0dB)' },
    { value: 'low', label: 'Low Sensitivity (+3dB)' },
    { value: 'custom', label: 'Custom Factor' }
  ];
  
  onMount(async () => {
    try {
      const response = await fetch('/api/antenna-settings');
      const data = await response.json();
      
      selectedType = data.currentSensitivity || 'standard';
      customFactor = data.customFactor || 1.0;
      showCustom = selectedType === 'custom';
    } catch (error) {
      console.error('Failed to load antenna settings:', error);
    }
  });
  
  $: showCustom = selectedType === 'custom';
  
  async function updateSettings() {
    const data = {
      antennaSensitivity: selectedType,
    };

    if (selectedType === 'custom') {
      data.customFactor = parseFloat(customFactor);
    }

    try {
      const response = await fetch('/api/antenna-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      dispatch('update', {
        success: true,
        message: result.message || 'Antenna settings updated successfully'
      });
    } catch (error) {
      dispatch('update', {
        success: false,
        message: `Error updating antenna settings: ${error.message}`
      });
    }
  }
</script>

<div class="antenna-settings">
  <h2>Antenna Sensitivity</h2>
  
  <div class="form-group">
    <label for="antenna-type">Antenna Type</label>
    <select 
      id="antenna-type"
      bind:value={selectedType}
    >
      {#each antennaTypes as type}
        <option value={type.value}>{type.label}</option>
      {/each}
    </select>
  </div>
  
  {#if showCustom}
    <div class="form-group custom-factor">
      <label for="custom-factor">Custom Sensitivity Factor</label>
      <input 
        id="custom-factor"
        type="number" 
        bind:value={customFactor}
        min="0.1"
        max="10"
        step="0.1"
        placeholder="1.0"
      />
      <small>Factor to multiply RSSI values (0.1 - 10.0)</small>
    </div>
  {/if}
  
  <button 
    class="btn btn-primary"
    on:click={updateSettings}
  >
    Update Antenna Settings
  </button>
</div>

<style>
  .antenna-settings {
    background-color: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 1.5rem;
    border-radius: 4px;
  }
  
  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: var(--text-highlight);
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  select,
  input[type="number"] {
    width: 100%;
    padding: 0.5rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  select:focus,
  input[type="number"]:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(0, 255, 65, 0.2);
  }
  
  small {
    display: block;
    margin-top: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.75rem;
  }
  
  .btn {
    width: 100%;
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--accent-color);
    background-color: transparent;
    color: var(--accent-color);
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }
  
  .btn:hover {
    background-color: var(--accent-color);
    color: var(--bg-primary);
  }
</style>