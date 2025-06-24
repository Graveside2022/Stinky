/**
 * Shared Authentication Store
 * Manages authentication state across all Stinkster applications
 */

class AuthStore {
    constructor() {
        this.user = null;
        this.token = null;
        this.permissions = new Set();
        this.listeners = new Map();
        this.storage = window.localStorage;
        this.storageKey = 'stinkster-auth';
        
        // Initialize from storage
        this.loadFromStorage();
        
        // Listen for cross-tab changes
        this.setupStorageListener();
    }

    // Load auth data from storage
    loadFromStorage() {
        try {
            const stored = this.storage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.user = data.user;
                this.token = data.token;
                this.permissions = new Set(data.permissions || []);
                
                // Validate token expiry
                if (data.expiry && Date.now() > data.expiry) {
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Failed to load auth data:', error);
            this.logout();
        }
    }

    // Save auth data to storage
    saveToStorage() {
        try {
            const data = {
                user: this.user,
                token: this.token,
                permissions: Array.from(this.permissions),
                expiry: this.token ? Date.now() + (24 * 60 * 60 * 1000) : null // 24 hours
            };
            this.storage.setItem(this.storageKey, JSON.stringify(data));
            
            // Broadcast auth change
            this.broadcastAuthChange();
        } catch (error) {
            console.error('Failed to save auth data:', error);
        }
    }

    // Setup storage listener for cross-tab sync
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.storageKey) {
                this.loadFromStorage();
                this.notifyListeners('sync', { source: 'storage' });
            }
        });
    }

    // Login user
    async login(credentials) {
        try {
            // In a real app, this would make an API call
            const response = await this.authenticateUser(credentials);
            
            if (response.success) {
                this.user = response.user;
                this.token = response.token;
                this.permissions = new Set(response.permissions || []);
                
                this.saveToStorage();
                this.notifyListeners('login', { user: this.user });
                
                return { success: true, user: this.user };
            } else {
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('Login failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Mock authentication (replace with real API call)
    async authenticateUser(credentials) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock validation
        if (credentials.username === 'admin' && credentials.password === 'admin') {
            return {
                success: true,
                user: {
                    id: '1',
                    username: 'admin',
                    name: 'Administrator',
                    email: 'admin@stinkster.local',
                    role: 'admin'
                },
                token: 'mock-jwt-token-' + Date.now(),
                permissions: ['read', 'write', 'admin', 'kismet', 'hackrf', 'wigle']
            };
        } else if (credentials.username === 'user' && credentials.password === 'user') {
            return {
                success: true,
                user: {
                    id: '2',
                    username: 'user',
                    name: 'Standard User',
                    email: 'user@stinkster.local',
                    role: 'user'
                },
                token: 'mock-jwt-token-' + Date.now(),
                permissions: ['read', 'kismet', 'hackrf', 'wigle']
            };
        } else {
            return {
                success: false,
                error: 'Invalid credentials'
            };
        }
    }

    // Logout user
    logout() {
        this.user = null;
        this.token = null;
        this.permissions.clear();
        
        this.storage.removeItem(this.storageKey);
        this.notifyListeners('logout', {});
        this.broadcastAuthChange();
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Check permission
    hasPermission(permission) {
        return this.permissions.has(permission) || this.permissions.has('admin');
    }

    // Check multiple permissions (AND)
    hasAllPermissions(...permissions) {
        return permissions.every(p => this.hasPermission(p));
    }

    // Check multiple permissions (OR)
    hasAnyPermission(...permissions) {
        return permissions.some(p => this.hasPermission(p));
    }

    // Add listener for auth changes
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    // Remove listener
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    // Notify listeners
    notifyListeners(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Auth listener error:', error);
                }
            });
        }
        
        // Also notify 'change' listeners for any event
        if (event !== 'change') {
            this.notifyListeners('change', { event, ...data });
        }
    }

    // Broadcast auth change to other apps
    broadcastAuthChange() {
        // Use custom event for same-window communication
        window.dispatchEvent(new CustomEvent('stinkster-auth-change', {
            detail: {
                authenticated: this.isAuthenticated(),
                user: this.user,
                timestamp: Date.now()
            }
        }));
        
        // Use postMessage for iframe communication
        window.postMessage({
            type: 'stinkster-message',
            data: {
                type: 'auth-update',
                authenticated: this.isAuthenticated(),
                user: this.user
            }
        }, window.location.origin);
    }

    // Create auth headers for API requests
    getAuthHeaders() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`,
                'X-User-ID': this.user?.id || ''
            };
        }
        return {};
    }

    // Refresh token (if needed)
    async refreshToken() {
        if (!this.token) return false;
        
        try {
            // In a real app, this would call a refresh endpoint
            // For now, just extend the expiry
            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    // Get auth state summary
    getState() {
        return {
            authenticated: this.isAuthenticated(),
            user: this.user,
            permissions: Array.from(this.permissions),
            hasToken: !!this.token
        };
    }
}

// Create singleton instance
const authStore = new AuthStore();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authStore;
} else {
    window.authStore = authStore;
}