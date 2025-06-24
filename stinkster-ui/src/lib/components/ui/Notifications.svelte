<script lang="ts">
  import { notifications, removeNotification } from '../../../shared/stores'
  import { fly } from 'svelte/transition'
  
  $: currentNotifications = $notifications
  
  function handleDismiss(id: string) {
    removeNotification(id)
  }
  
  function getNotificationIcon(type: string) {
    switch (type) {
      case 'success': return '✓'
      case 'warning': return '⚠'
      case 'error': return '✕'
      default: return 'ℹ'
    }
  }
</script>

<div class="notifications-container">
  {#each currentNotifications as notification (notification.id)}
    <div
      class="notification {notification.type}"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <div class="notification-icon">
        {getNotificationIcon(notification.type)}
      </div>
      
      <div class="notification-content">
        <div class="notification-title">{notification.title}</div>
        <div class="notification-message">{notification.message}</div>
        <div class="notification-time">
          {notification.timestamp.toLocaleTimeString()}
        </div>
      </div>
      
      <button
        class="notification-dismiss"
        on:click={() => handleDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  {/each}
</div>

<style>
  .notifications-container {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 9999;
    max-width: 400px;
    pointer-events: none;
  }
  
  .notification {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: rgba(12, 22, 48, 0.95);
    border: 1px solid;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    max-width: 100%;
  }
  
  .notification.info {
    border-color: rgba(0, 220, 255, 0.5);
    background: rgba(0, 220, 255, 0.05);
  }
  
  .notification.success {
    border-color: rgba(68, 255, 68, 0.5);
    background: rgba(68, 255, 68, 0.05);
  }
  
  .notification.warning {
    border-color: rgba(255, 165, 0, 0.5);
    background: rgba(255, 165, 0, 0.05);
  }
  
  .notification.error {
    border-color: rgba(255, 68, 68, 0.5);
    background: rgba(255, 68, 68, 0.05);
  }
  
  .notification-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: bold;
    font-size: 14px;
  }
  
  .notification.info .notification-icon {
    background: rgba(0, 220, 255, 0.2);
    color: #00d2ff;
  }
  
  .notification.success .notification-icon {
    background: rgba(68, 255, 68, 0.2);
    color: #44ff44;
  }
  
  .notification.warning .notification-icon {
    background: rgba(255, 165, 0, 0.2);
    color: #ffa500;
  }
  
  .notification.error .notification-icon {
    background: rgba(255, 68, 68, 0.2);
    color: #ff4444;
  }
  
  .notification-content {
    flex: 1;
    min-width: 0;
  }
  
  .notification-title {
    font-weight: 600;
    font-size: 14px;
    color: #d0d8f0;
    margin-bottom: 4px;
  }
  
  .notification-message {
    font-size: 13px;
    color: rgba(208, 216, 240, 0.8);
    line-height: 1.4;
    margin-bottom: 4px;
  }
  
  .notification-time {
    font-size: 11px;
    color: rgba(208, 216, 240, 0.5);
  }
  
  .notification-dismiss {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: rgba(208, 216, 240, 0.5);
    cursor: pointer;
    border-radius: 50%;
    font-size: 12px;
    transition: all 0.2s ease;
  }
  
  .notification-dismiss:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #d0d8f0;
  }
  
  @media (max-width: 768px) {
    .notifications-container {
      right: 10px;
      left: 10px;
      max-width: none;
    }
  }
</style>