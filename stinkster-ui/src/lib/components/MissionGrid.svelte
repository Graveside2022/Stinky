<!--
  MissionGrid Component
  Responsive grid container for mission cards with keyboard shortcuts
  Converted from working HTML dashboard CSS to Tailwind utilities
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MissionCard } from '../types/missions';
  import MissionCardComponent from './MissionCard.svelte';

  export let missions: MissionCard[] = [];
  export let onMissionClick: (mission: MissionCard) => void = () => {};

  // Keyboard shortcut handling
  function handleKeydown(event: KeyboardEvent) {
    const shortcuts: Record<string, MissionCard | undefined> = {
      '1': missions.find(m => m.shortcut === '1'),
      '2': missions.find(m => m.shortcut === '2'),
      '3': missions.find(m => m.shortcut === '3'),
      '4': missions.find(m => m.shortcut === '4'),
      '5': missions.find(m => m.shortcut === '5'),
    };

    const mission = shortcuts[event.key];
    if (mission && mission.enabled) {
      event.preventDefault();
      onMissionClick(mission);
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="mission-grid 
            grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] 
            gap-12 max-w-[1000px] mx-auto my-16 px-8
            md:gap-8 md:my-8
            sm:grid-cols-1 sm:gap-8">
  {#each missions as mission (mission.id)}
    <MissionCardComponent 
      {mission} 
      onClick={onMissionClick} 
    />
  {/each}
</div>

<style>
  /* Responsive adjustments for smaller screens */
  @media (max-width: 768px) {
    .mission-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
      margin-top: 2rem;
      margin-bottom: 2rem;
    }
  }
</style>