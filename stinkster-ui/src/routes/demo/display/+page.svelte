<script lang="ts">
  import { MetricCard, SignalIndicator, StatusBadge, ProgressBar } from '$lib/components/display';
  
  // Demo data
  let signalStrength = -65;
  let progress = 75;
  
  // Animate signal strength
  setInterval(() => {
    signalStrength = -90 + Math.random() * 80;
  }, 2000);
  
  // Animate progress
  setInterval(() => {
    progress = Math.random() * 100;
  }, 3000);
</script>

<div class="min-h-screen bg-gray-900 text-gray-100 p-8">
  <div class="max-w-6xl mx-auto space-y-8">
    <h1 class="text-3xl font-bold mb-8">Display Components Demo</h1>
    
    <!-- Metric Cards -->
    <section>
      <h2 class="text-xl font-semibold mb-4">Metric Cards</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          label="Temperature" 
          value={77.4} 
          unit="°C"
          variant="orange" 
        />
        <MetricCard 
          label="Signal Strength" 
          value={-65} 
          unit=" dBm"
          variant="cyan" 
        />
        <MetricCard 
          label="Devices Found" 
          value={42} 
          variant="purple" 
        />
      </div>
    </section>
    
    <!-- Signal Indicators -->
    <section>
      <h2 class="text-xl font-semibold mb-4">Signal Indicators</h2>
      <div class="space-y-6 bg-gray-800 rounded-lg p-6">
        <div>
          <p class="text-sm text-gray-400 mb-2">WiFi Signal Strength</p>
          <SignalIndicator value={signalStrength} />
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">Without Value Display</p>
          <SignalIndicator value={-45} showValue={false} />
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">Thin Variant</p>
          <SignalIndicator value={-70} height={16} />
        </div>
      </div>
    </section>
    
    <!-- Status Badges -->
    <section>
      <h2 class="text-xl font-semibold mb-4">Status Badges</h2>
      <div class="flex flex-wrap gap-4 bg-gray-800 rounded-lg p-6">
        <StatusBadge status="online" label="Kismet" pulse={true} />
        <StatusBadge status="offline" label="GPS" />
        <StatusBadge status="warning" label="CPU Temp" pulse={true} />
        <StatusBadge status="error" label="HackRF" />
      </div>
      <div class="flex flex-wrap gap-4 bg-gray-800 rounded-lg p-6 mt-4">
        <div class="space-y-2">
          <p class="text-sm text-gray-400">Small</p>
          <StatusBadge status="online" size="sm" />
        </div>
        <div class="space-y-2">
          <p class="text-sm text-gray-400">Medium</p>
          <StatusBadge status="warning" size="md" />
        </div>
        <div class="space-y-2">
          <p class="text-sm text-gray-400">Large</p>
          <StatusBadge status="error" size="lg" />
        </div>
      </div>
    </section>
    
    <!-- Progress Bars -->
    <section>
      <h2 class="text-xl font-semibold mb-4">Progress Bars</h2>
      <div class="space-y-4 bg-gray-800 rounded-lg p-6">
        <div>
          <p class="text-sm text-gray-400 mb-2">CPU Usage</p>
          <ProgressBar value={progress} variant="blue" showPercentage={true} />
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">Memory Usage</p>
          <ProgressBar value={65} variant="green" showPercentage={true} />
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">Disk Usage</p>
          <ProgressBar value={17.7} variant="orange" />
        </div>
        <div>
          <p class="text-sm text-gray-400 mb-2">Scan Progress</p>
          <ProgressBar value={85} variant="purple" height={12} showPercentage={true} />
        </div>
      </div>
    </section>
  </div>
</div>