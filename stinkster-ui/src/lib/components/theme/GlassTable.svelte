<script lang="ts">
  import type { Snippet } from 'svelte'
  
  interface Props {
    headers: string[]
    striped?: boolean
    hoverable?: boolean
    class?: string
    children: Snippet
  }
  
  let { 
    headers,
    striped = true,
    hoverable = true,
    class: className = '',
    children
  }: Props = $props()
</script>

<div class="glass-table-container {className}">
  <table class="glass-table {striped ? 'striped' : ''} {hoverable ? 'hoverable' : ''}">
    <thead>
      <tr>
        {#each headers as header}
          <th>{header}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {@render children()}
    </tbody>
  </table>
</div>

<style>
  .glass-table-container {
    background: rgba(20, 20, 30, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 255, 170, 0.2);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  .glass-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .glass-table thead {
    background: rgba(0, 255, 170, 0.05);
    border-bottom: 1px solid rgba(0, 255, 170, 0.2);
  }
  
  .glass-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.875rem;
    color: #00ffaa;
  }
  
  .glass-table :global(td) {
    padding: 0.75rem 1rem;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
  }
  
  .glass-table :global(tr) {
    border-bottom: 1px solid rgba(0, 255, 170, 0.1);
    transition: all 0.2s ease;
  }
  
  .glass-table :global(tbody tr:last-child) {
    border-bottom: none;
  }
  
  /* Striped rows */
  .glass-table.striped :global(tbody tr:nth-child(even)) {
    background: rgba(0, 255, 170, 0.02);
  }
  
  /* Hoverable rows */
  .glass-table.hoverable :global(tbody tr:hover) {
    background: rgba(0, 255, 170, 0.05);
    box-shadow: inset 0 0 20px rgba(0, 255, 170, 0.1);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .glass-table-container {
      overflow-x: auto;
    }
  }
</style>