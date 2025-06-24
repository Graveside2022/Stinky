<script lang="ts">
  export let status: 'active' | 'inactive' | 'warning' | 'error' | 'success' = 'inactive'
  export let size: 'small' | 'medium' | 'large' = 'medium'
  export let pulse = false
  export let label = ''
</script>

<div class="status-container">
  <div 
    class="status-dot {status} {size}"
    class:pulse
    title={label}
    role="status"
    aria-label={label || `Status: ${status}`}
  ></div>
  {#if label}
    <span class="status-label">{label}</span>
  {/if}
</div>

<style>
  .status-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    border-radius: 50%;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  /* Size variants */
  .status-dot.small {
    width: 8px;
    height: 8px;
  }

  .status-dot.medium {
    width: 12px;
    height: 12px;
  }

  .status-dot.large {
    width: 16px;
    height: 16px;
  }

  /* Status variants */
  .status-dot.active {
    background: var(--accent-success);
    border: 2px solid rgba(68, 255, 68, 0.8);
    box-shadow: var(--glow-success);
  }

  .status-dot.inactive {
    background: #666;
    border: 2px solid rgba(102, 102, 102, 0.8);
    box-shadow: 0 0 10px rgba(102, 102, 102, 0.3);
  }

  .status-dot.warning {
    background: var(--accent-warning);
    border: 2px solid rgba(245, 158, 11, 0.8);
    box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
  }

  .status-dot.error {
    background: var(--accent-error);
    border: 2px solid rgba(255, 68, 68, 0.8);
    box-shadow: var(--glow-error);
  }

  .status-dot.success {
    background: var(--accent-success);
    border: 2px solid rgba(68, 255, 68, 0.8);
    box-shadow: var(--glow-success);
  }

  /* Pulse animation */
  .status-dot.pulse {
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Hover effects */
  .status-dot:hover {
    transform: scale(1.2);
    filter: brightness(1.2);
  }

  .status-label {
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  /* Special glow effect for active status */
  .status-dot.active::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: radial-gradient(circle, var(--accent-success) 0%, transparent 70%);
    border-radius: 50%;
    z-index: -1;
    animation: glow 3s ease-in-out infinite alternate;
  }

  @keyframes glow {
    0% {
      opacity: 0.5;
    }
    100% {
      opacity: 0.8;
    }
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .status-dot.large {
      width: 14px;
      height: 14px;
    }

    .status-dot.medium {
      width: 10px;
      height: 10px;
    }

    .status-dot.small {
      width: 6px;
      height: 6px;
    }

    .status-label {
      font-size: 0.7rem;
    }
  }
</style>