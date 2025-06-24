<script>
  import { signalsStore } from '../stores/spectrum';
  
  $: sortedSignals = $signalsStore.sort((a, b) => b.power - a.power);
</script>

<div class="signals-list">
  {#if sortedSignals.length === 0}
    <p class="no-signals">No signals detected in current frequency range</p>
  {:else}
    <div class="signals-container">
      {#each sortedSignals as signal}
        <div class="signal-item" class:demo={signal.type === 'demo'}>
          <div class="signal-header">
            <span class="frequency">{signal.frequency.toFixed(3)} MHz</span>
            <span class="signal-type">{signal.type === 'demo' ? 'DEMO' : 'REAL'}</span>
          </div>
          <div class="signal-details">
            <span class="power">
              <strong>Power:</strong> {signal.power || signal.strength} dB
            </span>
            <span class="confidence">
              <strong>Confidence:</strong> {((signal.confidence || 0.8) * 100).toFixed(0)}%
            </span>
            {#if signal.bin !== undefined}
              <span class="bin">
                <strong>Bin:</strong> {signal.bin}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .signals-list {
    flex: 1;
    overflow-y: auto;
  }

  .no-signals {
    text-align: center;
    color: var(--text-secondary, #666);
    font-style: italic;
    padding: 2rem;
  }

  .signals-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .signal-item {
    background-color: var(--bg-secondary, #272727);
    border: 1px solid var(--border-color, #444);
    padding: 0.75rem;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .signal-item:hover {
    border-color: var(--accent-color, #00ff41);
    box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
  }

  .signal-item.demo {
    opacity: 0.7;
    border-style: dashed;
  }

  .signal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .frequency {
    font-size: 1.125rem;
    font-weight: bold;
    color: var(--accent-color, #00ff41);
  }

  .signal-type {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background-color: var(--bg-primary, #1a1a1a);
    border: 1px solid var(--border-color, #444);
    border-radius: 3px;
    text-transform: uppercase;
  }

  .signal-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #a0a0a0);
  }

  .signal-details strong {
    color: var(--text-primary, #e0e0e0);
  }

  /* Custom scrollbar */
  .signals-list::-webkit-scrollbar {
    width: 8px;
  }

  .signals-list::-webkit-scrollbar-track {
    background: var(--bg-primary, #1a1a1a);
  }

  .signals-list::-webkit-scrollbar-thumb {
    background: var(--border-color, #444);
    border-radius: 4px;
  }

  .signals-list::-webkit-scrollbar-thumb:hover {
    background: var(--accent-color, #00ff41);
  }
</style>