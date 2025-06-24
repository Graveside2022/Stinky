<script lang="ts">
  import { 
    // UI Components
    Button, Card, GlassPanel, Input,
    // Display Components
    MetricCard, SignalIndicator, StatusBadge, ProgressBar,
    // Layout Components
    Header, MobileMenu, NavLink,
    // Form Components
    ControlSection, FrequencyItem, NumberInput, Select,
    // Feedback Components
    Alert, EmptyState, LoadingOverlay, LoadingSpinner,
    // Effect Components
    AnimatedBlobs, GeometricBackground, NeonGlow, ScanLine,
    // Special Components
    KismetFrame, StatusPanel
  } from '$lib/components';
  
  import { writable } from 'svelte/store';
  
  // Demo states
  let inputValue = '';
  let numberValue = 100;
  let selectValue = 'option1';
  let showMobileMenu = false;
  let showLoadingOverlay = false;
  let alertVisible = true;
  let progress = 65;
  let signalStrength = -45;
  
  // Theme switching
  let currentTheme = 'dark';
  
  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
  }
  
  // Demo data
  const metrics = [
    { label: 'Active Devices', value: '24', change: '+3', trend: 'up' },
    { label: 'Networks', value: '156', change: '+12', trend: 'up' },
    { label: 'Signal Strength', value: '-45 dBm', change: '-2', trend: 'down' },
    { label: 'Scan Rate', value: '120/s', change: '0', trend: 'neutral' }
  ];
  
  const statusTypes = ['success', 'warning', 'error', 'info', 'neutral'] as const;
  
  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];
  
  const navItems = [
    { href: '#ui', label: 'UI Components', active: true },
    { href: '#display', label: 'Display' },
    { href: '#forms', label: 'Forms' },
    { href: '#feedback', label: 'Feedback' },
    { href: '#effects', label: 'Effects' }
  ];
</script>

