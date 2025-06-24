<script lang="ts">
  import { Button, Card, Panel, StatusIndicator, GridLayout, ResizablePanel, ThemeToggle } from './index';
  
  let showPanel = $state(true);
</script>

<div class="min-h-screen bg-surface-50 dark:bg-surface-900 p-8">
  <div class="max-w-7xl mx-auto space-y-8">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100">
        Stinkster UI Components
      </h1>
      <ThemeToggle variant="dropdown" showLabel={true} />
    </div>
    
    <!-- Buttons Section -->
    <Card>
      <h2 class="text-xl font-semibold mb-4">Buttons</h2>
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        
        <div class="flex flex-wrap gap-2 items-center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>
    </Card>
    
    <!-- Status Indicators Section -->
    <Card variant="bordered">
      <h2 class="text-xl font-semibold mb-4">Status Indicators</h2>
      <div class="space-y-2">
        <StatusIndicator status="online" showLabel={true} />
        <StatusIndicator status="offline" showLabel={true} />
        <StatusIndicator status="warning" showLabel={true} />
        <StatusIndicator status="error" showLabel={true} />
        <StatusIndicator status="idle" showLabel={true} />
      </div>
      
      <div class="mt-4 flex gap-4">
        <StatusIndicator status="online" size="sm" />
        <StatusIndicator status="online" size="md" />
        <StatusIndicator status="online" size="lg" />
      </div>
    </Card>
    
    <!-- Grid Layout Section -->
    <Panel title="Grid Layout" collapsible={true}>
      <GridLayout cols={3} gap="md">
        <Card variant="elevated" padding="sm">
          <h3 class="font-semibold">Card 1</h3>
          <p class="text-sm text-surface-600 dark:text-surface-400">Grid item content</p>
        </Card>
        <Card variant="elevated" padding="sm">
          <h3 class="font-semibold">Card 2</h3>
          <p class="text-sm text-surface-600 dark:text-surface-400">Grid item content</p>
        </Card>
        <Card variant="elevated" padding="sm">
          <h3 class="font-semibold">Card 3</h3>
          <p class="text-sm text-surface-600 dark:text-surface-400">Grid item content</p>
        </Card>
      </GridLayout>
    </Panel>
    
    <!-- Resizable Panel Section -->
    <div class="flex gap-4 h-64">
      <ResizablePanel direction="horizontal" minSize={200} maxSize={400} defaultSize={250}>
        <div class="p-4">
          <h3 class="font-semibold mb-2">Resizable Panel</h3>
          <p class="text-sm text-surface-600 dark:text-surface-400">
            Drag the right edge to resize this panel horizontally.
          </p>
        </div>
      </ResizablePanel>
      
      <Card class="flex-1">
        <h3 class="font-semibold mb-2">Main Content</h3>
        <p class="text-sm text-surface-600 dark:text-surface-400">
          This content adapts to the available space.
        </p>
      </Card>
    </div>
    
    <!-- Card Variants -->
    <GridLayout cols={3} gap="md">
      <Card variant="default">
        <h3 class="font-semibold mb-2">Default Card</h3>
        <p class="text-sm text-surface-600 dark:text-surface-400">Basic card style</p>
      </Card>
      <Card variant="elevated">
        <h3 class="font-semibold mb-2">Elevated Card</h3>
        <p class="text-sm text-surface-600 dark:text-surface-400">With shadow effect</p>
      </Card>
      <Card variant="bordered">
        <h3 class="font-semibold mb-2">Bordered Card</h3>
        <p class="text-sm text-surface-600 dark:text-surface-400">With border styling</p>
      </Card>
    </GridLayout>
  </div>
</div>