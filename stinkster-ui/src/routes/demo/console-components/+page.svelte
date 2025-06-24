<!--
  Console Components Demo Page
  Showcases individual components from the converted HTML dashboard
-->

<script>
  import { 
    ConsoleBackground, 
    ConsoleHeader, 
    MissionCard, 
    MissionGrid 
  } from '$lib/components';
  import { MISSION_THEMES } from '$lib/types/missions';

  // Example mission for single card demo
  const exampleMission = {
    id: 'demo',
    title: 'Demo Mission',
    description: 'Component Demonstration',
    icon: `<svg fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>`,
    color: MISSION_THEMES.blue.primary,
    glowColor: MISSION_THEMES.blue.glow,
    shortcut: '1',
    status: 'online',
    enabled: true
  };

  // Example missions for grid demo
  const demoMissions = [
    { ...exampleMission, id: 'demo1', title: 'Mission Alpha', shortcut: '1', color: MISSION_THEMES.blue.primary, glowColor: MISSION_THEMES.blue.glow },
    { ...exampleMission, id: 'demo2', title: 'Mission Beta', shortcut: '2', color: MISSION_THEMES.orange.primary, glowColor: MISSION_THEMES.orange.glow, status: 'warning' },
    { ...exampleMission, id: 'demo3', title: 'Mission Gamma', shortcut: '3', color: MISSION_THEMES.green.primary, glowColor: MISSION_THEMES.green.glow, status: 'offline' }
  ];

  function handleMissionClick(mission) {
    alert(`Mission ${mission.title} clicked!`);
  }
</script>

<svelte:head>
  <title>Console Components Demo</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-background-primary text-text-primary relative">
  
  <!-- Background for all demos -->
  <ConsoleBackground />
  
  <div class="relative z-10 p-8 space-y-16">
    
    <!-- Page Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold mb-4">Console Components Demo</h1>
      <p class="text-text-secondary">Individual component demonstrations from the converted HTML dashboard</p>
    </div>

    <!-- Console Header Demo -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">ConsoleHeader Component</h2>
      <div class="border border-border rounded-lg overflow-hidden">
        <ConsoleHeader />
      </div>
    </section>

    <!-- Single Mission Card Demo -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">MissionCard Component</h2>
      <p class="text-text-secondary text-sm">Individual mission card with hover effects and status indicators</p>
      <div class="flex justify-center">
        <div class="w-80">
          <MissionCard mission={exampleMission} onClick={handleMissionClick} />
        </div>
      </div>
    </section>

    <!-- Mission Cards with Different States -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">Mission Card States</h2>
      <p class="text-text-secondary text-sm">Different status indicators and color schemes</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {#each demoMissions as mission}
          <MissionCard {mission} onClick={handleMissionClick} />
        {/each}
      </div>
    </section>

    <!-- Mission Grid Demo -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">MissionGrid Component</h2>
      <p class="text-text-secondary text-sm">Responsive grid with keyboard shortcuts (press 1, 2, or 3)</p>
      <MissionGrid missions={demoMissions} onMissionClick={handleMissionClick} />
    </section>

    <!-- Component Features -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">Features Converted</h2>
      <div class="bg-background-secondary/50 backdrop-blur-md border border-border rounded-lg p-6">
        <ul class="space-y-2 text-sm">
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Responsive grid layout with auto-fit columns
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Hover effects with smooth transitions and scaling
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Status badges with pulsing animations
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Keyboard shortcuts (1-5) with visual indicators
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Animated background with grid overlay
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Tailwind CSS classes instead of custom CSS
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            TypeScript interfaces for mission data
          </li>
          <li class="flex items-center gap-2">
            <span class="w-2 h-2 bg-status-success rounded-full"></span>
            Accessible with ARIA labels and keyboard navigation
          </li>
        </ul>
      </div>
    </section>

    <!-- Usage Example -->
    <section class="space-y-4">
      <h2 class="text-2xl font-semibold">Usage Example</h2>
      <div class="bg-background-secondary/50 backdrop-blur-md border border-border rounded-lg p-6">
        <pre class="text-sm text-text-secondary overflow-x-auto"><code>{`<script>
  import { ConsoleDashboard } from '$lib/components';
</script>

<ConsoleDashboard />

<!-- Or use individual components -->
<script>
  import { 
    ConsoleBackground, 
    ConsoleHeader, 
    MissionGrid 
  } from '$lib/components';
  
  const missions = [
    {
      id: 'kismet',
      title: 'Kismet WiFi',
      description: 'Wireless Network Discovery',
      icon: '<svg>...</svg>',
      color: '#00d2ff',
      glowColor: 'rgba(0, 210, 255, 0.3)',
      shortcut: '1',
      status: 'online',
      enabled: true
    }
  ];
</script>

<div class="console-wrapper">
  <ConsoleBackground />
  <ConsoleHeader />
  <MissionGrid {missions} onMissionClick={handleClick} />
</div>`}</code></pre>
      </div>
    </section>

    <!-- Footer -->
    <footer class="text-center py-8 border-t border-border">
      <p class="text-text-tertiary text-sm font-mono">
        ◆ Components converted from working HTML dashboard to SvelteKit + Tailwind CSS ◆
      </p>
    </footer>

  </div>
</div>