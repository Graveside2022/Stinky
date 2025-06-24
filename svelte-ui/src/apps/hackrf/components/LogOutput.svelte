<script>
  import { afterUpdate } from 'svelte';
  
  export let logs = [];
  
  let logContainer;
  
  afterUpdate(() => {
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });
</script>

<div class="log-output" bind:this={logContainer}>
  {#each logs as log}
    <div class="log-entry" class:error={log.type === 'error'} class:warning={log.type === 'warning'}>
      <span class="timestamp">[{log.timestamp}]</span>
      <span class="message">{log.message}</span>
    </div>
  {/each}
</div>

<style>
  .log-output {
    flex: 1;
    overflow-y: auto;
    background-color: var(--bg-primary, #1a1a1a);
    border: 1px solid var(--border-color, #444);
    padding: 0.5rem;
    font-family: var(--font-mono, 'Fira Code', monospace);
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .log-entry {
    display: flex;
    gap: 0.5rem;
    padding: 0.125rem 0;
    border-bottom: 1px solid rgba(68, 68, 68, 0.2);
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .timestamp {
    color: var(--text-secondary, #666);
    flex-shrink: 0;
  }

  .message {
    color: var(--text-primary, #e0e0e0);
    word-wrap: break-word;
    flex: 1;
  }

  .log-entry.error .message {
    color: #ff4444;
  }

  .log-entry.warning .message {
    color: #ffb800;
  }

  /* Custom scrollbar */
  .log-output::-webkit-scrollbar {
    width: 8px;
  }

  .log-output::-webkit-scrollbar-track {
    background: var(--bg-primary, #1a1a1a);
  }

  .log-output::-webkit-scrollbar-thumb {
    background: var(--border-color, #444);
    border-radius: 4px;
  }

  .log-output::-webkit-scrollbar-thumb:hover {
    background: var(--accent-color, #00ff41);
  }
</style>