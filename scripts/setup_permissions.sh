#!/bin/bash
# Setup script to enable non-root operation of Kismet and network interfaces
# Run this once with sudo, then logout and login again

echo "Setting up permissions for non-root operation..."

# Add user to required groups
echo "Adding user $USER to required groups..."
sudo usermod -a -G netdev,plugdev,dialout,wireshark $USER

# Set capabilities on required binaries
echo "Setting capabilities on network tools..."
# Allow kismet to capture packets and configure interfaces
sudo setcap cap_net_raw,cap_net_admin=eip $(which kismet) 2>/dev/null || echo "Warning: Could not set capabilities on kismet"

# Allow network interface configuration without sudo
sudo setcap cap_net_admin=eip $(which iw) 2>/dev/null || echo "Warning: Could not set capabilities on iw"
sudo setcap cap_net_admin=eip $(which ip) 2>/dev/null || echo "Warning: Could not set capabilities on ip"

# Create udev rule for network interface access
echo "Creating udev rules for network interface access..."
cat << 'EOF' | sudo tee /etc/udev/rules.d/99-network-interfaces.rules
# Allow users in netdev group to manage network interfaces
SUBSYSTEM=="net", GROUP="netdev", MODE="0660"
ACTION=="add", SUBSYSTEM=="net", KERNEL=="wlan*", GROUP="netdev", MODE="0660"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=net

# Create systemd user service for kismet
echo "Creating systemd user service..."
mkdir -p ~/.config/systemd/user/
cat << 'EOF' > ~/.config/systemd/user/kismet.service
[Unit]
Description=Kismet WiFi Scanner (User)
After=network.target

[Service]
Type=simple
ExecStart=/home/pi/projects/stinkster_malone/stinkster/src/scripts/start_kismet.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Enable user lingering (allows user services to run without login)
sudo loginctl enable-linger $USER

# Create kismet config directory with proper permissions
mkdir -p ~/.kismet
chmod 755 ~/.kismet

# Set up kismet to not require root
if [ -f ~/.kismet/kismet_site.conf ]; then
    echo "Kismet config exists, backing up..."
    cp ~/.kismet/kismet_site.conf ~/.kismet/kismet_site.conf.backup
fi

cat << 'EOF' > ~/.kismet/kismet_site.conf
# Kismet site configuration for non-root operation
# Don't try to set interface options that require root
source=wlan2:type=linuxwifi,hop=true,channel_hop_speed=5/sec

# Disable privilege dropping since we're not running as root
#privilege=pi
#suiduser=pi

# Log to user-accessible location
log_prefix=/home/pi/projects/stinkster/data/kismet/
EOF

echo ""
echo "========================================="
echo "Setup complete!"
echo ""
echo "IMPORTANT: You must logout and login again for group membership to take effect."
echo ""
echo "After logging back in, you can verify with:"
echo "  groups"
echo "  getcap $(which kismet)"
echo ""
echo "To test non-root operation:"
echo "  systemctl --user start kismet"
echo "========================================="