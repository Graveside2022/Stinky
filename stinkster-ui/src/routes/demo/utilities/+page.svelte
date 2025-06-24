<script lang="ts">
  import { Badge, Tooltip } from '$lib/components/ui';
  import { AlertCircle, Wifi, Zap, Shield } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { stagger, transitions } from '$lib/utils/animations';
  import { createGlowEffect, colorPresets } from '$lib/utils/theme';
  
  let badges = [
    { id: 1, text: 'Online', variant: 'success' },
    { id: 2, text: 'Warning', variant: 'warning' },
    { id: 3, text: 'Error', variant: 'error' },
    { id: 4, text: 'Info', variant: 'info' }
  ];
  
  function removeBadge(id: number) {
    badges = badges.filter(b => b.id !== id);
  }
  
  const glowStyle = `box-shadow: ${createGlowEffect(colorPresets.neonGreen, 0.5)}`;
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
  <h1 class="text-4xl font-bold mb-8 text-primary-300">
    Utility Components Demo
  </h1>
  
  <!-- Badge Section -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-6 text-white">Badges</h2>
    
    <div class="space-y-6">
      <!-- Basic Badges -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">Basic Badges</h3>
        <div class="flex flex-wrap gap-3">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </div>
      
      <!-- Sizes -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">Sizes</h3>
        <div class="flex items-center gap-3">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </div>
      
      <!-- With Icons -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">With Icons</h3>
        <div class="flex flex-wrap gap-3">
          <Badge variant="success">
            <Wifi slot="icon" size={14} />
            Connected
          </Badge>
          <Badge variant="warning">
            <AlertCircle slot="icon" size={14} />
            Low Signal
          </Badge>
          <Badge variant="primary">
            <Zap slot="icon" size={14} />
            Active
          </Badge>
          <Badge variant="info">
            <Shield slot="icon" size={14} />
            Protected
          </Badge>
        </div>
      </div>
      
      <!-- Glow Effect -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">Glow Effect</h3>
        <div class="flex flex-wrap gap-3">
          <Badge variant="primary" glow>Glowing Primary</Badge>
          <Badge variant="success" glow>Glowing Success</Badge>
          <Badge variant="error" glow>Glowing Error</Badge>
        </div>
      </div>
      
      <!-- Closable -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">Closable Badges</h3>
        <div class="flex flex-wrap gap-3">
          {#each badges as badge (badge.id)}
            <div in:fly={transitions.slideIn(stagger(badge.id - 1))}>
              <Badge 
                variant={badge.variant} 
                closable 
                onClose={() => removeBadge(badge.id)}
              >
                {badge.text}
              </Badge>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
  
  <!-- Tooltip Section -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-6 text-white">Tooltips</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Placement -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">Placement Options</h3>
        <div class="flex gap-4 flex-wrap">
          <Tooltip content="This is a top tooltip" placement="top">
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Top
            </button>
          </Tooltip>
          
          <Tooltip content="This is a bottom tooltip" placement="bottom">
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Bottom
            </button>
          </Tooltip>
          
          <Tooltip content="This is a left tooltip" placement="left">
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Left
            </button>
          </Tooltip>
          
          <Tooltip content="This is a right tooltip" placement="right">
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Right
            </button>
          </Tooltip>
        </div>
      </div>
      
      <!-- Delay Options -->
      <div>
        <h3 class="text-lg font-medium mb-3 text-gray-300">Delay Options</h3>
        <div class="flex gap-4 flex-wrap">
          <Tooltip content="No delay" delay={0}>
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Instant
            </button>
          </Tooltip>
          
          <Tooltip content="500ms delay" delay={500}>
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Normal
            </button>
          </Tooltip>
          
          <Tooltip content="1000ms delay" delay={1000}>
            <button class="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
              Slow
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  </section>
  
  <!-- Animation Examples -->
  <section class="mb-12">
    <h2 class="text-2xl font-semibold mb-6 text-white">Animation Utilities</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        class="p-6 bg-gray-800/50 rounded-lg border border-gray-700"
        in:fade={transitions.fadeIn()}
      >
        <h3 class="text-lg font-medium mb-2 text-primary-300">Fade In</h3>
        <p class="text-gray-400">Smooth fade transition</p>
      </div>
      
      <div 
        class="p-6 bg-gray-800/50 rounded-lg border border-gray-700"
        in:fly={transitions.slideUp(200)}
      >
        <h3 class="text-lg font-medium mb-2 text-primary-300">Slide Up</h3>
        <p class="text-gray-400">Slide from bottom</p>
      </div>
      
      <div 
        class="p-6 bg-gray-800/50 rounded-lg border border-gray-700"
        style={glowStyle}
        in:fly={transitions.slideIn(400)}
      >
        <h3 class="text-lg font-medium mb-2 text-primary-300">Glow Effect</h3>
        <p class="text-gray-400">Dynamic glow shadow</p>
      </div>
    </div>
  </section>
  
  <!-- Theme Examples -->
  <section>
    <h2 class="text-2xl font-semibold mb-6 text-white">Theme Utilities</h2>
    
    <div class="space-y-4">
      <div class="p-4 bg-gray-800/50 rounded-lg">
        <h3 class="text-lg font-medium mb-2 text-primary-300">Color Presets</h3>
        <div class="flex gap-3 flex-wrap">
          {#each Object.entries(colorPresets) as [name, color]}
            <div class="text-center">
              <div 
                class="w-16 h-16 rounded-lg mb-2 border border-gray-700"
                style="background-color: {color}"
              ></div>
              <p class="text-xs text-gray-400">{name}</p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  @keyframes glow {
    0%, 100% { 
      filter: drop-shadow(0 0 10px currentColor) drop-shadow(0 0 20px currentColor);
    }
    50% { 
      filter: drop-shadow(0 0 20px currentColor) drop-shadow(0 0 40px currentColor);
    }
  }
  
  .animate-glow {
    animation: glow 2s ease-in-out infinite;
  }
</style>