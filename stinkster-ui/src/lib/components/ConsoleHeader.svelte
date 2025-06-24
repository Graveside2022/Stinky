<!--
  ConsoleHeader Component
  Header with title, subtitle, and animated status text
  Converted from working HTML dashboard CSS to Tailwind utilities
-->

<script lang="ts">
  export let title = 'Argus';
  export let titleAccent = 'Console';
  export let subtitle = 'Tactical Intelligence Platform';
  export let status = '◆ Select Mission Parameters ◆';
</script>

<header class="console-header text-center py-12 px-8 backdrop-blur-xl border-b border-border" 
        style="background: rgba(20, 20, 20, 0.6);">
  <h1 class="console-title text-5xl font-extrabold mb-2 drop-shadow-2xl"
      style="text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);">
    <span class="title-main text-white">{title}</span>
    <span class="title-accent text-[#fb923c]">{titleAccent}</span>
  </h1>
  
  <p class="console-subtitle font-mono text-sm uppercase tracking-widest text-text-secondary mb-4">
    {subtitle}
  </p>
  
  <p class="mission-status font-mono text-xs text-[#00d2ff] uppercase tracking-wider animate-pulse-subtle">
    {status}
  </p>
</header>

<style>
  .animate-pulse-subtle {
    animation: status-blink 2s ease-in-out infinite;
  }

  @keyframes status-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.5; }
  }
</style>