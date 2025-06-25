# API Endpoint Mapping - Flask vs Node.js

**Generated**: 2025-06-15T20:47:00Z  
**User**: Christian  
**Agent**: Agent 5 - API Compatibility Validation

## Overview

This document maps API endpoints between Flask and Node.js implementations to identify compatibility requirements and discrepancies.

## Spectrum Analyzer API Mapping

### Flask Implementation (Port 8092)

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/` | GET | Serve spectrum analyzer page | HTML template |
| `/api/status` | GET | Get system status | `openwebrx_connected`, `real_data`, `fft_buffer_size`, `config`, `last_fft_time`, `mode` |
| `/api/scan/<profile_id>` | GET | Scan frequency profile | `profile`, `scan_status`, `frequencies` |
| `/api/profiles` | GET | Get scan profiles | `profiles` (object with profile definitions) |

**Missing in Flask:**
- `/api/config` (GET/POST) - Configuration management

### Node.js Implementation (Port 3001)

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/` | GET | Serve spectrum analyzer page | HTML template |
| `/api/config` | GET | Get current configuration | `fft_size`, `center_freq`, `samp_rate`, `signal_threshold` |
| `/api/config` | POST | Update configuration | `success`, `message`, `config` |
| `/api/status` | GET | Get system status | `server_uptime`, `connected_clients`, `mode`, `openwebrx_connected`, `real_data`, `fft_buffer_size`, `last_fft_time` |
| `/api/profiles` | GET | Get scan profiles | Profile definitions |
| `/api/scan/:profileId` | GET | Scan frequency profile | Scan results |

**Additional in Node.js:**
- `/api/config` (GET/POST) - Configuration management
- Extended status fields: `server_uptime`, `connected_clients`

## WigleToTAK API Mapping

### Flask Implementation (Port 8000)

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/` | GET | Serve WigleToTAK page | HTML template |
| `/update_tak_settings` | POST | Update TAK server settings | Status confirmation |
| `/update_multicast_state` | POST | Toggle multicast | Status confirmation |
| `/update_analysis_mode` | POST | Change analysis mode | Status confirmation |
| `/update_antenna_sensitivity` | POST | Set antenna sensitivity | Status confirmation |
| `/get_antenna_settings` | GET | Get antenna configuration | `antenna_sensitivity`, `sensitivity_factors` |
| `/list_wigle_files` | GET | List available CSV files | File list |
| `/start_broadcast` | POST | Start TAK broadcasting | Status confirmation |
| `/stop_broadcast` | POST | Stop TAK broadcasting | Status confirmation |
| `/add_to_whitelist` | POST | Add SSID/MAC to whitelist | Status confirmation |
| `/remove_from_whitelist` | POST | Remove from whitelist | Status confirmation |
| `/add_to_blacklist` | POST | Add to blacklist | Status confirmation |
| `/remove_from_blacklist` | POST | Remove from blacklist | Status confirmation |

**Missing in Flask:**
- `/api/status` - No standardized status endpoint

### Node.js Implementation (Port 3002)

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/` | GET | Serve WigleToTAK page | HTML template |
| `/api/status` | GET | Get system status | `broadcasting`, `tak_server_ip`, `tak_server_port`, `analysis_mode`, `antenna_sensitivity` |
| `/update_tak_settings` | POST | Update TAK server settings | `success`, `message` |
| `/update_multicast_state` | POST | Toggle multicast | `success`, `message` |
| `/update_analysis_mode` | POST | Change analysis mode | `success`, `message` |
| `/update_antenna_sensitivity` | POST | Set antenna sensitivity | `success`, `message` |
| `/get_antenna_settings` | GET | Get antenna configuration | `antenna_sensitivity`, `sensitivity_factors` |
| `/add_to_whitelist` | POST | Add to whitelist | `success`, `message` |
| `/remove_from_whitelist` | POST | Remove from whitelist | `success`, `message` |
| `/add_to_blacklist` | POST | Add to blacklist | `success`, `message` |
| `/remove_from_blacklist` | POST | Remove from blacklist | `success`, `message` |
| `/list_wigle_files` | GET | List available CSV files | File list |
| `/start_broadcast` | POST | Start TAK broadcasting | `success`, `message` |
| `/stop_broadcast` | POST | Stop TAK broadcasting | `success`, `message` |

**Additional in Node.js:**
- `/api/status` - Standardized status endpoint
- Consistent response format with `success` and `message` fields

## Compatibility Issues Identified

### Critical Issues

1. **Missing `/api/config` in Flask Spectrum Analyzer**
   - Node.js has configuration management endpoints
   - Flask lacks these endpoints entirely

2. **Missing `/api/status` in Flask WigleToTAK**
   - Node.js provides standardized status endpoint
   - Flask has no equivalent status API

3. **Response Format Inconsistency**
   - Flask returns direct JSON responses
   - Node.js wraps responses with `success` and `message` fields

### Response Field Differences

#### Spectrum Analyzer Status Comparison

**Flask `/api/status` returns:**
```json
{
  "openwebrx_connected": boolean,
  "real_data": boolean,
  "fft_buffer_size": number,
  "config": object,
  "last_fft_time": string|null,
  "mode": string
}
```

**Node.js `/api/status` returns:**
```json
{
  "server_uptime": number,
  "connected_clients": number,
  "mode": string,
  "openwebrx_connected": boolean,
  "real_data": boolean,
  "fft_buffer_size": number,
  "last_fft_time": string|null,
  // ... additional fields
}
```

**Fields only in Node.js:**
- `server_uptime`
- `connected_clients`

**Fields only in Flask:**
- `config` (embedded configuration object)

## Recommendations

### High Priority Fixes

1. **Add missing endpoints to Flask**
   - Add `/api/config` (GET/POST) to Flask Spectrum Analyzer
   - Add `/api/status` to Flask WigleToTAK

2. **Standardize response formats**
   - Choose either Flask's direct JSON or Node.js wrapped format
   - Apply consistently across all endpoints

3. **Align field names and types**
   - Ensure status endpoints return identical field names
   - Maintain consistent data types

### Implementation Strategy

1. **Phase 1**: Add missing critical endpoints to Flask
2. **Phase 2**: Standardize response formats
3. **Phase 3**: Comprehensive testing with automated validation

## Testing Requirements

### Endpoints to Test

**Spectrum Analyzer:**
- ✅ `/api/status` - Both implementations
- ❌ `/api/config` - Node.js only (need Flask implementation)
- ✅ `/api/profiles` - Both implementations
- ✅ `/api/scan/<profile>` - Both implementations

**WigleToTAK:**
- ❌ `/api/status` - Node.js only (need Flask implementation)
- ✅ `/update_tak_settings` - Both implementations
- ✅ `/get_antenna_settings` - Both implementations
- ✅ `/start_broadcast` - Both implementations
- ✅ `/stop_broadcast` - Both implementations

### Validation Criteria

1. **HTTP Status Codes** - Must match between implementations
2. **Response Content-Type** - Must be consistent
3. **JSON Structure** - Field names and types must align
4. **Error Handling** - Both should handle errors similarly
5. **Performance** - Response times should be comparable

---
*Generated by Agent 5 API Compatibility Validation System*