<script lang="ts">
  export let value: number = 0; // 0-100
  export let max: number = 100;
  export let showPercentage: boolean = false;
  export let variant: 'blue' | 'green' | 'orange' | 'purple' = 'blue';
  export let height: number = 8;
  export let animated: boolean = true;
  
  // Calculate percentage
  $: percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  interface ColorScheme {
    bg: string;
    fill: string;
    text: string;
  }
  
  const colorSchemes: Record<string, ColorScheme> = {
    blue: {
      bg: 'bg-blue-900/30',
      fill: 'from-blue-600 to-blue-400',
      text: 'text-blue-400'
    },
    green: {
      bg: 'bg-green-900/30',
      fill: 'from-green-600 to-green-400',
      text: 'text-green-400'
    },
    orange: {
      bg: 'bg-orange-900/30',
      fill: 'from-orange-600 to-orange-400',
      text: 'text-orange-400'
    },
    purple: {
      bg: 'bg-purple-900/30',
      fill: 'from-purple-600 to-purple-400',
      text: 'text-purple-400'
    }
  };
  
  $: scheme = colorSchemes[variant];
</script>

<div class="progress-container">
  <div 
    class="relative w-full rounded-full overflow-hidden {scheme.bg}"
    style="height: {height}px"
  >
    <div 
      class="h-full bg-gradient-to-r {scheme.fill} rounded-full shadow-lg"
      class:transition-all={animated}
      class:duration-500={animated}
      class:ease-out={animated}
      style="width: {percentage}%"
    >
      {#if percentage > 0}
        <div class="absolute inset-0 bg-white/10 animate-shimmer" />
      {/if}
    </div>
  </div>
  
  {#if showPercentage}
    <div class="mt-1 text-right">
      <span class="text-sm font-medium {scheme.text}">
        {Math.round(percentage)}%
      </span>
    </div>
  {/if}
</div>

<style>
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 2s infinite;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
  }
</style>