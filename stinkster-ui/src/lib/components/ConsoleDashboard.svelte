<!--
  ConsoleDashboard Component
  Complete dashboard using all mission console components
  Matches the working HTML dashboard functionality
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import type { MissionCard, NavigationEvent } from '../types/missions';
  import { MISSION_THEMES } from '../types/missions';
  import ConsoleBackground from './ConsoleBackground.svelte';
  import ConsoleHeader from './ConsoleHeader.svelte';
  import MissionGrid from './MissionGrid.svelte';

  // Mission data matching the original HTML dashboard
  const missions: MissionCard[] = [
    {
      id: 'kismet',
      title: 'Kismet WiFi',
      description: 'Wireless Network Discovery & Analysis',
      icon: `<svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
      </svg>`,
      color: MISSION_THEMES.blue.primary,
      glowColor: MISSION_THEMES.blue.glow,
      port: 8005,
      path: '/kismet-operations',
      shortcut: '1',
      status: 'online',
      enabled: true
    },
    {
      id: 'hackrf',
      title: 'HackRF Sweep',
      description: 'Software Defined Radio Operations',
      icon: `<svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>`,
      color: MISSION_THEMES.orange.primary,
      glowColor: MISSION_THEMES.orange.glow,
      port: 3002,
      shortcut: '2',
      status: 'online',
      enabled: true
    },
    {
      id: 'map',
      title: 'Tactical Map',
      description: 'Real-time Geospatial Intelligence',
      icon: `<svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>`,
      color: MISSION_THEMES.green.primary,
      glowColor: MISSION_THEMES.green.glow,
      port: 8005,
      path: '/map',
      shortcut: '3',
      status: 'warning',
      enabled: true
    },
    {
      id: 'wigle',
      title: 'WigletoTAK',
      description: 'Team Awareness Kit Integration',
      icon: `<svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>`,
      color: MISSION_THEMES.purple.primary,
      glowColor: MISSION_THEMES.purple.glow,
      port: 8000,
      shortcut: '4',
      status: 'offline',
      enabled: true
    },
    {
      id: 'docs',
      title: 'Documentation',
      description: 'System Operations Manual',
      icon: `<svg fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>`,
      color: MISSION_THEMES.yellow.primary,
      glowColor: MISSION_THEMES.yellow.glow,
      port: 8005,
      path: '/navigation',
      shortcut: '5',
      status: 'online',
      enabled: true
    }
  ];

  // Mission launch handler
  function launchMission(mission: MissionCard) {
    const hostname = window.location.hostname;
    const port = mission.port || 8005;
    const path = mission.path || '';
    const url = `http://${hostname}:${port}${path}`;
    
    console.log(`Launching ${mission.id} at: ${url}`);
    
    // Create navigation event
    const navigationEvent: NavigationEvent = {
      mission,
      url,
      timestamp: Date.now(),
      target: '_blank'
    };
    
    // Dispatch custom event for tracking
    window.dispatchEvent(new CustomEvent('mission-launch', { detail: navigationEvent }));
    
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        console.error('Failed to open window - popup blocked?');
        alert(`Please allow popups or manually navigate to: ${url}`);
      }
    } catch (error) {
      console.error('Error opening window:', error);
      alert(`Error opening mission. Please manually navigate to: ${url}`);
    }
  }

  onMount(() => {
    console.log('Argus Console Dashboard loaded successfully');
  });
</script>

<div class="console-wrapper min-h-screen relative bg-background-primary text-text-primary 
            font-sans leading-relaxed overflow-x-hidden overflow-y-auto">
  
  <!-- Animated Background -->
  <ConsoleBackground />
  
  <!-- Header -->
  <ConsoleHeader />
  
  <!-- Mission Grid -->
  <MissionGrid {missions} onMissionClick={launchMission} />
  
  <!-- Footer -->
  <footer class="console-footer py-6 text-center backdrop-blur-md border-t border-border mt-8"
          style="background: rgba(10, 10, 10, 0.8);">
    <p class="footer-text font-mono text-xs text-text-tertiary uppercase tracking-wider">
      ◆ Argus Console v1.0 - Tactical Intelligence Operations ◆
    </p>
  </footer>
</div>

<style>
  /* Global styles for the dashboard */
  :global(.console-wrapper) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  :global(.console-wrapper *) {
    box-sizing: border-box;
  }
</style>