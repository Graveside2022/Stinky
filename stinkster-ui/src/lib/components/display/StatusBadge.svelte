<script lang="ts">
  export let status: 'online' | 'offline' | 'warning' | 'error' = 'offline';
  export let label: string = '';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let pulse: boolean = false;
  
  interface StatusConfig {
    dotColor: string;
    glowColor: string;
    textColor: string;
  }
  
  const statusConfigs: Record<string, StatusConfig> = {
    online: {
      dotColor: 'bg-green-500',
      glowColor: 'shadow-green-500/50',
      textColor: 'text-green-400'
    },
    offline: {
      dotColor: 'bg-gray-500',
      glowColor: 'shadow-gray-500/50',
      textColor: 'text-gray-400'
    },
    warning: {
      dotColor: 'bg-yellow-500',
      glowColor: 'shadow-yellow-500/50',
      textColor: 'text-yellow-400'
    },
    error: {
      dotColor: 'bg-red-500',
      glowColor: 'shadow-red-500/50',
      textColor: 'text-red-400'
    }
  };
  
  const sizeConfigs = {
    sm: { dot: 'w-2 h-2', text: 'text-xs' },
    md: { dot: 'w-3 h-3', text: 'text-sm' },
    lg: { dot: 'w-4 h-4', text: 'text-base' }
  };
  
  $: config = statusConfigs[status];
  $: sizeConfig = sizeConfigs[size];
</script>

<div class="inline-flex items-center gap-2">
  <div class="relative">
    <div 
      class="{sizeConfig.dot} rounded-full {config.dotColor} shadow-lg {config.glowColor}"
      class:pulse-animation={pulse && (status === 'online' || status === 'warning')}
    />
    {#if pulse && (status === 'online' || status === 'warning')}
      <div 
        class="absolute inset-0 {sizeConfig.dot} rounded-full {config.dotColor} animate-ping"
      />
    {/if}
  </div>
  
  {#if label}
    <span class="{sizeConfig.text} font-medium {config.textColor}">
      {label}
    </span>
  {/if}
</div>

<style>
  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }
  
  .pulse-animation {
    animation: pulse-glow 2s ease-in-out infinite;
  }
</style>