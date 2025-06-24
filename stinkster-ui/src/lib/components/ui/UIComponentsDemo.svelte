<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import Modal from './Modal.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import ThemeSelector from './ThemeSelector.svelte';
  import Toast from './Toast.svelte';
  import Badge from './Badge.svelte';
  
  let showModal = $state(false);
  let showToast = $state(false);
  let toastType: 'success' | 'error' | 'warning' | 'info' = $state('success');
  let loadingState = $state(false);
  
  function showToastDemo(type: 'success' | 'error' | 'warning' | 'info') {
    toastType = type;
    showToast = true;
    // Auto-hide toast after showing it
    setTimeout(() => {
      showToast = false;
    }, 100);
  }
  
  function simulateLoading() {
    loadingState = true;
    setTimeout(() => {
      loadingState = false;
    }, 3000);
  }
</script>

<div class="max-w-6xl mx-auto p-6 space-y-8">
  <div class="text-center mb-8">
    <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100 mb-2">
      UI Components Demo
    </h1>
    <p class="text-surface-600 dark:text-surface-400">
      Showcase of all available UI components with their variants and functionality
    </p>
  </div>

  <!-- Theme Selector -->
  <Card>
    <h2 class="text-xl font-semibold mb-4">Theme Selector</h2>
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Inline variant</h3>
        <ThemeSelector variant="inline" />
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Compact variant</h3>
        <ThemeSelector variant="compact" />
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Card variant</h3>
        <ThemeSelector variant="card" showPreview={true} />
      </div>
    </div>
  </Card>

  <!-- Buttons -->
  <Card>
    <h2 class="text-xl font-semibold mb-4">Buttons</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Variants</h3>
        <div class="space-y-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Sizes</h3>
        <div class="space-y-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">States</h3>
        <div class="space-y-2">
          <Button disabled>Disabled</Button>
          <Button onclick={() => showModal = true}>Open Modal</Button>
          <Button onclick={simulateLoading}>
            {#if loadingState}
              <LoadingSpinner size="sm" color="surface" />
            {:else}
              Simulate Loading
            {/if}
          </Button>
        </div>
      </div>
    </div>
  </Card>

  <!-- Status Badges -->
  <Card>
    <h2 class="text-xl font-semibold mb-4">Status Badges</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatusBadge status="online" />
      <StatusBadge status="offline" />
      <StatusBadge status="error" />
      <StatusBadge status="warning" />
      <StatusBadge status="loading" />
      <StatusBadge status="idle" />
    </div>
    <div class="mt-4">
      <h3 class="text-sm font-medium mb-2">Without dots</h3>
      <div class="flex flex-wrap gap-2">
        <StatusBadge status="online" showDot={false} />
        <StatusBadge status="error" showDot={false} />
        <StatusBadge status="warning" showDot={false} />
      </div>
    </div>
  </Card>

  <!-- Loading Spinners -->
  <Card>
    <h2 class="text-xl font-semibold mb-4">Loading Spinners</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div>
        <h3 class="text-sm font-medium mb-2">Default</h3>
        <div class="flex items-center gap-2">
          <LoadingSpinner size="xs" />
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" />
          <LoadingSpinner size="lg" />
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Dots</h3>
        <div class="flex items-center gap-2">
          <LoadingSpinner variant="dots" size="xs" />
          <LoadingSpinner variant="dots" size="sm" />
          <LoadingSpinner variant="dots" size="md" />
          <LoadingSpinner variant="dots" size="lg" />
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Pulse</h3>
        <div class="flex items-center gap-2">
          <LoadingSpinner variant="pulse" size="xs" />
          <LoadingSpinner variant="pulse" size="sm" />
          <LoadingSpinner variant="pulse" size="md" />
          <LoadingSpinner variant="pulse" size="lg" />
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Bars</h3>
        <div class="flex items-center gap-2">
          <LoadingSpinner variant="bars" size="xs" />
          <LoadingSpinner variant="bars" size="sm" />
          <LoadingSpinner variant="bars" size="md" />
          <LoadingSpinner variant="bars" size="lg" />
        </div>
      </div>
    </div>
  </Card>

  <!-- Badges -->
  <Card>
    <h2 class="text-xl font-semibold mb-4">Badges</h2>
    <div class="space-y-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Variants</h3>
        <div class="flex flex-wrap gap-2">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Sizes</h3>
        <div class="flex flex-wrap items-center gap-2">
          <Badge size="xs">Extra Small</Badge>
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Rounded</h3>
        <div class="flex flex-wrap gap-2">
          <Badge variant="primary" rounded>12</Badge>
          <Badge variant="success" rounded>✓</Badge>
          <Badge variant="error" rounded>!</Badge>
        </div>
      </div>
    </div>
  </Card>

  <!-- Toast Demo -->
  <Card>
    <h2 class="text-xl font-semibold mb-4">Toast Notifications</h2>
    <div class="flex flex-wrap gap-2">
      <Button onclick={() => showToastDemo('success')}>Success Toast</Button>
      <Button onclick={() => showToastDemo('error')}>Error Toast</Button>
      <Button onclick={() => showToastDemo('warning')}>Warning Toast</Button>
      <Button onclick={() => showToastDemo('info')}>Info Toast</Button>
    </div>
  </Card>

  <!-- Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card variant="default">
      <h3 class="text-lg font-semibold mb-2">Default Card</h3>
      <p class="text-surface-600 dark:text-surface-400">
        This is a default card with standard styling.
      </p>
    </Card>
    
    <Card variant="elevated">
      <h3 class="text-lg font-semibold mb-2">Elevated Card</h3>
      <p class="text-surface-600 dark:text-surface-400">
        This card has an elevated shadow effect.
      </p>
    </Card>
    
    <Card variant="bordered">
      <h3 class="text-lg font-semibold mb-2">Bordered Card</h3>
      <p class="text-surface-600 dark:text-surface-400">
        This card has a visible border.
      </p>
    </Card>
  </div>
</div>

<!-- Modal Demo -->
<Modal
  isOpen={showModal}
  onclose={() => showModal = false}
  title="Demo Modal"
  size="md"
>
  <div class="space-y-4">
    <p>This is a demo modal showing the modal component functionality.</p>
    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={() => showModal = false}>Cancel</Button>
      <Button variant="primary" onclick={() => showModal = false}>Confirm</Button>
    </div>
  </div>
</Modal>

<!-- Toast Demo -->
{#if showToast}
  <Toast
    type={toastType}
    title="Demo Notification"
    message="This is a demo toast notification showing the {toastType} variant."
    onclose={() => showToast = false}
    actions={[
      { label: 'Action', onclick: () => console.log('Toast action clicked') }
    ]}
  />
{/if}