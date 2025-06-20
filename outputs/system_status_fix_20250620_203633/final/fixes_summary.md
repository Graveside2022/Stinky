# IP Address and MGRS Fixes Summary

## Fixes Applied

### 1. Client IP Address Fix
**File**: `/src/nodejs/kismet-operations/server.js`
**Lines**: 621-632

**Change**: Modified the `/info` endpoint to return the client's IP address instead of the server's IP.

```javascript
// OLD: Getting server's own IP
const networkInterfaces = os.networkInterfaces();
// ... loop through interfaces ...

// NEW: Getting client's IP
let ipAddress = req.headers['x-forwarded-for'] || 
                req.headers['x-real-ip'] || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                req.ip;
```

### 2. MGRS Display Fix
**File**: `/src/nodejs/kismet-operations/views/hi.html`
**Line Removed**: 1528

**Change**: Removed the line that was overwriting the calculated MGRS value with a non-existent server field.

```javascript
// REMOVED: This line was overwriting the calculated MGRS
document.getElementById('gps-mgrs').textContent = data.gps.mgrs || '--';
```

## Expected Results

1. **IP Address**: Will now show the connecting client's IP address
   - If accessed locally: May show 127.0.0.1 or ::1
   - If accessed from network: Will show actual client IP
   - If behind proxy: Will show proxy IP (unless X-Forwarded-For header is set)

2. **MGRS**: Will now show calculated value
   - Format: Military Grid Reference System coordinates
   - Example: "10SEG0195308450" for San Francisco coordinates
   - Calculated client-side using mgrs.js library

## Testing

To verify the fixes:
1. Access http://[your-pi-ip]:8002/ from a different device on the network
2. Check System Status box:
   - IP should show your device's IP (not 10.42.0.1)
   - MGRS should show calculated coordinates (not "--")

## Notes
- Client IP detection works best when accessed from external devices
- MGRS calculation depends on valid GPS coordinates
- Both fixes are independent and don't affect other functionality