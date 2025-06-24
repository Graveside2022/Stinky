/**
 * Unified Navigation Header Component
 * Provides consistent navigation across all Stinkster applications
 */

class UnifiedNavigation {
    constructor(config = {}) {
        this.currentApp = config.currentApp || 'kismet';
        this.authStore = config.authStore || null;
        this.theme = config.theme || 'dark';
        this.onNavigate = config.onNavigate || (() => {});
        this.container = null;
        this.messageHandler = null;
    }

    // Application configurations
    apps = {
        kismet: {
            name: 'Kismet Operations',
            path: '/kismet-operations/',
            icon: '📡',
            color: '#00d2ff',
            description: 'WiFi scanning & network monitoring'
        },
        hackrf: {
            name: 'HackRF Spectrum',
            path: '/hackrf/',
            icon: '📊',
            color: '#00ff00',
            description: 'SDR spectrum analyzer'
        },
        wigle: {
            name: 'WigleToTAK',
            path: '/wigle-to-tak/',
            icon: '🗺️',
            color: '#ffcc00',
            description: 'TAK data converter'
        }
    };

    // Create navigation HTML
    createHTML() {
        const navItems = Object.entries(this.apps).map(([key, app]) => {
            const isActive = key === this.currentApp;
            return `
                <a href="${app.path}" 
                   class="nav-item ${isActive ? 'active' : ''}"
                   data-app="${key}"
                   title="${app.description}">
                    <span class="nav-icon">${app.icon}</span>
                    <span class="nav-text">${app.name}</span>
                    ${isActive ? '<span class="nav-indicator"></span>' : ''}
                </a>
            `;
        }).join('');

        return `
            <nav class="unified-navigation" data-theme="${this.theme}">
                <div class="nav-brand">
                    <img src="/images/stinkster-logo.png" alt="Stinkster" class="nav-logo" onerror="this.style.display='none'">
                    <span class="nav-title">Stinkster Control</span>
                </div>
                <div class="nav-apps">
                    ${navItems}
                </div>
                <div class="nav-controls">
                    <button class="nav-btn theme-toggle" title="Toggle theme">
                        <span class="theme-icon">🌙</span>
                    </button>
                    <button class="nav-btn auth-status" title="Authentication status">
                        <span class="auth-icon">👤</span>
                        <span class="auth-text">Guest</span>
                    </button>
                    <button class="nav-btn nav-menu-toggle" title="Menu">
                        <span class="menu-icon">☰</span>
                    </button>
                </div>
            </nav>
            <div class="nav-mobile-menu">
                <div class="mobile-menu-content">
                    ${navItems}
                    <div class="mobile-menu-divider"></div>
                    <button class="mobile-menu-item theme-toggle-mobile">
                        <span>🌙</span> Toggle Theme
                    </button>
                    <button class="mobile-menu-item auth-status-mobile">
                        <span>👤</span> <span class="auth-text">Guest</span>
                    </button>
                </div>
            </div>
        `;
    }

    // Create styles
    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .unified-navigation {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: var(--nav-bg, rgba(10, 10, 10, 0.95));
                backdrop-filter: blur(10px);
                border-bottom: 1px solid var(--nav-border, rgba(255, 255, 255, 0.1));
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
                z-index: 9999;
                transition: all 0.3s ease;
            }