<style>
  .demo-container {
    min-height: 100vh;
    background: var(--color-background);
    color: var(--color-text);
    position: relative;
    overflow-x: hidden;
  }
  
  .demo-content {
    position: relative;
    z-index: 10;
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .demo-section {
    margin-bottom: 4rem;
  }
  
  .demo-section h2 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 2rem;
    color: var(--color-primary);
    text-shadow: 0 0 20px rgba(var(--primary-rgb), 0.5);
  }
  
  .demo-section h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--color-text);
  }
  
  .demo-grid {
    display: grid;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .demo-grid-2 {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
  
  .demo-grid-3 {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  .demo-grid-4 {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
  
  .demo-item {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .demo-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }
  
  .theme-toggle {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 100;
  }
  
  .effects-container {
    position: relative;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
  }
  
  .effects-content {
    position: relative;
    z-index: 10;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }
  
  .interactive-demo {
    display: flex;
    gap: 2rem;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .code-example {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.875rem;
    overflow-x: auto;
    margin-top: 1rem;
  }
  
  pre {
    margin: 0;
    white-space: pre-wrap;
  }
</style>

<div class="demo-container">
  <!-- Background Effects -->
  <GeometricBackground />
  
  <!-- Theme Toggle -->
  <div class="theme-toggle">
    <Button 
      variant="secondary" 
      size="small" 
      on:click={toggleTheme}
    >
      {currentTheme === 'dark' ? '☀️' : '🌙'} Toggle Theme
    </Button>
  </div>
  
  <!-- Header -->
  <Header title="Component Library Demo" subtitle="Cyberpunk UI Components Showcase" />
  
  <div class="demo-content">
    <!-- Introduction -->
    <div class="demo-section">
      <h2>Welcome to the Cyberpunk Component Library</h2>
      <GlassPanel>
        <p>
          This demo showcases all available components in our cyberpunk-themed UI library. 
          Each component is designed with a futuristic aesthetic featuring neon glows, 
          glass morphism effects, and smooth animations.
        </p>
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
          <Button href="/demo/display" variant="secondary">Display Components Demo</Button>
          <Button href="/demo/utilities" variant="secondary">Utilities Demo</Button>
          <Button href="/effects-demo" variant="secondary">Effects Demo</Button>
        </div>
      </GlassPanel>
    </div>
    
    <!-- UI Components -->
    <div class="demo-section" id="ui">
      <h2>UI Components</h2>
      
      <h3>Buttons</h3>
      <div class="demo-grid demo-grid-4">
        <div class="demo-item">
          <span class="demo-label">Primary Button</span>
          <Button variant="primary">Primary Action</Button>
        </div>
        <div class="demo-item">
          <span class="demo-label">Secondary Button</span>
          <Button variant="secondary">Secondary</Button>
        </div>
        <div class="demo-item">
          <span class="demo-label">Danger Button</span>
          <Button variant="danger">Delete</Button>
        </div>
        <div class="demo-item">
          <span class="demo-label">Ghost Button</span>
          <Button variant="ghost">Ghost</Button>
        </div>
      </div>
      
      <h3>Button Sizes</h3>
      <div class="interactive-demo">
        <Button size="small">Small</Button>
        <Button size="medium">Medium</Button>
        <Button size="large">Large</Button>
        <Button disabled>Disabled</Button>
      </div>
      
      <h3>Cards</h3>
      <div class="demo-grid demo-grid-2">
        <Card title="Basic Card">
          <p>This is a basic card with glass morphism effect and neon glow.</p>
        </Card>
        <Card title="Interactive Card" hoverable>
          <p>Hover over this card to see the enhanced glow effect.</p>
        </Card>
      </div>
      
      <h3>Glass Panels</h3>
      <GlassPanel variant="primary" glow>
        <h4>Primary Glass Panel</h4>
        <p>A glass panel with primary color glow effect.</p>
      </GlassPanel>
      
      <div class="code-example">
        <pre>&lt;GlassPanel variant="primary" glow&gt;
  &lt;h4&gt;Primary Glass Panel&lt;/h4&gt;
  &lt;p&gt;Content goes here&lt;/p&gt;
&lt;/GlassPanel&gt;</pre>
      </div>
    </div>
    
    <!-- Display Components -->
    <div class="demo-section" id="display">
      <h2>Display Components</h2>
      
      <h3>Metric Cards</h3>
      <div class="demo-grid demo-grid-4">
        {#each metrics as metric}
          <MetricCard {...metric} />
        {/each}
      </div>
      
      <h3>Status Badges</h3>
      <div class="interactive-demo">
        {#each statusTypes as status}
          <StatusBadge {status}>{status}</StatusBadge>
        {/each}
      </div>
      
      <h3>Signal Indicator</h3>
      <div class="demo-grid demo-grid-3">
        <div class="demo-item">
          <span class="demo-label">Excellent Signal</span>
          <SignalIndicator strength={-30} />
        </div>
        <div class="demo-item">
          <span class="demo-label">Good Signal</span>
          <SignalIndicator strength={-60} />
        </div>
        <div class="demo-item">
          <span class="demo-label">Poor Signal</span>
          <SignalIndicator strength={-85} />
        </div>
      </div>
      
      <h3>Progress Bar</h3>
      <div class="demo-item">
        <ProgressBar value={progress} max={100} label="Upload Progress" />
        <div class="interactive-demo">
          <Button size="small" on:click={() => progress = Math.max(0, progress - 10)}>-10%</Button>
          <Button size="small" on:click={() => progress = Math.min(100, progress + 10)}>+10%</Button>
        </div>
      </div>
    </div>
    
    <!-- Form Components -->
    <div class="demo-section" id="forms">
      <h2>Form Components</h2>
      
      <GlassPanel>
        <h3>Input Fields</h3>
        <div class="demo-grid demo-grid-2">
          <div class="demo-item">
            <Input 
              label="Text Input" 
              placeholder="Enter text..."
              bind:value={inputValue}
            />
          </div>
          <div class="demo-item">
            <Input 
              label="Password Input" 
              type="password"
              placeholder="Enter password..."
            />
          </div>
        </div>
        
        <h3>Number Input</h3>
        <div class="demo-item">
          <NumberInput 
            label="Frequency (MHz)"
            bind:value={numberValue}
            min={0}
            max={1000}
            step={10}
          />
          <span class="demo-label">Current value: {numberValue}</span>
        </div>
        
        <h3>Select</h3>
        <div class="demo-item">
          <Select 
            label="Choose Option"
            options={selectOptions}
            bind:value={selectValue}
          />
        </div>
        
        <h3>Control Section</h3>
        <ControlSection title="Device Settings">
          <Input label="Device Name" placeholder="Enter name..." />
          <Select label="Mode" options={selectOptions} />
          <Button variant="primary">Apply Settings</Button>
        </ControlSection>
      </GlassPanel>
    </div>
    
    <!-- Feedback Components -->
    <div class="demo-section" id="feedback">
      <h2>Feedback Components</h2>
      
      <h3>Alerts</h3>
      <div class="demo-grid demo-grid-1">
        <Alert type="success" dismissible bind:visible={alertVisible}>
          Success! Your changes have been saved.
        </Alert>
        <Alert type="warning">
          Warning: Signal strength is below optimal levels.
        </Alert>
        <Alert type="error">
          Error: Connection to device failed.
        </Alert>
        <Alert type="info">
          Info: New firmware update available.
        </Alert>
      </div>
      
      <h3>Loading States</h3>
      <div class="interactive-demo">
        <LoadingSpinner size="small" />
        <LoadingSpinner size="medium" />
        <LoadingSpinner size="large" />
        <Button on:click={() => showLoadingOverlay = !showLoadingOverlay}>
          Toggle Loading Overlay
        </Button>
      </div>
      
      <h3>Empty State</h3>
      <EmptyState 
        title="No Devices Found"
        message="Start scanning to discover nearby devices"
        icon="📡"
      >
        <Button variant="primary">Start Scan</Button>
      </EmptyState>
    </div>
    
    <!-- Effects -->
    <div class="demo-section" id="effects">
      <h2>Visual Effects</h2>
      
      <h3>Animated Blobs</h3>
      <div class="effects-container">
        <AnimatedBlobs />
        <div class="effects-content">
          <GlassPanel>
            <h4>Animated Background</h4>
            <p>Smooth, flowing blob animations</p>
          </GlassPanel>
        </div>
      </div>
      
      <h3>Neon Glow</h3>
      <div class="demo-grid demo-grid-2">
        <NeonGlow color="primary">
          <Card title="Neon Primary">
            <p>Primary color neon glow effect</p>
          </Card>
        </NeonGlow>
        <NeonGlow color="accent">
          <Card title="Neon Accent">
            <p>Accent color neon glow effect</p>
          </Card>
        </NeonGlow>
      </div>
      
      <h3>Scan Line Effect</h3>
      <div class="effects-container">
        <ScanLine />
        <div class="effects-content">
          <h4>Scanning Animation</h4>
        </div>
      </div>
    </div>
    
    <!-- Special Components -->
    <div class="demo-section">
      <h2>Special Components</h2>
      
      <h3>Status Panel</h3>
      <StatusPanel />
      
      <h3>Kismet Frame</h3>
      <div style="height: 600px; border: 2px solid var(--color-border); border-radius: 12px; overflow: hidden;">
        <KismetFrame src="https://example.com" title="Kismet Dashboard" />
      </div>
    </div>
    
    <!-- Component Playground -->
    <div class="demo-section">
      <h2>Interactive Playground</h2>
      <GlassPanel>
        <h3>Try Component Combinations</h3>
        <div class="demo-grid demo-grid-2">
          <Card title="Signal Monitor" hoverable>
            <SignalIndicator strength={signalStrength} />
            <ProgressBar value={Math.abs(signalStrength)} max={100} label="Signal Quality" />
            <div class="interactive-demo">
              <Button 
                size="small" 
                variant="ghost"
                on:click={() => signalStrength = Math.max(-90, signalStrength - 5)}
              >
                Decrease
              </Button>
              <Button 
                size="small" 
                variant="ghost"
                on:click={() => signalStrength = Math.min(-20, signalStrength + 5)}
              >
                Increase
              </Button>
            </div>
          </Card>
          
          <Card title="Device Control" hoverable>
            <FrequencyItem frequency={433.92} unit="MHz" active />
            <ControlSection title="Quick Actions">
              <Button variant="primary" size="small">Start Scan</Button>
              <Button variant="secondary" size="small">Configure</Button>
              <Button variant="danger" size="small">Stop</Button>
            </ControlSection>
          </Card>
        </div>
      </GlassPanel>
    </div>
  </div>
  
  <!-- Loading Overlay Demo -->
  {#if showLoadingOverlay}
    <LoadingOverlay message="Processing..." />
  {/if}
  
  <!-- Mobile Menu Demo -->
  <MobileMenu 
    bind:open={showMobileMenu} 
    items={navItems}
  />
</div>