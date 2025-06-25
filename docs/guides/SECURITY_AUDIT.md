# Security Audit Report - Stinkster Project

This report identifies hardcoded passwords, IP addresses, and other sensitive information found in the source files that should be replaced with environment variables or configuration files.

## Summary of Findings

### 1. **WigleToTak2.py**
- **Hardcoded Port**: `6969` (line 22, 257)
- **Hardcoded Flask Port**: `8000` (line 23)
- **Hardcoded IP**: `0.0.0.0` (line 32, 443)
- **Hardcoded Multicast Group**: `239.2.3.1` (line 257)
- **Hardcoded Colors**: Various ARGB color values (lines 382, 406-407)

### 2. **gps_kismet_wigle.sh**
- **Hardcoded Credentials**: 
  - Kismet admin username: `admin` (line 137)
  - Kismet admin password: `admin` (line 138)
- **Hardcoded Ports**:
  - GPSD port: `2947` (line 143)
  - WigleToTAK port: `6969` (line 154)
- **Hardcoded IP**: `localhost` for GPSD (line 143)
- **Hardcoded Paths**: Multiple hardcoded paths throughout the script
- **Hardcoded Device**: `wlan2` interface (lines 140, 142, 325, 333, 337, 341)

### 3. **webhook.py**
- **Hardcoded Credentials**:
  - Kismet username: `admin` (line 31)
  - Kismet password: `admin` (line 31)
- **Hardcoded IP Addresses**:
  - `10.42.0.1:2501` (line 30)
  - `0.0.0.0` (line 872)
  - `localhost:2501` (lines 552, 846)
  - `127.0.0.1:2501` (line 553)
- **Hardcoded Port**: `5000` (line 872)
- **Hardcoded Paths**: Multiple hardcoded paths for PID files and logs

### 4. **hi.html**
- No hardcoded sensitive data found (client-side only)

### 5. **openwebrx-sdrs.json**
- Configuration file with radio frequencies and gains - likely intended to be configurable

## Recommendations

### Priority 1 - Critical Security Issues

1. **Replace all hardcoded credentials with environment variables:**
   ```python
   # Instead of:
   KISMET_AUTH = ('admin', 'admin')
   
   # Use:
   import os
   KISMET_AUTH = (
       os.getenv('KISMET_USERNAME', 'admin'),
       os.getenv('KISMET_PASSWORD', 'admin')
   )
   ```

2. **Create a configuration file for network settings:**
   ```json
   {
     "kismet": {
       "api_url": "http://localhost:2501",
       "username": "${KISMET_USERNAME}",
       "password": "${KISMET_PASSWORD}"
     },
     "wigletotak": {
       "port": 6969,
       "flask_port": 8000,
       "multicast_group": "239.2.3.1"
     },
     "gpsd": {
       "host": "localhost",
       "port": 2947
     },
     "network": {
       "interface": "wlan2"
     }
   }
   ```

### Priority 2 - Configuration Management

1. **Create an `.env` file for sensitive values:**
   ```bash
   # .env.example
   KISMET_USERNAME=admin
   KISMET_PASSWORD=changeme
   KISMET_API_URL=http://localhost:2501
   TAK_SERVER_IP=0.0.0.0
   TAK_SERVER_PORT=6969
   FLASK_PORT=8000
   WEBHOOK_PORT=5000
   NETWORK_INTERFACE=wlan2
   ```

2. **Update scripts to use environment variables:**
   ```bash
   # In gps_kismet_wigle.sh
   KISMET_USER="${KISMET_USERNAME:-admin}"
   KISMET_PASS="${KISMET_PASSWORD:-admin}"
   NETWORK_INTERFACE="${NETWORK_INTERFACE:-wlan2}"
   ```

### Priority 3 - Path Management

1. **Create a central configuration for paths:**
   ```python
   # config.py
   import os
   
   BASE_DIR = os.path.dirname(os.path.abspath(__file__))
   LOG_DIR = os.getenv('LOG_DIR', '/home/pi/tmp')
   PID_DIR = os.getenv('PID_DIR', '/home/pi/tmp')
   KISMET_OPS_DIR = os.getenv('KISMET_OPS_DIR', '/home/pi/kismet_ops')
   ```

## Implementation Steps

1. **Create configuration templates:**
   - `config.json.template` - Main configuration template
   - `.env.example` - Environment variables example
   - `README.md` update with configuration instructions

2. **Update Python scripts to use python-dotenv:**
   ```bash
   pip install python-dotenv
   ```

3. **Add configuration loading to scripts:**
   ```python
   from dotenv import load_dotenv
   load_dotenv()
   ```

4. **Update shell scripts to source environment:**
   ```bash
   # Source environment file if it exists
   if [ -f /home/pi/projects/stinkster/.env ]; then
       export $(grep -v '^#' /home/pi/projects/stinkster/.env | xargs)
   fi
   ```

## Security Best Practices

1. **Never commit `.env` files to version control**
2. **Add `.env` to `.gitignore`**
3. **Use strong, unique passwords for all services**
4. **Regularly rotate credentials**
5. **Use least-privilege principles for service accounts**
6. **Consider using a secrets management system for production**

## Files to Create

1. `.env.example` - Example environment file
2. `config.json.template` - Configuration template
3. `config.py` - Python configuration module
4. `load_config.sh` - Shell script configuration loader

This audit should be addressed before deploying the system in any production or public-facing environment.