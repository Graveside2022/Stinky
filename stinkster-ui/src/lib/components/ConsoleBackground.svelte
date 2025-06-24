<!--
  ConsoleBackground Component
  Animated background with grid overlay and radial gradients
  Converted from working HTML dashboard CSS to Tailwind utilities
-->

<div class="console-background">
  <div class="grid-overlay"></div>
</div>

<style>
  .console-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background: 
      radial-gradient(circle at 20% 80%, rgba(0, 210, 255, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(251, 146, 60, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.03) 0%, transparent 50%),
      linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
    animation: background-pulse 8s ease-in-out infinite;
  }

  .grid-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    opacity: 0.02;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: grid-drift 60s linear infinite;
  }

  @keyframes background-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  @keyframes grid-drift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(40px, 40px); }
  }
</style>