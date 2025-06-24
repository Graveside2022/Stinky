<!--
  MissionCard Component
  Individual mission card with hover effects, animations, and status badges
  Converted from working HTML dashboard CSS to Tailwind utilities
-->

<script lang="ts">
  import type { MissionCard } from '../types/missions';

  export let mission: MissionCard;
  export let onClick: (mission: MissionCard) => void = () => {};

  function handleClick() {
    onClick(mission);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  // Get status badge classes
  $: statusBadgeClass = {
    online: 'bg-[#00d2ff] shadow-[0_0_10px_rgba(0,210,255,0.5)] animate-pulse-subtle',
    warning: 'bg-[#fbbf24] shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse-subtle',
    offline: 'bg-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.5)]'
  }[mission.status];
</script>

<div 
  class="mission-card group relative cursor-pointer 
         bg-background-secondary/80 backdrop-blur-md 
         border-2 border-border rounded-2xl 
         p-12 text-center transition-all duration-300 
         min-h-[220px] flex flex-col justify-center items-center
         hover:transform hover:-translate-y-2 hover:scale-[1.02]
         hover:border-[{mission.color}]
         active:transform active:-translate-y-1 active:scale-[0.98]"
  style="--mission-color: {mission.color}; --mission-glow: {mission.glowColor};"
  tabindex="0"
  role="button"
  aria-label="Launch {mission.title}"
  on:click={handleClick}
  on:keydown={handleKeydown}
>
  <!-- Status Badge -->
  <div class="absolute top-4 left-4 w-3 h-3 rounded-full {statusBadgeClass}"></div>

  <!-- Keyboard Shortcut -->
  <div class="absolute top-4 right-4 w-8 h-8 
              border border-[{mission.color}] rounded-md 
              flex items-center justify-center 
              font-mono text-xs font-semibold 
              text-[{mission.color}] 
              bg-[{mission.color}]/10
              transition-all duration-300
              group-hover:bg-[{mission.color}] 
              group-hover:text-background-primary 
              group-hover:scale-110">
    {mission.shortcut}
  </div>

  <!-- Mission Icon -->
  <div class="mission-icon w-16 h-16 mb-6 
              text-[{mission.color}] 
              transition-all duration-300
              group-hover:scale-110"
       style="filter: drop-shadow(0 0 10px {mission.glowColor}); 
              transition: filter 0.3s ease, transform 0.3s ease;"
       class:group-hover:drop-shadow-glow-enhanced={true}>
    {@html mission.icon}
  </div>

  <!-- Mission Title -->
  <h2 class="mission-title text-2xl font-bold text-white mb-2 
             transition-colors duration-300
             group-hover:text-[{mission.color}]">
    {mission.title}
  </h2>

  <!-- Mission Description -->
  <p class="mission-desc text-sm text-text-secondary 
            font-mono uppercase tracking-wide">
    {mission.description}
  </p>

  <!-- Top border glow effect -->
  <div class="absolute top-0 left-0 right-0 h-0.5 
              bg-gradient-to-r from-transparent via-[{mission.color}] to-transparent 
              opacity-0 transition-opacity duration-300
              group-hover:opacity-100"></div>

  <!-- Card hover glow -->
  <div class="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300
              group-hover:opacity-100 -z-10"
       style="box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px {mission.glowColor};"></div>
</div>

<style>
  .group-hover\:drop-shadow-glow-enhanced:hover {
    filter: drop-shadow(0 0 20px var(--mission-glow));
  }

  .animate-pulse-subtle {
    animation: status-pulse 2s ease-in-out infinite;
  }

  @keyframes status-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
</style>