<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let variant: 'orange' | 'cyan' | 'purple' = 'orange';
  export let unit: string = '';
  
  interface ColorConfig {
    bg: string;
    border: string;
    hoverBorder: string;
    label: string;
    value: string;
  }
  
  const colorConfigs: Record<string, ColorConfig> = {
    orange: {
      bg: 'from-orange-900/20 to-amber-900/20',
      border: 'border-orange-900/30',
      hoverBorder: 'hover:border-orange-700/50',
      label: 'text-orange-400',
      value: 'text-orange-100'
    },
    cyan: {
      bg: 'from-cyan-900/20 to-teal-900/20',
      border: 'border-cyan-900/30',
      hoverBorder: 'hover:border-cyan-700/50',
      label: 'text-cyan-400',
      value: 'text-cyan-100'
    },
    purple: {
      bg: 'from-purple-900/20 to-pink-900/20',
      border: 'border-purple-900/30',
      hoverBorder: 'hover:border-purple-700/50',
      label: 'text-purple-400',
      value: 'text-purple-100'
    }
  };
  
  $: config = colorConfigs[variant];
</script>

<div class="metric-card bg-gradient-to-br {config.bg} rounded-lg p-4 border {config.border} {config.hoverBorder} transition-all duration-300 hover:shadow-lg">
  <div class="space-y-1">
    <p class="text-xs font-medium {config.label} uppercase tracking-wider">
      {label}
    </p>
    <p class="text-2xl font-bold {config.value}">
      {value}{unit}
    </p>
  </div>
</div>

<style>
  .metric-card {
    backdrop-filter: blur(10px);
  }
</style>