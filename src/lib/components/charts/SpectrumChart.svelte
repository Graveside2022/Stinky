<script>
  import { onMount, onDestroy } from 'svelte'
  import { formatFrequency } from '@utils/format.js'
  
  export let data = null
  export let width = 800
  export let height = 400
  export let centerFrequency = 915000000
  export let bandwidth = 20000000
  
  let canvas
  let ctx
  let animationFrame
  
  function drawSpectrum() {
    if (!ctx || !data) return
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)
    
    // Grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    
    // Vertical grid (frequency)
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    
    // Horizontal grid (power)
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // Draw spectrum data
    if (data && data.length > 0) {
      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      
      const binWidth = width / data.length
      
      for (let i = 0; i < data.length; i++) {
        const x = i * binWidth
        const normalized = (data[i] + 100) / 60 // Normalize -100 to -40 dBm range
        const y = height - (normalized * height)
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      
      ctx.stroke()
    }
    
    // Labels
    ctx.fillStyle = '#fff'
    ctx.font = '12px monospace'
    
    // Frequency labels
    const startFreq = centerFrequency - bandwidth / 2
    const endFreq = centerFrequency + bandwidth / 2
    
    ctx.textAlign = 'left'
    ctx.fillText(formatFrequency(startFreq), 5, height - 5)
    
    ctx.textAlign = 'center'
    ctx.fillText(formatFrequency(centerFrequency), width / 2, height - 5)
    
    ctx.textAlign = 'right'
    ctx.fillText(formatFrequency(endFreq), width - 5, height - 5)
    
    // Power labels
    ctx.textAlign = 'left'
    ctx.fillText('-40 dBm', 5, 15)
    ctx.fillText('-100 dBm', 5, height - 20)
  }
  
  function animate() {
    drawSpectrum()
    animationFrame = requestAnimationFrame(animate)
  }
  
  onMount(() => {
    ctx = canvas.getContext('2d')
    animate()
  })
  
  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  })
  
  $: if (ctx && data) {
    drawSpectrum()
  }
</script>

<div class="spectrum-chart">
  <canvas 
    bind:this={canvas} 
    {width} 
    {height}
    class="border border-gray-600 rounded"
  />
</div>

<style>
  .spectrum-chart {
    display: inline-block;
  }
  
  canvas {
    display: block;
    image-rendering: crisp-edges;
  }
</style>