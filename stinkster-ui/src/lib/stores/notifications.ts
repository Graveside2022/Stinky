import { writable, derived } from 'svelte/store';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent: boolean;
  autoHide: boolean;
  hideAfter?: number; // milliseconds
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  style?: 'primary' | 'secondary' | 'danger';
}

// Notification store
export const notifications = writable<Notification[]>([]);

// Derived stores for different notification types
export const unreadNotifications = derived(notifications, ($notifications) =>
  $notifications.filter(n => !n.read)
);

export const persistentNotifications = derived(notifications, ($notifications) =>
  $notifications.filter(n => n.persistent)
);

export const recentNotifications = derived(notifications, ($notifications) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return $notifications.filter(n => n.timestamp > oneHourAgo);
});

export const errorNotifications = derived(notifications, ($notifications) =>
  $notifications.filter(n => n.type === 'error')
);

export const warningNotifications = derived(notifications, ($notifications) =>
  $notifications.filter(n => n.type === 'warning')
);

export const infoNotifications = derived(notifications, ($notifications) =>
  $notifications.filter(n => n.type === 'info')
);

export const successNotifications = derived(notifications, ($notifications) =>
  $notifications.filter(n => n.type === 'success')
);

// Notification counts
export const unreadCount = derived(unreadNotifications, ($unread) => $unread.length);
export const errorCount = derived(errorNotifications, ($errors) => $errors.length);
export const warningCount = derived(warningNotifications, ($warnings) => $warnings.length);
export const totalCount = derived(notifications, ($notifications) => $notifications.length);

// Active notification for display (non-persistent, unread)
export const activeNotification = derived(notifications, ($notifications) => {
  return $notifications
    .filter(n => !n.persistent && !n.read)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0] || null;
});

// Generate unique ID for notifications
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Auto-hide timeouts
const autoHideTimeouts = new Map<string, number>();

// Add notification
export function addNotification(
  type: Notification['type'],
  title: string,
  message: string,
  options?: Partial<Pick<Notification, 'persistent' | 'autoHide' | 'hideAfter' | 'actions' | 'metadata'>>
) {
  const notification: Notification = {
    id: generateId(),
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    persistent: options?.persistent || false,
    autoHide: options?.autoHide ?? true,
    hideAfter: options?.hideAfter || getDefaultHideTime(type),
    actions: options?.actions || [],
    metadata: options?.metadata || {}
  };

  notifications.update(current => [notification, ...current]);

  // Set up auto-hide if enabled
  if (notification.autoHide && !notification.persistent && notification.hideAfter) {
    const timeoutId = window.setTimeout(() => {
      removeNotification(notification.id);
      autoHideTimeouts.delete(notification.id);
    }, notification.hideAfter);
    
    autoHideTimeouts.set(notification.id, timeoutId);
  }

  return notification.id;
}

// Get default hide time based on notification type
function getDefaultHideTime(type: Notification['type']): number {
  switch (type) {
    case 'error': return 10000; // 10 seconds
    case 'warning': return 8000; // 8 seconds
    case 'success': return 5000; // 5 seconds
    case 'info': return 6000; // 6 seconds
    default: return 5000;
  }
}

// Convenience functions for different types
export function addInfoNotification(title: string, message: string, options?: Parameters<typeof addNotification>[3]) {
  return addNotification('info', title, message, options);
}

export function addSuccessNotification(title: string, message: string, options?: Parameters<typeof addNotification>[3]) {
  return addNotification('success', title, message, options);
}

export function addWarningNotification(title: string, message: string, options?: Parameters<typeof addNotification>[3]) {
  return addNotification('warning', title, message, options);
}

export function addErrorNotification(title: string, message: string, options?: Parameters<typeof addNotification>[3]) {
  return addNotification('error', title, message, options);
}

// Mark notification as read
export function markAsRead(id: string) {
  notifications.update(current =>
    current.map(n => n.id === id ? { ...n, read: true } : n)
  );

  // Clear auto-hide timeout if exists
  const timeoutId = autoHideTimeouts.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    autoHideTimeouts.delete(id);
  }
}

