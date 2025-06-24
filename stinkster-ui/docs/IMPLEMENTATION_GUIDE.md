# Design System Implementation Guide

## Quick Start Implementation

This guide provides the exact code and structure needed to implement the cyberpunk design system transformation.

## 1. CSS Architecture Setup

### 1.1 Create Cyber Theme CSS
Create `/src/lib/styles/cyber-theme.css`:

```css
/* Cyberpunk Theme Variables */
:root {
  /* Core Colors */
  --cyber-black: #0a0a0a;
  --cyber-dark: #0f1419;
  --cyber-darker: #000507;
  --cyber-darkest: #000000;
  
  /* Panel Colors with Transparency */
  --cyber-panel: rgba(15, 20, 25, 0.85);
  --cyber-panel-solid: #0f1419;
  --cyber-panel-light: rgba(20, 25, 30, 0.9);
  
  /* Neon Colors */
  --neon-cyan: #00ffff;
  --neon-cyan-dark: #00cccc;
  --neon-green: #00ff00;
  --neon-green-dark: #00cc00;
  --neon-blue: #0080ff;
  --neon-purple: #b300ff;
  --neon-red: #ff0040;
  --neon-yellow: #ffff00;
  
  /* Text Colors */
  --text-matrix: #00ff41;
  --text-terminal: #00ffff;
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.8);
  --text-muted: rgba(255, 255, 255, 0.5);
  
  /* Glow Effects */
  --glow-cyan: 0 0 20px rgba(0, 255, 255, 0.6);
  --glow-cyan-strong: 0 0 40px rgba(0, 255, 255, 0.8);
  --glow-green: 0 0 20px rgba(0, 255, 0, 0.6);
  --glow-red: 0 0 20px rgba(255, 0, 64, 0.6);
  
  /* Borders */
  --border-cyber: rgba(0, 255, 255, 0.3);
  --border-cyber-strong: rgba(0, 255, 255, 0.6);
  
  /* Animations */
  --transition-cyber: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 1.2 Create Animation Library
Create `/src/lib/styles/cyber-animations.css`:

```css
/* Pulse Animation */
@keyframes cyber-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Glow Pulse */
@keyframes glow-pulse {
  0%, 100% { 
    box-shadow: var(--glow-cyan);
  }
  50% { 
    box-shadow: var(--glow-cyan-strong);
  }
}

/* Border Animation */
@keyframes border-flow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}

/* Glitch Effect */
@keyframes glitch {
  0%, 100% {
    transform: translate(0);
    filter: hue-rotate(0deg);
  }
  20% {
    transform: translate(-2px, 2px);
    filter: hue-rotate(90deg);
  }
  40% {
    transform: translate(-2px, -2px);
    filter: hue-rotate(180deg);
  }
  60% {
    transform: translate(2px, 2px);
    filter: hue-rotate(270deg);
  }
  80% {
    transform: translate(2px, -2px);
    filter: hue-rotate(360deg);
  }
}

/* Matrix Text Effect */
@keyframes matrix-text {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(10px);
  }
}

