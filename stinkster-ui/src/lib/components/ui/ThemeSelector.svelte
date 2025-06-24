<script lang="ts">
  import { theme, type Theme } from '$lib/stores/theme';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  
  interface ThemeSelectorProps {
    variant?: 'inline' | 'card' | 'compact';
    showLabels?: boolean;
    showPreview?: boolean;
    class?: string;
  }
  
  let {
    variant = 'inline',
    showLabels = true,
    showPreview = false,
    class: className = ''
  }: ThemeSelectorProps = $props();
  
  const themes: { 
    value: Theme; 
    label: string; 
    icon: string; 
    description: string;
    preview: { bg: string; text: string; accent: string };
  }[] = [
    { 
      value: 'light', 
      label: 'Light', 
      icon: '☀️',
      description: 'Light theme with bright colors',
      preview: { bg: 'bg-white', text: 'text-gray-900', accent: 'bg-blue-500' }
    },
    { 
      value: 'dark', 
      label: 'Dark', 
      icon: '🌙',
      description: 'Dark theme with muted colors',
      preview: { bg: 'bg-gray-900', text: 'text-white', accent: 'bg-blue-400' }
    },
    { 
      value: 'system', 
      label: 'System', 
      icon: '💻',
      description: 'Follows system preference',
      preview: { bg: 'bg-gradient-to-r from-white to-gray-900', text: 'text-gray-700', accent: 'bg-blue-500' }
    }
  ];
  
  function selectTheme(newTheme: Theme) {
    theme.set(newTheme);
  }
  
  const currentTheme = $derived($theme);
</script>

{#if variant === 'card'}
  <Card class="p-4 {className}">
    <h3 class="text-lg font-semibold mb-4">Theme Preferences</h3>
    <div class="grid gap-3">
      {#each themes as themeOption}
        <button
          class="flex items-center p-3 rounded-lg border-2 transition-all duration-200 hover:bg-surface-100 dark:hover:bg-surface-800"
          class:border-primary-500={currentTheme === themeOption.value}
          class:bg-primary-50={currentTheme === themeOption.value}
          class:dark:bg-primary-950={currentTheme === themeOption.value}
          class:border-surface-200={currentTheme !== themeOption.value}
          class:dark:border-surface-700={currentTheme !== themeOption.value}
          onclick={() => selectTheme(themeOption.value)}
          aria-pressed={currentTheme === themeOption.value}
        >
          <span class="text-2xl mr-3">{themeOption.icon}</span>
          <div class="flex-1 text-left">
            <div class="font-medium">{themeOption.label}</div>
            <div class="text-sm text-surface-600 dark:text-surface-400">{themeOption.description}</div>
          </div>
          {#if showPreview}
            <div class="flex space-x-1 ml-3">
              <div class="w-3 h-3 rounded {themeOption.preview.bg} border border-surface-300"></div>
              <div class="w-3 h-3 rounded {themeOption.preview.accent}"></div>
            </div>
          {/if}
          {#if currentTheme === themeOption.value}
            <svg
              class="w-5 h-5 ml-2 text-primary-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  </Card>
{:else if variant === 'compact'}
  <div class="flex rounded-lg bg-surface-200 dark:bg-surface-700 p-1 {className}">
    {#each themes as themeOption}
      <Button
        variant={currentTheme === themeOption.value ? 'primary' : 'ghost'}
        size="sm"
        onclick={() => selectTheme(themeOption.value)}
        class="flex-1 justify-center"
        aria-pressed={currentTheme === themeOption.value}
        title={themeOption.description}
      >
        <span class="text-lg">{themeOption.icon}</span>
        {#if showLabels}
          <span class="ml-1 text-xs">{themeOption.label}</span>
        {/if}
      </Button>
    {/each}
  </div>
{:else}
  <!-- Inline variant -->
  <div class="flex flex-wrap gap-2 {className}">
    {#each themes as themeOption}
      <Button
        variant={currentTheme === themeOption.value ? 'primary' : 'outline'}
        size="sm"
        onclick={() => selectTheme(themeOption.value)}
        class="flex items-center gap-2"
        aria-pressed={currentTheme === themeOption.value}
      >
        <span class="text-lg">{themeOption.icon}</span>
        {#if showLabels}
          <span>{themeOption.label}</span>
        {/if}
      </Button>
    {/each}
  </div>
{/if}