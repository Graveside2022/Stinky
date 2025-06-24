<script lang="ts">
  interface Props {
    text?: string
    color?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
    glow?: boolean
    size?: 'sm' | 'md' | 'lg'
    children?: any
  }
  
  let { 
    text,
    color = 'neutral',
    glow = false,
    size = 'md',
    children
  }: Props = $props()
  
  const variantClasses = {
    success: 'badge-success',
    warning: 'badge-warning', 
    danger: 'badge-danger',
    info: 'badge-info',
    neutral: 'badge-neutral'
  }
  
  const sizeClasses = {
    sm: 'badge-sm',
    md: 'badge-md',
    lg: 'badge-lg'
  }
</script>

<span class="neon-badge {variantClasses[color]} {sizeClasses[size]} {glow ? 'glow' : ''}">
  {text || children}
</span>

<style>
  .neon-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 0.25rem;
    border: 1px solid;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  
  .neon-badge::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  .neon-badge:hover::before {
    left: 100%;
  }
  
  /* Size variants */
  .badge-sm {
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
  }
  
  .badge-md {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
  
  .badge-lg {
    padding: 0.375rem 1rem;
    font-size: 1rem;
  }
  
  /* Color variants */
  .badge-success {
    color: #22c55e;
    border-color: #22c55e;
    background-color: rgba(34, 197, 94, 0.1);
  }
  
  .badge-success:hover {
    background-color: rgba(34, 197, 94, 0.2);
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
  }
  
  .badge-warning {
    color: #f59e0b;
    border-color: #f59e0b;
    background-color: rgba(245, 158, 11, 0.1);
  }
  
  .badge-warning:hover {
    background-color: rgba(245, 158, 11, 0.2);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
  }
  
  .badge-danger {
    color: #ef4444;
    border-color: #ef4444;
    background-color: rgba(239, 68, 68, 0.1);
  }
  
  .badge-danger:hover {
    background-color: rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
  }
  
  .badge-info {
    color: #00ffaa;
    border-color: #00ffaa;
    background-color: rgba(0, 255, 170, 0.1);
  }
  
  .badge-info:hover {
    background-color: rgba(0, 255, 170, 0.2);
    box-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
  }
  
  .badge-neutral {
    color: #9ca3af;
    border-color: #9ca3af;
    background-color: rgba(156, 163, 175, 0.1);
  }
  
  .badge-neutral:hover {
    background-color: rgba(156, 163, 175, 0.2);
    box-shadow: 0 0 10px rgba(156, 163, 175, 0.5);
  }
  
  /* Glow effect */
  .glow {
    animation: glow-pulse 2s ease-in-out infinite;
  }
  
  .badge-success.glow {
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
  }
  
  .badge-warning.glow {
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
  }
  
  .badge-danger.glow {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
  }
  
  .badge-info.glow {
    box-shadow: 0 0 20px rgba(0, 255, 170, 0.6);
  }
  
  .badge-neutral.glow {
    box-shadow: 0 0 20px rgba(156, 163, 175, 0.6);
  }
  
  @keyframes glow-pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }
</style>