/* Scan Line */
@keyframes scan-line {
  0% {
    top: -100%;
  }
  100% {
    top: 100%;
  }
}
```

## 2. Core Component Implementations

### 2.1 CyberButton Component
Create `/src/lib/components/cyber/CyberButton.svelte`:

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let variant: 'primary' | 'danger' | 'ghost' | 'matrix' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled: boolean = false;
  export let glow: boolean = true;
  export let pulse: boolean = false;
  export let fullWidth: boolean = false;
  
  const dispatch = createEventDispatcher();
  let isClicked = false;
  let buttonElement: HTMLButtonElement;
  
  function handleClick(e: MouseEvent) {
    if (disabled) return;
    
    // Glitch effect
    isClicked = true;
    setTimeout(() => isClicked = false, 300);
    
    // Ripple effect
    const rect = buttonElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    buttonElement.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    
    dispatch('click', e);
  }
  
  $: sizeClasses = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }[size];
  
  $: variantClasses = {
    primary: 'cyber-primary',
    danger: 'cyber-danger',
    ghost: 'cyber-ghost',
    matrix: 'cyber-matrix'
  }[variant];
</script>

<button
  bind:this={buttonElement}
  class="cyber-button {variantClasses} {sizeClasses}"
  class:glow
  class:pulse
  class:glitch={isClicked}
  class:w-full={fullWidth}
  class:disabled
  {disabled}
  on:click={handleClick}
  {...$$restProps}
>
  <span class="button-bg"></span>
  <span class="button-content">
    <slot />
  </span>
  {#if glow}
    <span class="button-glow"></span>
  {/if}
</button>

<style>
  .cyber-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-primary);
    cursor: pointer;
    overflow: hidden;
    transition: var(--transition-cyber);
    isolation: isolate;
  }
  
  .button-bg {
    position: absolute;
    inset: 0;
    background: var(--cyber-panel);
    z-index: -2;
  }
  
  .button-content {
    position: relative;
    z-index: 1;
  }
  
  /* Primary Variant */
  .cyber-primary {
    border-color: var(--neon-cyan);
    color: var(--neon-cyan);
  }
  
  .cyber-primary .button-bg {
    background: linear-gradient(135deg, 
      rgba(0, 255, 255, 0.1) 0%, 
      rgba(0, 255, 255, 0.05) 100%
    );
  }
  
  .cyber-primary:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: 
      0 10px 20px rgba(0, 255, 255, 0.3),
      inset 0 0 20px rgba(0, 255, 255, 0.1);
  }
  
  /* Danger Variant */
  .cyber-danger {
    border-color: var(--neon-red);
    color: var(--neon-red);
  }
  
  .cyber-danger .button-bg {
    background: linear-gradient(135deg, 
      rgba(255, 0, 64, 0.1) 0%, 
      rgba(255, 0, 64, 0.05) 100%
    );
  }
  
  /* Ghost Variant */
  .cyber-ghost {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.8);
  }
  
  .cyber-ghost:hover:not(.disabled) {
    border-color: var(--neon-cyan);
    color: var(--neon-cyan);
  }
  
  /* Matrix Variant */
  .cyber-matrix {
    border-color: var(--text-matrix);
    color: var(--text-matrix);
  }
  
  .cyber-matrix .button-bg {
    background: linear-gradient(135deg, 
      rgba(0, 255, 65, 0.1) 0%, 
      rgba(0, 255, 65, 0.05) 100%
    );
  }
  
  /* Glow Effect */
  .button-glow {
    position: absolute;
    inset: -2px;
    background: linear-gradient(45deg, 
      transparent,
      var(--neon-cyan),
      transparent
    );
    opacity: 0;
    z-index: -1;
    transition: opacity 0.3s;
    filter: blur(10px);
  }
  
  .cyber-button.glow:hover .button-glow {
    opacity: 0.5;
    animation: border-flow 3s linear infinite;
  }
  
  /* Pulse Animation */
  .cyber-button.pulse {
    animation: glow-pulse 2s ease-in-out infinite;
  }
  
  /* Glitch Effect */
  .cyber-button.glitch {
    animation: glitch 0.3s ease-in-out;
  }
  
  /* Ripple Effect */
  :global(.cyber-button .ripple) {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    animation: ripple-effect 0.6s ease-out;
    pointer-events: none;
  }
  
  @keyframes ripple-effect {
    from {
      width: 0;
      height: 0;
      opacity: 1;
    }
    to {
      width: 200px;
      height: 200px;
      opacity: 0;
    }
  }
  
  /* Disabled State */
  .cyber-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .cyber-button.disabled:hover {
    transform: none;
    box-shadow: none;
  }
</style>
```

### 2.2 CyberCard Component
Create `/src/lib/components/cyber/CyberCard.svelte`:

```svelte
<script lang="ts">
  export let variant: 'default' | 'elevated' | 'bordered' | 'glass' = 'default';
  export let glow: boolean = false;
  export let animated: boolean = true;
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
  
  $: paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }[padding];
</script>

<div 
  class="cyber-card {variant} {paddingClasses}"
  class:glow
  class:animated
  {...$$restProps}
>
  <div class="card-border"></div>
  <div class="card-content">
    <slot />
  </div>
  {#if glow}
    <div class="card-glow"></div>
  {/if}
</div>

<style>
  .cyber-card {
    position: relative;
    background: var(--cyber-panel);
    border: 1px solid var(--border-cyber);
    overflow: hidden;
    transition: var(--transition-cyber);
  }
  
  /* Cut corner effect */
  .cyber-card::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, 
      transparent 50%, 
      var(--border-cyber) 50%
    );
  }
  
  .card-content {
    position: relative;
    z-index: 1;
  }
  
  /* Animated Border */
  .card-border {
    position: absolute;
    inset: -1px;
    background: linear-gradient(90deg,
      transparent,
      var(--neon-cyan),
      transparent
    );
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 0;
  }
  
  .cyber-card.animated:hover .card-border {
    opacity: 1;
    animation: border-flow 3s linear infinite;
    background-size: 200% 100%;
  }
  
  /* Variants */
  .cyber-card.elevated {
    box-shadow: 
      0 4px 6px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(0, 255, 255, 0.1);
  }
  
  .cyber-card.bordered {
    border-width: 2px;
    border-color: var(--border-cyber-strong);
  }
  
  .cyber-card.glass {
    background: rgba(15, 20, 25, 0.6);
    backdrop-filter: blur(10px);
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Glow Effect */
  .card-glow {
    position: absolute;
    inset: -20px;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 255, 255, 0.3) 0%,
      transparent 70%
    );
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: -1;
  }
  
  .cyber-card.glow:hover .card-glow {
    opacity: 1;
  }
</style>
```

