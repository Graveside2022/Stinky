<script>
  import { createEventDispatcher } from 'svelte';
  
  export let takServerIp = '0.0.0.0';
  export let takServerPort = 6969;
  
  const dispatch = createEventDispatcher();
  
  let multicast = true;
  let localIp = takServerIp;
  let localPort = takServerPort;
  
  async function updateSettings() {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          takServerIp: localIp,
          takServerPort: parseInt(localPort),
          takMulticastState: multicast,
        }),
      });

      const data = await response.json();
      dispatch('update', {
        success: true,
        message: data.message || 'TAK settings updated successfully'
      });
    } catch (error) {
      dispatch('update', {
        success: false,
        message: `Error updating TAK settings: ${error.message}`
      });
    }
  }
</script>

<div class="tak-settings">
  <h2>TAK Server Settings</h2>
  
  <div class="form-group">
    <label for="tak-ip">Server IP Address</label>
    <input 
      id="tak-ip"
      type="text" 
      bind:value={localIp}
      placeholder="0.0.0.0"
    />
  </div>
  
  <div class="form-group">
    <label for="tak-port">Server Port</label>
    <input 
      id="tak-port"
      type="number" 
      bind:value={localPort}
      min="1"
      max="65535"
      placeholder="6969"
    />
  </div>
  
  <div class="form-group checkbox">
    <label>
      <input 
        type="checkbox" 
        bind:checked={multicast}
      />
      Enable Multicast (239.2.3.1)
    </label>
  </div>
  
  <button 
    class="btn btn-primary"
    on:click={updateSettings}
  >
    Update TAK Settings
  </button>
</div>

<style>
  .tak-settings {
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
  
  .form-group.checkbox {
    margin: 1.5rem 0;
  }
  
  label {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .checkbox label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    text-transform: none;
    color: var(--text-primary);
  }
  
  input[type="text"],
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
  
  input[type="text"]:focus,
  input[type="number"]:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(0, 255, 65, 0.2);
  }
  
  input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
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