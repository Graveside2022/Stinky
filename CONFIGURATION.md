# Stinkster Configuration Guide

This guide explains how to configure the Stinkster project to use environment variables and configuration files instead of hardcoded values.

## Quick Start

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your values:**
   ```bash
   nano .env
   ```

3. **Update passwords and sensitive values:**
   - Change `KISMET_PASSWORD` from default
   - Update `TAK_SERVER_IP` if needed
   - Adjust network interface if not using `wlan2`

## Configuration Files

### `.env` - Environment Variables
Contains sensitive configuration like passwords and API keys. This file should never be committed to version control.

### `config.json` - Main Configuration
JSON configuration file that can reference environment variables using `${VARIABLE_NAME}` syntax. Create from template:
```bash
cp config.json.template config.json
```

### `config.py` - Python Configuration Module
Python module that loads configuration from both `.env` and `config.json` files.

### `load_config.sh` - Shell Configuration Loader
Source this in shell scripts to load environment variables:
```bash
source /home/pi/projects/stinkster/load_config.sh
```

## Usage Examples

### Python Scripts

```python
# Method 1: Using the config module
from config import config

# Get values
auth = config.kismet_auth  # Returns tuple ('username', 'password')
port = config.tak_server_port  # Returns integer

# Method 2: Direct environment variables
import os
from dotenv import load_dotenv

load_dotenv()
username = os.getenv('KISMET_USERNAME', 'admin')
```

### Shell Scripts

```bash
#!/bin/bash
# Load configuration
source /home/pi/projects/stinkster/load_config.sh

# Use variables
echo "Connecting to Kismet at $KISMET_API_URL"
echo "Using network interface: $NETWORK_INTERFACE"
```

## Migration Guide

### For WigleToTak2.py

Replace:
```python
tak_server_port = str(args.port)
tak_server_ip = '0.0.0.0'
```

With:
```python
from config import config
tak_server_port = str(config.tak_server_port)
tak_server_ip = config.tak_server_ip
```

### For gps_kismet_wigle.sh

Replace:
```bash
httpd_username=admin
httpd_password=admin
```

With:
```bash
source /home/pi/projects/stinkster/load_config.sh
httpd_username=$KISMET_USERNAME
httpd_password=$KISMET_PASSWORD
```

### For webhook.py

Replace:
```python
KISMET_AUTH = ('admin', 'admin')
KISMET_API_URL = 'http://10.42.0.1:2501'
```

With:
```python
from config import config
KISMET_AUTH = config.kismet_auth
KISMET_API_URL = config.kismet_api_url
```

## Security Best Practices

1. **Never commit `.env` to version control**
2. **Use strong, unique passwords**
3. **Restrict file permissions:**
   ```bash
   chmod 600 .env
   chmod 600 config.json
   ```
4. **Rotate credentials regularly**
5. **Use different credentials for development and production**

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `KISMET_USERNAME` | Kismet admin username | admin |
| `KISMET_PASSWORD` | Kismet admin password | admin |
| `KISMET_API_URL` | Kismet API endpoint | http://localhost:2501 |
| `TAK_SERVER_IP` | TAK server IP address | 0.0.0.0 |
| `TAK_SERVER_PORT` | TAK server port | 6969 |
| `NETWORK_INTERFACE` | WiFi interface to monitor | wlan2 |
| `LOG_DIR` | Directory for log files | /home/pi/tmp |
| `DEBUG` | Enable debug logging | false |

See `.env.example` for complete list of available variables.

## Troubleshooting

### Configuration not loading
1. Check if `.env` file exists and is readable
2. Verify environment variables are set: `env | grep KISMET`
3. Check logs for configuration errors

### Permission denied errors
```bash
chmod 644 config.json.template
chmod 600 .env
chmod 755 load_config.sh
```

### Python module not found
```bash
pip install python-dotenv
```

## Next Steps

After configuring:
1. Test configuration: `python3 -c "from config import config; print(config.to_dict())"`
2. Update all scripts to use configuration
3. Remove hardcoded values from source files
4. Test all functionality with new configuration