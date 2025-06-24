# Stinkster Cross-Application Integration

This integration system unifies the HackRF, WigleToTAK, and Kismet applications into a cohesive platform with shared authentication, navigation, theming, and data exchange.

## Quick Start

Add integration to any Stinkster app by including this single line in your HTML:

```html
<script src="/integration/loader.js" data-app="kismet"></script>
```

## Features

### 1. Unified Navigation
- Consistent navigation header across all apps
- Quick switching between HackRF, WigleToTAK, and Kismet
- Mobile-responsive design
- Visual indicators for active app

### 2. Shared Authentication
- Single sign-on across all applications
- Role-based permissions (admin, user, guest)
- Persistent sessions with cross-tab sync
- Secure token management

### 3. Cross-App Messaging
- Real-time communication between apps
- Multiple transport channels (WebSocket, BroadcastChannel, localStorage)
- Request-response pattern support
- Event-driven architecture

### 4. Data Sharing
- Synchronized data across applications
- Type-safe data transformations
- Automatic validation
- Real-time updates

### 5. Consistent Theming
- Dark, Light, and Matrix themes
- Synchronized theme changes
- CSS variable-based system
- App-specific accent colors

## Architecture

```
/integration/
├── components/          # UI components
│   └── UnifiedNavigation.js
├── stores/             # State management
│   └── AuthStore.js
├── services/           # Core services
│   └── MessageBus.js
├── utils/              # Utilities
│   ├── DataSharing.js
│   └── ThemeManager.js
├── adapters/           # App-specific adapters
│   ├── kismet-adapter.js
│   ├── hackrf-adapter.js
│   └── wigle-adapter.js
├── examples/           # Example implementations
│   └── kismet-integration.html
├── loader.js           # Simple integration loader
└── index.js           # Main integration library
```

## Integration Methods

### Method 1: Simple Loader (Recommended)
```html
<!-- Add to existing HTML -->
<script src="/integration/loader.js" data-app="kismet"></script>
```

### Method 2: Full Integration
```javascript
// Initialize with custom configuration
const integration = await createStinksterIntegration({
    app: 'kismet',
    enableNav: true,
    enableAuth: true,
    enableMessaging: true,
    enableDataSharing: true,
    enableTheming: true,
    onInit: (int) => {
        console.log('Integration ready!');
    }
});
```

### Method 3: Individual Components
```javascript
// Use components separately
const nav = new UnifiedNavigation({ currentApp: 'kismet' });
nav.init();

// Use auth store
authStore.login({ username: 'admin', password: 'admin' });

// Use message bus
messageBus.publish('data:update', { devices: [...] });
```

## Data Flow Examples

### 1. Kismet → WigleToTAK
```javascript
// In Kismet: Share WiFi devices
integration.shareData(DATA_KEYS.WIFI_DEVICES, devices);

// In WigleToTAK: Receive devices
integration.onDataChange(DATA_KEYS.WIFI_DEVICES, (devices) => {
    convertToTAK(devices);
});
```

### 2. HackRF → Kismet
```javascript
// In HackRF: Share spectrum data
integration.shareData(DATA_KEYS.SPECTRUM_DATA, {
    frequency: 2437000000,
    power: [...],
    peaks: [...]
});

// In Kismet: Display spectrum info
integration.onDataChange(DATA_KEYS.SPECTRUM_DATA, (data) => {
    updateSpectrumDisplay(data);
});
```

### 3. Cross-App Navigation
```javascript
// Send device to HackRF for analysis
integration.sendMessage('hackrf:tune:frequency', {
    frequency: 2437000000,
    source: 'kismet',
    reason: 'Analyze suspicious device'
});

// Navigate to HackRF
integration.nav.navigateToApp('hackrf');
```

## Message Topics

Common message topics for cross-app communication:

- `auth:login` - User logged in
- `auth:logout` - User logged out
- `nav:change` - Navigation occurred
- `data:update` - Data updated
- `kismet:device:update` - Kismet device update
- `hackrf:spectrum:update` - HackRF spectrum update
- `wigle:scan:update` - WigleToTAK scan update
- `notify:*` - Notification messages

## Authentication Levels

- **Guest**: Read-only access to public data
- **User**: Read access to all apps, limited write access
- **Admin**: Full access to all features and settings

## Theme Support

Applications automatically support three themes:

1. **Dark Cyber** (Default): Blue/purple cyberpunk theme
2. **Light Modern**: Clean light theme for daytime use
3. **Matrix**: Green-on-black terminal theme

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (no BroadcastChannel)
- Mobile browsers: Responsive design with touch support

## Development

### Adding to a New App

1. Include the loader script
2. Create an adapter in `/adapters/`
3. Define data sources and message handlers
4. Test cross-app communication

### Creating Custom Themes

```javascript
themeManager.setCustomProperty('--app-accent', '#ff00ff');
```

### Extending Data Sharing

```javascript
// Register custom data source
integration.dataSharing.registerDataSource('my-data', {
    type: 'stream',
    validate: (data) => true,
    transform: (data) => data
});
```

## Security Considerations

- Authentication tokens are stored securely
- Cross-origin requests are blocked
- Message validation prevents injection
- Permissions are enforced at multiple levels

## Performance

- Lazy loading of components
- Efficient message batching
- Minimal DOM manipulation
- WebSocket connection pooling