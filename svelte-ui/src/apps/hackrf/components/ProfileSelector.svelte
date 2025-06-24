<script>
  import { createEventDispatcher } from 'svelte';
  
  export let selectedProfile = 'vhf';
  
  const dispatch = createEventDispatcher();
  
  const profiles = [
    { id: 'vhf', name: 'VHF (144-148 MHz)', description: '2m Amateur Radio' },
    { id: 'uhf', name: 'UHF (430-440 MHz)', description: '70cm Amateur Radio' },
    { id: 'ism', name: 'ISM (2.4-2.5 GHz)', description: 'WiFi/Bluetooth Band' },
    { id: 'cell800', name: 'Cellular 800', description: '800 MHz Cellular' },
    { id: 'cell1900', name: 'Cellular 1900', description: '1900 MHz PCS' },
    { id: 'aviation', name: 'Aviation', description: 'Aircraft Communications' }
  ];
  
  function selectProfile(profile) {
    selectedProfile = profile.id;
    dispatch('change', { profile: profile.id, name: profile.name });
  }
</script>

<div class="profile-selector">
  <h3>Frequency Profile</h3>
  <div class="profile-buttons">
    {#each profiles as profile}
      <button
        class="profile-btn"
        class:active={selectedProfile === profile.id}
        on:click={() => selectProfile(profile)}
        title={profile.description}
      >
        {profile.name}
      </button>
    {/each}
  </div>
</div>

<style>
  .profile-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary, #a0a0a0);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .profile-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .profile-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--border-color, #444);
    background-color: var(--bg-secondary, #272727);
    color: var(--text-primary, #e0e0e0);
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .profile-btn:hover {
    background-color: var(--bg-hover, #333);
    border-color: var(--accent-color, #00ff41);
  }

  .profile-btn.active {
    background-color: var(--accent-color, #00ff41);
    color: var(--bg-primary, #1a1a1a);
    border-color: var(--accent-color, #00ff41);
    font-weight: bold;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .profile-selector {
      flex-direction: column;
      align-items: stretch;
    }

    .profile-buttons {
      justify-content: center;
    }
  }
</style>