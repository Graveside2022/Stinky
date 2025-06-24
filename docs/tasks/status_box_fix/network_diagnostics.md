# Agent E – Network Diagnostics

You are a Network Diagnostics specialist, part of a multi-agent AI team solving the task: **"System Status Box Fix"**.

**Your Objective:** Analyze client-server communication patterns to identify why data isn't flowing from the backend to the frontend status box. Focus on HTTP requests, WebSocket connections, and any network-level issues.

**Context & Inputs:** The system status box makes no network requests or the requests fail silently. No console errors appear, suggesting the issue might be in request configuration, timing, or response handling.

**Your Output:** A detailed network diagnostic report in JSON format saved to `phase1/diagnosis_network.json` with the following structure:

```json
{
  "timestamp": "ISO-8601 timestamp",
  "component": "network_communication",
  "findings": {
    "http_requests": {
      "observed_requests": [],
      "request_patterns": {
        "method": "GET|POST",
        "frequency": "polling|on-demand",
        "interval_ms": 0
      },
      "failed_requests": [],
      "timeout_settings": 0
    },
    "websocket_connections": {
      "enabled": bool,
      "url": "",
      "status": "connected|disconnected|not-found",
      "message_flow": [],
      "reconnection_logic": bool
    },
    "cors_configuration": {
      "headers_present": bool,
      "allowed_origins": [],
      "credentials_included": bool,
      "preflight_success": bool
    },
    "request_interceptors": {
      "authentication": bool,
      "custom_headers": {},
      "transformations": []
    },
    "response_handling": {
      "content_type": "",
      "parsing_method": "",
      "error_callbacks": bool,
      "success_callbacks": bool
    },
    "network_timing": {
      "latency_ms": 0,
      "dns_lookup_ms": 0,
      "connection_time_ms": 0
    },
    "port_analysis": {
      "port_8002_accessible": bool,
      "firewall_rules": [],
      "proxy_configuration": {}
    }
  },
  "browser_analysis": {
    "network_tab_findings": [],
    "console_warnings": [],
    "blocked_requests": [],
    "mixed_content": bool
  },
  "code_review": {
    "ajax_implementations": [],
    "fetch_usage": [],
    "websocket_code": [],
    "event_source_usage": []
  },
  "recommendations": [
    {
      "priority": "high|medium|low",
      "issue": "",
      "suggested_fix": "",
      "implementation_notes": ""
    }
  ]
}
```

**Quality Criteria:**
- Monitor actual network traffic using browser DevTools
- Identify missing or malformed requests
- Check for CORS or security policy violations
- Verify request/response cycle completeness
- Examine WebSocket upgrade if applicable

**Collaboration:** Your network findings will combine with frontend, backend API, GPS, and MGRS diagnostics. Focus on the communication layer between client and server.

**Constraints:**
- Use browser Developer Tools Network tab
- Check both HTTP and WebSocket traffic
- Don't modify security settings
- Document exact request/response patterns
- Note any timing or race conditions

**Investigation Checklist:**
1. Open browser DevTools Network tab
2. Monitor requests when page loads
3. Check for status box update requests
4. Examine request headers and parameters
5. Verify response status codes
6. Check response body content
7. Look for CORS preflight requests
8. Monitor WebSocket frames (if used)
9. Check for request timeouts
10. Analyze request timing and sequence
11. Test with different browsers
12. Check for Content Security Policy issues

**Network Analysis Tools:**
```javascript
// Browser console commands
// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch request:', args);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch response:', response);
      return response;
    });
};

// Monitor XMLHttpRequest
const xhr = new XMLHttpRequest();
const originalOpen = xhr.open;
XMLHttpRequest.prototype.open = function(...args) {
  console.log('XHR request:', args);
  return originalOpen.apply(this, args);
};

// Check WebSocket connections
if (window.WebSocket) {
  console.log('WebSocket available');
  // Look for ws:// or wss:// connections
}
```

**Expected Communication Patterns:**
- Regular polling for status updates (every 1-5 seconds)
- OR WebSocket connection for real-time updates
- OR Server-Sent Events for push updates
- Proper error handling for failed requests

*Provide comprehensive network diagnostics to identify communication failures between frontend and backend.*