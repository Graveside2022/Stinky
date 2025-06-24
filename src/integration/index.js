/**
 * Stinkster Integration Library
 * Main entry point for cross-application integration
 */

// Import integration components
const UnifiedNavigation = require('./components/UnifiedNavigation.js');
const authStore = require('./stores/AuthStore.js');
const messageBus = require('./services/MessageBus.js');
const { DataSharing, DATA_KEYS } = require('./utils/DataSharing.js');
const themeManager = require('./utils/ThemeManager.js');

class StinksterIntegration {
    constructor(config = {}) {
        this.config = {
            app: config.app || this.detectApp(),
            enableNav: config.enableNav !== false,
            enableAuth: config.enableAuth !== false,
            enableMessaging: config.enableMessaging !== false,
            enableDataSharing: config.enableDataSharing !== false,
            enableTheming: config.enableTheming !== false,
            ...config
        };

        this.components = {};
        this.initialized = false;
    }

    // Detect current app from URL
    detectApp() {
        const path = window.location.pathname;
        if (path.includes('kismet')) return 'kismet';
        if (path.includes('hackrf')) return 'hackrf';
        if (path.includes('wigle')) return 'wigle';
        return 'unknown';
    }

    // Initialize integration
    async init() {
        if (this.initialized) {
            console.warn('Stinkster Integration already initialized');
            return this;
        }

        console.log(`Initializing Stinkster Integration for ${this.config.app} app...`);

        // Initialize theme manager first (affects UI)
        if (this.config.enableTheming) {
            this.components.theme = themeManager;
            console.log('Theme manager initialized');
        }

        // Initialize authentication
        if (this.config.enableAuth) {
            this.components.auth = authStore;
            console.log('Authentication store initialized');
        }

        // Initialize message bus
        if (this.config.enableMessaging) {
            this.components.messageBus = messageBus;
            console.log('Message bus initialized');
        }

        // Initialize data sharing
        if (this.config.enableDataSharing) {
            this.components.dataSharing = new DataSharing(messageBus);
            this.setupDefaultDataSources();
            console.log('Data sharing initialized');
        }

        // Initialize navigation (should be last as it modifies DOM)
        if (this.config.enableNav) {
            this.components.nav = new UnifiedNavigation({
                currentApp: this.config.app,
                authStore: this.components.auth,
                theme: themeManager.getTheme(),
                onNavigate: this.config.onNavigate
            });
            
            // Initialize navigation after DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.components.nav.init();
                });
            } else {
                this.components.nav.init();
            }
            
            console.log('Unified navigation initialized');
        }

        // Setup cross-component connections
        this.setupConnections();

        // Call app-specific initialization
        if (this.config.onInit) {
            await this.config.onInit(this);
        }

        this.initialized = true;
        console.log('Stinkster Integration initialized successfully');

        return this;
    }

    // Setup default data sources
    setupDefaultDataSources() {
        const ds = this.components.dataSharing;

        // System status
        ds.registerDataSource(DATA_KEYS.SYSTEM_STATUS, {
            type: 'local',
            syncInterval: 30000, // 30 seconds
            initialData: {
                app: this.config.app,
                timestamp: Date.now(),
                status: 'online'
            }
        });

        // User settings
        ds.registerDataSource(DATA_KEYS.USER_SETTINGS, {
            type: 'persistent',
            validate: (data) => typeof data === 'object'
        });

        // GPS location (if available)
        ds.registerDataSource(DATA_KEYS.GPS_LOCATION, {
            type: 'stream',
            validate: (data) => {
                return data && 
                    typeof data.latitude === 'number' &&
                    typeof data.longitude === 'number';
            }
        });
    }

    // Setup cross-component connections
    setupConnections() {
        // Connect theme changes to navigation
        if (this.components.theme && this.components.nav) {
            this.components.theme.onChange((theme) => {
                this.components.nav.applyTheme(theme);
            });
        }

        // Connect auth changes to navigation
        if (this.components.auth && this.components.nav) {
            this.components.auth.on('change', () => {
                this.components.nav.updateAuthStatus();
            });
        }

        // Setup message handlers
        if (this.components.messageBus && this.components.nav) {
            this.components.nav.onMessage((message) => {
                this.components.messageBus.publish('nav:message', message);
            });
        }
    }

    // Get component
    get(component) {
        return this.components[component];
    }

    // Convenience methods
    get auth() { return this.components.auth; }
    get theme() { return this.components.theme; }
    get messageBus() { return this.components.messageBus; }
    get dataSharing() { return this.components.dataSharing; }
    get nav() { return this.components.nav; }

    // Send message to other apps
    sendMessage(topic, data, options) {
        if (!this.components.messageBus) {
            console.error('Message bus not enabled');
            return null;
        }
        return this.components.messageBus.publish(topic, data, options);
    }

    // Share data with other apps
    shareData(key, data, options) {
        if (!this.components.dataSharing) {
            console.error('Data sharing not enabled');
            return false;
        }
        return this.components.dataSharing.shareData(key, data, options);
    }

    // Subscribe to data changes
    onDataChange(key, callback, options) {
        if (!this.components.dataSharing) {
            console.error('Data sharing not enabled');
            return () => {};
        }
        return this.components.dataSharing.subscribe(key, callback, options);
    }

    // Subscribe to messages
    onMessage(topic, callback, options) {
        if (!this.components.messageBus) {
            console.error('Message bus not enabled');
            return () => {};
        }
        return this.components.messageBus.subscribe(topic, callback, options);
    }

    // Get current user
    getUser() {
        return this.components.auth?.getUser() || null;
    }

    // Check permission
    hasPermission(permission) {
        return this.components.auth?.hasPermission(permission) || false;
    }

    // Change theme
    setTheme(theme) {
        return this.components.theme?.setTheme(theme) || false;
    }

    // Destroy integration
    destroy() {
        if (this.components.messageBus) {
            this.components.messageBus.destroy();
        }
        if (this.components.dataSharing) {
            this.components.dataSharing.clear();
        }
        
        this.components = {};
        this.initialized = false;
    }
}

// Create convenience factory function
function createIntegration(config) {
    const integration = new StinksterIntegration(config);
    return integration.init();
}

// Export everything
module.exports = {
    StinksterIntegration,
    createIntegration,
    UnifiedNavigation,
    authStore,
    messageBus,
    DataSharing,
    DATA_KEYS,
    themeManager
};

// Also expose globally for browser usage
if (typeof window !== 'undefined') {
    window.StinksterIntegration = StinksterIntegration;
    window.createStinksterIntegration = createIntegration;
}