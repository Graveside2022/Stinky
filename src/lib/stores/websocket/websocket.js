import { writable, derived } from 'svelte/store'
import io from 'socket.io-client'

/**
 * Generic WebSocket store factory for creating reactive WebSocket connections
 * @param {string} url - WebSocket URL
 * @param {Object} options - Socket.IO options
 * @returns {Object} WebSocket store with methods and reactive state
 */
export function createWebSocketStore(url, options = {}) {
  // Connection state
  const connected = writable(false)
  const connecting = writable(false)
  const error = writable(null)
  
  // Message stores
  const messages = writable([])
  const lastMessage = writable(null)
  
  let socket = null
  
  // Initialize connection
  function connect() {
    if (socket) return
    
    connecting.set(true)
    error.set(null)
    
    socket = io(url, {
      ...options,
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 5
    })
    
    // Connection events
    socket.on('connect', () => {
      connected.set(true)
      connecting.set(false)
      error.set(null)
    })
    
    socket.on('disconnect', () => {
      connected.set(false)
    })
    
    socket.on('connect_error', (err) => {
      error.set(err.message)
      connecting.set(false)
    })
    
    return socket
  }
  
  // Disconnect from WebSocket
  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
      connected.set(false)
    }
  }
  
  // Send message
  function emit(event, data) {
    if (socket && socket.connected) {
      socket.emit(event, data)
    }
  }
  
  // Subscribe to events
  function on(event, callback) {
    if (socket) {
      socket.on(event, callback)
    }
    
    // Return unsubscribe function
    return () => {
      if (socket) {
        socket.off(event, callback)
      }
    }
  }
  
  // Add message to store
  function addMessage(message) {
    messages.update(msgs => [...msgs, message])
    lastMessage.set(message)
  }
  
  // Clear messages
  function clearMessages() {
    messages.set([])
    lastMessage.set(null)
  }
  
  // Derived store for connection status
  const status = derived(
    [connected, connecting, error],
    ([$connected, $connecting, $error]) => {
      if ($connecting) return 'connecting'
      if ($connected) return 'connected'
      if ($error) return 'error'
      return 'disconnected'
    }
  )
  
  return {
    // State stores
    connected,
    connecting,
    error,
    messages,
    lastMessage,
    status,
    
    // Methods
    connect,
    disconnect,
    emit,
    on,
    addMessage,
    clearMessages,
    
    // Direct socket access (use carefully)
    get socket() { return socket }
  }
}