### 2.3 GeometricBackground Component
Create `/src/lib/components/cyber/GeometricBackground.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  export let variant: 'grid' | 'dots' | 'lines' | 'circuit' = 'grid';
  export let animated: boolean = true;
  export let opacity: number = 0.1;
  export let color: string = '#00ffff';
  
  let canvas: HTMLCanvasElement;
  let animationId: number;
  let time = 0;
  
  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = opacity;
      
      switch (variant) {
        case 'grid':
          drawGrid(ctx);
          break;
        case 'dots':
          drawDots(ctx);
          break;
        case 'lines':
          drawLines(ctx);
          break;
        case 'circuit':
          drawCircuit(ctx);
          break;
      }
      
      if (animated) {
        time += 0.01;
        animationId = requestAnimationFrame(draw);
      }
    };
    
    draw();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  });
  
  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const offset = animated ? (time * 20) % gridSize : 0;
    
    // Vertical lines
    for (let x = -gridSize; x < canvas.width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = -gridSize; y < canvas.height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }
  
  function drawDots(ctx: CanvasRenderingContext2D) {
    const dotSize = 2;
    const spacing = 30;
    
    ctx.fillStyle = color;
    
    for (let x = 0; x < canvas.width; x += spacing) {
      for (let y = 0; y < canvas.height; y += spacing) {
        const size = animated 
          ? dotSize * (1 + Math.sin(time + x * 0.01 + y * 0.01) * 0.5)
          : dotSize;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  function drawLines(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    
    const lineCount = 20;
    const amplitude = 50;
    
    for (let i = 0; i < lineCount; i++) {
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x += 5) {
        const y = canvas.height / 2 + 
          Math.sin(x * 0.01 + time + i * 0.5) * amplitude +
          (i - lineCount / 2) * 20;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }
  }
  
  function drawCircuit(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    
    const nodes: Array<{x: number, y: number}> = [];
    const nodeCount = 15;
    
    // Generate random nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height
      });
    }
    
    // Draw connections
    nodes.forEach((node, i) => {
      // Draw node
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
      ctx.fill();
      
      // Connect to nearby nodes
      nodes.forEach((otherNode, j) => {
        if (i !== j) {
          const dist = Math.hypot(node.x - otherNode.x, node.y - otherNode.y);
          if (dist < 200) {
            ctx.globalAlpha = opacity * (1 - dist / 200);
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        }
      });
      
      ctx.globalAlpha = opacity;
    });
  }
</script>

<canvas 
  bind:this={canvas}
  class="geometric-background"
/>

<style>
  .geometric-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
  }
</style>
```

## 3. Integration Steps

### 3.1 Update Main App.svelte
Add to your main app file:

```svelte
<script>
  import GeometricBackground from '$lib/components/cyber/GeometricBackground.svelte';
  import '$lib/styles/cyber-theme.css';
  import '$lib/styles/cyber-animations.css';
</script>

<GeometricBackground variant="grid" animated={true} />
<div class="app-container">
  <!-- Your app content -->
</div>

<style>
  :global(body) {
    background: var(--cyber-black);
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
  }
  
  .app-container {
    position: relative;
    min-height: 100vh;
  }
</style>
```

### 3.2 Transform Existing Components
Example transformation for HackRF spectrum display:

```svelte
<!-- Before -->
<Card>
  <h2>Spectrum Display</h2>
  <Button variant="primary">Connect</Button>
</Card>

<!-- After -->
<CyberCard variant="glass" glow={true}>
  <h2 class="cyber-title">Spectrum Display</h2>
  <CyberButton variant="primary" glow={true}>
    Connect
  </CyberButton>
</CyberCard>

<style>
  .cyber-title {
    font-family: 'JetBrains Mono', monospace;
    color: var(--neon-cyan);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    text-shadow: var(--text-shadow-md);
  }
</style>
```

## 4. Next Components to Build

1. **SignalMeter.svelte** - Animated signal strength indicator
2. **FrequencyDisplay.svelte** - Matrix-style frequency readout
3. **DataStream.svelte** - Live data visualization
4. **MatrixRain.svelte** - Background matrix effect
5. **NeonGlow.svelte** - Reusable glow effect wrapper

## 5. Testing the Implementation

```typescript
// Test file example
import { render } from '@testing-library/svelte';
import CyberButton from '$lib/components/cyber/CyberButton.svelte';

describe('CyberButton', () => {
  it('renders with primary variant', () => {
    const { container } = render(CyberButton, {
      props: {
        variant: 'primary'
      }
    });
    
    expect(container.querySelector('.cyber-primary')).toBeTruthy();
  });
});
```