<script lang="ts">
  import { theme, type Theme } from '$lib/stores/theme';
  import Button from './Button.svelte';
  
  interface ThemeToggleProps {
    showLabel?: boolean;
    variant?: 'button' | 'dropdown';
  }
  
  let {
    showLabel = false,
    variant = 'button'
  }: ThemeToggleProps = $props();
  
  let showDropdown = $state(false);
  
  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' }
  ];
  
  function cycleTheme() {
    theme.update((current) => {
      const currentIndex = themes.findIndex(t => t.value === current);
      const nextIndex = (currentIndex + 1) % themes.length;
      return themes[nextIndex]!.value;
    });
  }
  
  function selectTheme(newTheme: Theme) {
    theme.set(newTheme);
    showDropdown = false;
  }
  
  const currentTheme = $derived(themes.find(t => t.value === $theme) || themes[2]!);
</script>

{#if variant === 'button'}
  <Button
    variant="ghost"
    size="sm"
    onclick={cycleTheme}
    aria-label="Toggle theme"
  >
    <span class="text-lg">{currentTheme.icon}</span>
    {#if showLabel}
      <span class="ml-2">{currentTheme.label}</span>
    {/if}
  </Button>
{:else}
  <div class="relative">
    <Button
      variant="ghost"
      size="sm"
      onclick={() => showDropdown = !showDropdown}
      aria-label="Select theme"
      aria-expanded={showDropdown}
    >
      <span class="text-lg">{currentTheme.icon}</span>
      {#if showLabel}
        <span class="ml-2">{currentTheme.label}</span>
      {/if}
      <svg
        class="w-4 h-4 ml-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </Button>
    
    {#if showDropdown}
      <div class="absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-surface-100 dark:bg-surface-800 ring-1 ring-surface-200 dark:ring-surface-700 z-50">
        <div class="py-1">
          {#each themes as themeOption}
            <button
              class="flex items-center w-full px-4 py-2 text-sm text-surface-700 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              class:bg-surface-200={$theme === themeOption.value}
              class:dark:bg-surface-700={$theme === themeOption.value}
              onclick={() => selectTheme(themeOption.value)}
            >
              <span class="text-lg mr-2">{themeOption.icon}</span>
              {themeOption.label}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}