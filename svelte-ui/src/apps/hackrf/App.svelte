<script>
  import SpectrumAnalyzer from './SpectrumAnalyzer.svelte';
  import './styles/app.css';
</script>

<main>
  <SpectrumAnalyzer />
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: var(--bg-primary, #1a1a1a);
    color: var(--text-primary, #e0e0e0);
  }

  :global(*) {
    box-sizing: border-box;
  }

  main {
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
</style>