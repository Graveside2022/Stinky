/**
 * Stinkster Integration Loader
 * Simple script to add integration capabilities to existing apps
 * 
 * Usage: Add this script tag to your HTML:
 * <script src="/integration/loader.js" data-app="kismet"></script>
 */

(function() {
    'use strict';
    
    // Get app name from script tag
    const currentScript = document.currentScript;
    const appName = currentScript?.dataset?.app || detectApp();
    
    console.log(`[Stinkster Integration] Loading for ${appName} app...`);
    
    // Detect app from URL if not specified
    function detectApp() {
        const path = window.location.pathname;
        if (path.includes('kismet')) return 'kismet';
        if (path.includes('hackrf')) return 'hackrf';
        if (path.includes('wigle')) return 'wigle';
        return 'unknown';
    }
    
    // Load required scripts in order
    const scripts = [
        '/integration/stores/AuthStore.js',
        '/integration/services/MessageBus.js',
        '/integration/utils/DataSharing.js',
        '/integration/utils/ThemeManager.js',
        '/integration/components/UnifiedNavigation.js'
    ];
    
    // Load adapter based on app
    const adapters = {
        kismet: '/integration/adapters/kismet-adapter.js',
        hackrf: '/integration/adapters/hackrf-adapter.js',
        wigle: '/integration/adapters/wigle-adapter.js'
    };
    
    let loadedCount = 0;
    
    // Load scripts sequentially
    function loadNextScript() {
        if (loadedCount >= scripts.length) {
            // All core scripts loaded, now load adapter
            loadAdapter();
            return;
        }
        
        const script = document.createElement('script');
        script.src = scripts[loadedCount];
        script.onload = () => {
            loadedCount++;
            loadNextScript();
        };
        script.onerror = () => {
            console.error(`[Stinkster Integration] Failed to load ${scripts[loadedCount]}`);
            loadedCount++;
            loadNextScript();
        };
        document.head.appendChild(script);
    }
    
    // Load app-specific adapter
    function loadAdapter() {
        const adapterPath = adapters[appName];
        if (!adapterPath) {
            console.warn(`[Stinkster Integration] No adapter found for ${appName}`);
            initializeBasicIntegration();
            return;
        }
        
        const script = document.createElement('script');
        script.src = adapterPath;
        script.onload = () => {
            console.log(`[Stinkster Integration] ${appName} adapter loaded`);
        };
        script.onerror = () => {
            console.error(`[Stinkster Integration] Failed to load adapter for ${appName}`);
            initializeBasicIntegration();
        };
        document.head.appendChild(script);
    }
    
    // Initialize basic integration if no adapter
    function initializeBasicIntegration() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createBasicIntegration);
        } else {
            createBasicIntegration();
        }
    }
    
    // Create basic integration without adapter
    async function createBasicIntegration() {
        console.log('[Stinkster Integration] Initializing basic integration...');
        
        // Create minimal integration
        const integration = await window.createStinksterIntegration({
            app: appName,
            onInit: (int) => {
                console.log(`[Stinkster Integration] Basic integration ready for ${appName}`);
                
                // Expose to global scope
                window.stinksterIntegration = int;
                
                // Dispatch ready event
                window.dispatchEvent(new CustomEvent('stinkster:ready', {
                    detail: { integration: int, app: appName }
                }));
            }
        });
    }
    
    // Add loading indicator
    function showLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'stinkster-loading';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 10px 15px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            border: 1px solid #00ff00;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            z-index: 99999;
            animation: pulse 1s ease-in-out infinite;
        `;
        indicator.textContent = 'Loading Stinkster Integration...';
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
        
        // Remove after integration loads
        window.addEventListener('stinkster:ready', () => {
            setTimeout(() => {
                indicator.style.transition = 'opacity 0.5s ease';
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 500);
            }, 1000);
        });
    }
    
    // Start loading
    if (document.body) {
        showLoadingIndicator();
    } else {
        document.addEventListener('DOMContentLoaded', showLoadingIndicator);
    }
    
    loadNextScript();
    
    // Add global error handler for integration issues
    window.addEventListener('error', (event) => {
        if (event.filename && event.filename.includes('/integration/')) {
            console.error('[Stinkster Integration] Error:', event.message);
            event.preventDefault();
        }
    });
    
})();