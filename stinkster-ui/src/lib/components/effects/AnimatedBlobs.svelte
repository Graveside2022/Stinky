<script lang="ts">
  import { onMount } from 'svelte'
  
  interface Props {
    opacity?: number
  }
  
  let { opacity = 0.5 }: Props = $props()
  
  let canvas = $state<HTMLCanvasElement>()
  let animationId: number
  
  interface Blob {
    x: number
    y: number
    radius: number
    vx: number
    vy: number
    color: string
  }
  
  onMount(() => {
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const blobs: Blob[] = [
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 200,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: 'rgba(0, 255, 170, 0.3)'
      },
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 250,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: 'rgba(0, 170, 255, 0.3)'
      },
      {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: 180,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        color: 'rgba(170, 0, 255, 0.3)'
      }
    ]
    
    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    function draw() {
      if (!ctx || !canvas) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = opacity
      
      // Update and draw blobs
      blobs.forEach(blob => {
        // Update position
        blob.x += blob.vx
        blob.y += blob.vy
        
        // Bounce off edges
        if (blob.x - blob.radius < 0 || blob.x + blob.radius > canvas.width) {
          blob.vx = -blob.vx
        }
        if (blob.y - blob.radius < 0 || blob.y + blob.radius > canvas.height) {
          blob.vy = -blob.vy
        }
        
        // Draw blob
        const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius)
        gradient.addColorStop(0, blob.color)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = gradient
        ctx.fillRect(blob.x - blob.radius, blob.y - blob.radius, blob.radius * 2, blob.radius * 2)
      })
      
      animationId = requestAnimationFrame(draw)
    }
    
    resize()
    window.addEventListener('resize', resize)
    draw()
    
    return () => {
      window.removeEventListener('resize', resize)
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  })
</script>

<canvas bind:this={canvas} class="animated-blobs"></canvas>

<style>
  .animated-blobs {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    filter: blur(100px);
  }
</style>