            .nav-brand {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .nav-logo {
                height: 32px;
                width: auto;
            }

            .nav-title {
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary, #fff);
                letter-spacing: 0.5px;
            }

            .nav-apps {
                display: flex;
                gap: 8px;
                flex: 1;
                justify-content: center;
                max-width: 600px;
                margin: 0 auto;
            }

            .nav-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                border-radius: 8px;
                text-decoration: none;
                color: var(--text-secondary, #b8c5e0);
                background: rgba(255, 255, 255, 0.05);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .nav-item:hover {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary, #fff);
                transform: translateY(-2px);
            }

            .nav-item.active {
                background: var(--app-color, rgba(0, 210, 255, 0.15));
                color: var(--text-primary, #fff);
                box-shadow: 0 4px 12px rgba(0, 210, 255, 0.3);
            }

            .nav-indicator {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: var(--app-color, #00d2ff);
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }

            .nav-icon {
                font-size: 20px;
                filter: grayscale(0.3);
                transition: filter 0.3s ease;
            }

            .nav-item:hover .nav-icon,
            .nav-item.active .nav-icon {
                filter: grayscale(0);
            }

            .nav-text {
                font-size: 14px;
                font-weight: 500;
                white-space: nowrap;
            }

            .nav-controls {
                display: flex;
                gap: 12px;
                align-items: center;
            }

            .nav-btn {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 8px 12px;
                color: var(--text-secondary, #b8c5e0);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
            }

            .nav-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary, #fff);
                transform: translateY(-1px);
            }

            .nav-menu-toggle {
                display: none;
            }

            .nav-mobile-menu {
                position: fixed;
                top: 60px;
                left: 0;
                right: 0;
                background: var(--nav-bg, rgba(10, 10, 10, 0.98));
                backdrop-filter: blur(10px);
                border-bottom: 1px solid var(--nav-border, rgba(255, 255, 255, 0.1));
                transform: translateY(-100%);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 9998;
                pointer-events: none;
            }

            .nav-mobile-menu.active {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }

            .mobile-menu-content {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .mobile-menu-content .nav-item {
                width: 100%;
                justify-content: flex-start;
            }

            .mobile-menu-divider {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 12px 0;
            }

            .mobile-menu-item {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 12px 16px;
                color: var(--text-secondary, #b8c5e0);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 16px;
                width: 100%;
                text-align: left;
            }

            /* Theme-specific styles */
            [data-theme="dark"] .unified-navigation {
                --nav-bg: rgba(10, 10, 10, 0.95);
                --nav-border: rgba(255, 255, 255, 0.1);
                --text-primary: #ffffff;
                --text-secondary: #b8c5e0;
            }

            [data-theme="light"] .unified-navigation {
                --nav-bg: rgba(255, 255, 255, 0.95);
                --nav-border: rgba(0, 0, 0, 0.1);
                --text-primary: #1a1a1a;
                --text-secondary: #666666;
            }

            /* App-specific colors */
            .nav-item[data-app="kismet"].active {
                --app-color: #00d2ff;
            }

            .nav-item[data-app="hackrf"].active {
                --app-color: #00ff00;
            }

            .nav-item[data-app="wigle"].active {
                --app-color: #ffcc00;
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .nav-text {
                    display: none;
                }

                .nav-apps {
                    gap: 4px;
                }

                .nav-item {
                    padding: 8px 12px;
                }

                .nav-menu-toggle {
                    display: flex;
                }

                .auth-text {
                    display: none;
                }
            }

            @media (max-width: 480px) {
                .nav-title {
                    display: none;
                }
            }

            /* Add padding to body to account for fixed nav */
            body {
                padding-top: 70px !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize navigation
    init(targetSelector = 'body') {
        // Create styles
        this.createStyles();

        // Create navigation HTML
        const container = document.querySelector(targetSelector);
        const navContainer = document.createElement('div');
        navContainer.innerHTML = this.createHTML();
        
        // Insert at beginning of body
        container.insertBefore(navContainer.firstElementChild, container.firstChild);
        container.insertBefore(navContainer.lastElementChild, container.children[1]);

        this.container = container.querySelector('.unified-navigation');

        // Bind events
        this.bindEvents();

        // Initialize theme
        this.applyTheme(this.theme);

        // Initialize auth state
        this.updateAuthStatus();

        // Setup cross-app messaging
        this.setupMessaging();

        return this;
    }

    // Bind event handlers
    bindEvents() {
        // Navigation clicks
        this.container.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const app = item.dataset.app;
                this.navigateToApp(app);
            });
        });

        // Theme toggle
        this.container.querySelector('.theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Mobile theme toggle
        document.querySelector('.theme-toggle-mobile').addEventListener('click', () => {
            this.toggleTheme();
            this.toggleMobileMenu();
        });

        // Mobile menu toggle
        this.container.querySelector('.nav-menu-toggle').addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Auth status click
        this.container.querySelector('.auth-status').addEventListener('click', () => {
            this.showAuthDialog();
        });

        // Mobile auth click
        document.querySelector('.auth-status-mobile').addEventListener('click', () => {
            this.showAuthDialog();
            this.toggleMobileMenu();
        });

        // Close mobile menu on outside click
        document.addEventListener('click', (e) => {
            const mobileMenu = document.querySelector('.nav-mobile-menu');
            const menuToggle = this.container.querySelector('.nav-menu-toggle');
            if (!mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                mobileMenu.classList.remove('active');
            }
        });
    }

    // Navigate to app
    navigateToApp(appKey) {
        const app = this.apps[appKey];
        if (!app) return;

        // Store current app state
        this.storeAppState();

        // Notify about navigation
        this.onNavigate(appKey, app);

        // Broadcast navigation event
        this.broadcastMessage({
            type: 'navigation',
            from: this.currentApp,
            to: appKey,
            timestamp: Date.now()
        });

        // Navigate
        window.location.href = app.path;
    }

    // Toggle theme
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.theme);
        
        // Store theme preference
        localStorage.setItem('stinkster-theme', this.theme);

        // Broadcast theme change
        this.broadcastMessage({
            type: 'theme-change',
            theme: this.theme,
            timestamp: Date.now()
        });
    }

    // Apply theme
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.container.setAttribute('data-theme', theme);
        
        // Update theme icon
        const themeIcon = this.container.querySelector('.theme-icon');
        themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    // Toggle mobile menu
    toggleMobileMenu() {
        const mobileMenu = document.querySelector('.nav-mobile-menu');
        mobileMenu.classList.toggle('active');
    }

    // Update auth status
    updateAuthStatus() {
        if (!this.authStore) return;

        const user = this.authStore.getUser();
        const authTexts = document.querySelectorAll('.auth-text');
        
        authTexts.forEach(el => {
            el.textContent = user ? user.name : 'Guest';
        });

        // Update auth icon color
        const authBtns = document.querySelectorAll('.auth-status, .auth-status-mobile');
        authBtns.forEach(btn => {
            if (user) {
                btn.style.color = '#00ff00';
            } else {
                btn.style.color = 'inherit';
            }
        });
    }

    // Show auth dialog
    showAuthDialog() {
        // This would open an auth modal or redirect to login
        console.log('Show auth dialog');
        
        // Broadcast auth request
        this.broadcastMessage({
            type: 'auth-request',
            app: this.currentApp,
            timestamp: Date.now()
        });
    }

    // Store app state before navigation
    storeAppState() {
        const state = {
            app: this.currentApp,
            timestamp: Date.now(),
            scrollPosition: window.scrollY,
            // Add any app-specific state here
        };
        
        sessionStorage.setItem(`stinkster-state-${this.currentApp}`, JSON.stringify(state));
    }

    // Setup cross-app messaging
    setupMessaging() {
        // Listen for messages from other apps
        window.addEventListener('message', (event) => {
            // Verify origin
            if (event.origin !== window.location.origin) return;

            const message = event.data;
            if (message.type === 'stinkster-message') {
                this.handleMessage(message.data);
            }
        });

        // Listen for storage events (cross-tab communication)
        window.addEventListener('storage', (event) => {
            if (event.key === 'stinkster-broadcast') {
                const message = JSON.parse(event.newValue);
                this.handleMessage(message);
            }
        });
    }

    // Handle incoming messages
    handleMessage(message) {
        switch (message.type) {
            case 'theme-change':
                if (message.theme !== this.theme) {
                    this.theme = message.theme;
                    this.applyTheme(this.theme);
                }
                break;
            
            case 'auth-update':
                this.updateAuthStatus();
                break;
            
            case 'data-update':
                if (this.messageHandler) {
                    this.messageHandler(message);
                }
                break;
        }
    }

    // Broadcast message to other apps
    broadcastMessage(data) {
        // Post to all iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            iframe.contentWindow.postMessage({
                type: 'stinkster-message',
                data: data
            }, '*');
        });

        // Use localStorage for cross-tab communication
        localStorage.setItem('stinkster-broadcast', JSON.stringify(data));
        
        // Clean up after broadcast
        setTimeout(() => {
            localStorage.removeItem('stinkster-broadcast');
        }, 100);
    }

    // Set message handler
    onMessage(handler) {
        this.messageHandler = handler;
        return this;
    }

    // Public method to send data to other apps
    sendData(targetApp, data) {
        this.broadcastMessage({
            type: 'data-update',
            from: this.currentApp,
            to: targetApp,
            data: data,
            timestamp: Date.now()
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedNavigation;
} else {
    window.UnifiedNavigation = UnifiedNavigation;
}