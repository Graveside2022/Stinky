# Stinkster Configuration Templates

This directory contains template configuration files for the Stinkster project. These templates include placeholders for sensitive information that should be customized for your specific deployment.

## Template Files

### 1. `config.template.env`
Main environment configuration file containing all service credentials and settings.
- Copy to `.env` and fill in your values
- Add `.env` to `.gitignore` to prevent accidental commits

### 2. `docker-compose.template.yml`
Docker Compose configuration with environment variable substitution.
- Uses values from `.env` file
- Already configured for HackRF and OpenWebRX

### 3. `wigletotak-config.template.json`
Configuration for the WigleToTAK service that converts Kismet WiFi scans to TAK format.
- Set your TAK server IP and credentials
- Configure GPS and Kismet integration

### 4. `kismet-config.template.conf`
Kismet WiFi scanner configuration.
- Copy to `kismet_site.conf`
- Set your WiFi interface and credentials
- Generate password hash with: `kismet --make-password`

### 5. `spectrum-analyzer-config.template.json`
HackRF spectrum analyzer web interface configuration.
- Configure frequency bands and display settings
- Set server ports and logging

### 6. `gpsmav-config.template.json`
GPS MAVLink bridge configuration.
- Configure serial devices and baud rates
- Set MAVProxy connections

### 7. `webhook-config.template.json`
Webhook service for remote management and integration.
- Set API keys and allowed IPs
- Configure GitHub webhooks if needed

### 8. `service-orchestration.template.conf`
Main service orchestration script configuration.
- Controls startup order and health checks
- Configure all service parameters

## Quick Start

1. Copy all template files:
```bash
cp config.template.env .env
cp kismet-config.template.conf kismet_site.conf
# ... etc for other configs
```

2. Edit `.env` with your credentials:
```bash
nano .env
```

3. Update service-specific configs as needed

4. Ensure `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
echo "kismet_site.conf" >> .gitignore
```

## Security Notes

- **Never commit files with real credentials to version control**
- Use strong, unique passwords for all services
- Restrict network access with firewall rules
- Keep API keys and webhook secrets secure
- Regularly rotate credentials

## Environment Variables

The main `.env` file is sourced by Docker Compose and shell scripts. Key variables:

- `OPENWEBRX_ADMIN_PASSWORD`: OpenWebRX admin interface
- `TAK_SERVER_IP`: Your TAK server address
- `FLASK_SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- `API_KEY`: For webhook authentication

## Service Integration

All services are designed to work together:
1. GPS data flows from MAVLink → GPSD → Kismet
2. Kismet scans WiFi → creates .wiglecsv files
3. WigleToTAK reads files → sends to TAK server
4. OpenWebRX provides SDR capabilities
5. Webhook service enables remote control

## Troubleshooting

If services don't start:
1. Check all required values are filled in configs
2. Verify device paths exist (`ls -l /dev/ttyUSB*`)
3. Ensure ports aren't already in use
4. Check logs in `/home/pi/tmp/`
5. Verify Docker is running for OpenWebRX