// Mark all notifications as read
export function markAllAsRead() {
  notifications.update(current =>
    current.map(n => ({ ...n, read: true }))
  );

  // Clear all auto-hide timeouts
  autoHideTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  autoHideTimeouts.clear();
}

// Remove notification
export function removeNotification(id: string) {
  notifications.update(current =>
    current.filter(n => n.id !== id)
  );

  // Clear auto-hide timeout if exists
  const timeoutId = autoHideTimeouts.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    autoHideTimeouts.delete(id);
  }
}

// Clear all notifications
export function clearAllNotifications() {
  notifications.set([]);
  
  // Clear all auto-hide timeouts
  autoHideTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  autoHideTimeouts.clear();
}

// Clear notifications by type
export function clearNotificationsByType(type: Notification['type']) {
  notifications.update(current => {
    const toRemove = current.filter(n => n.type === type);
    
    // Clear timeouts for removed notifications
    toRemove.forEach(n => {
      const timeoutId = autoHideTimeouts.get(n.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        autoHideTimeouts.delete(n.id);
      }
    });
    
    return current.filter(n => n.type !== type);
  });
}

// Clear old notifications (older than specified time)
export function clearOldNotifications(olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  notifications.update(current => {
    const toRemove = current.filter(n => n.timestamp < olderThan && !n.persistent);
    
    // Clear timeouts for removed notifications
    toRemove.forEach(n => {
      const timeoutId = autoHideTimeouts.get(n.id);
      if (timeoutId) {
        clearTimeout(timeoutId);
        autoHideTimeouts.delete(n.id);
      }
    });
    
    return current.filter(n => n.timestamp >= olderThan || n.persistent);
  });
}

// Update notification
export function updateNotification(id: string, updates: Partial<Notification>) {
  notifications.update(current =>
    current.map(n => n.id === id ? { ...n, ...updates } : n)
  );
}

// Get notification by ID
export function getNotification(id: string): Notification | undefined {
  let result: Notification | undefined;
  notifications.subscribe(current => {
    result = current.find(n => n.id === id);
  })();
  return result;
}

// Predefined system notification functions
export function notifyServiceStarted(serviceName: string) {
  addSuccessNotification(
    'Service Started',
    `${serviceName} has started successfully`,
    { metadata: { service: serviceName, action: 'start' } }
  );
}

export function notifyServiceStopped(serviceName: string) {
  addInfoNotification(
    'Service Stopped',
    `${serviceName} has been stopped`,
    { metadata: { service: serviceName, action: 'stop' } }
  );
}

export function notifyServiceError(serviceName: string, error: string) {
  addErrorNotification(
    'Service Error',
    `${serviceName}: ${error}`,
    { 
      persistent: true,
      metadata: { service: serviceName, action: 'error', error }
    }
  );
}

export function notifyConnectionLost(serviceName: string) {
  addWarningNotification(
    'Connection Lost',
    `Lost connection to ${serviceName}`,
    { 
      persistent: true,
      metadata: { service: serviceName, action: 'disconnect' }
    }
  );
}

export function notifyConnectionRestored(serviceName: string) {
  addSuccessNotification(
    'Connection Restored',
    `Reconnected to ${serviceName}`,
    { metadata: { service: serviceName, action: 'reconnect' } }
  );
}

export function notifyDeviceDetected(deviceCount: number) {
  addInfoNotification(
    'New Devices Detected',
    `Found ${deviceCount} new device${deviceCount > 1 ? 's' : ''}`,
    { metadata: { action: 'device_detection', count: deviceCount } }
  );
}

export function notifySystemAlert(level: 'warning' | 'error' | 'critical', message: string) {
  const type = level === 'critical' ? 'error' : level === 'error' ? 'error' : 'warning';
  addNotification(
    type,
    'System Alert',
    message,
    { 
      persistent: level === 'critical',
      metadata: { level, action: 'system_alert' }
    }
  );
}