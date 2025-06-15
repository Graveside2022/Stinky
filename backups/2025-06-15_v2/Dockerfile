# OpenWebRX Dockerfile with HackRF Support
# This Dockerfile builds OpenWebRX from scratch with native HackRF driver support
# Based on the official OpenWebRX image but with enhanced HackRF compatibility

FROM debian:bookworm-slim

# Metadata
LABEL maintainer="christian@stinkster"
LABEL description="OpenWebRX with native HackRF support"
LABEL version="1.0"

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV OPENWEBRX_VERSION=1.2.2

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Build tools
    build-essential \
    cmake \
    pkg-config \
    git \
    wget \
    curl \
    # Python and pip
    python3 \
    python3-pip \
    python3-dev \
    python3-setuptools \
    python3-wheel \
    python3-venv \
    # Audio processing
    sox \
    ffmpeg \
    libsox-fmt-all \
    # USB and hardware support
    libusb-1.0-0 \
    libusb-1.0-0-dev \
    usbutils \
    # HackRF specific
    hackrf \
    libhackrf-dev \
    libhackrf0 \
    # Additional SDR tools
    rtl-sdr \
    librtlsdr-dev \
    # System utilities
    netcat-openbsd \
    procps \
    vim-tiny \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create openwebrx user
RUN useradd -m -s /bin/bash -G audio,dialout,plugdev openwebrx

# Install SoapySDR from source (for compatibility)
RUN cd /tmp && \
    git clone https://github.com/pothosware/SoapySDR.git && \
    cd SoapySDR && \
    git checkout v0.8.1 && \
    mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    cd / && rm -rf /tmp/SoapySDR

# Install SoapyHackRF module
RUN cd /tmp && \
    git clone https://github.com/pothosware/SoapyHackRF.git && \
    cd SoapyHackRF && \
    mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc) && \
    make install && \
    ldconfig && \
    cd / && rm -rf /tmp/SoapyHackRF

# Install OpenWebRX and its dependencies
WORKDIR /opt/openwebrx

# Create virtual environment
RUN python3 -m venv venv

# Upgrade pip in virtual environment
RUN /opt/openwebrx/venv/bin/pip install --upgrade pip setuptools wheel

# Install OpenWebRX
RUN /opt/openwebrx/venv/bin/pip install openwebrx==${OPENWEBRX_VERSION}

# Install additional Python packages for HackRF support
RUN /opt/openwebrx/venv/bin/pip install \
    pyserial \
    soapysdr \
    numpy

# Create necessary directories
RUN mkdir -p /var/lib/openwebrx /etc/openwebrx /opt/openwebrx/config

# Copy HackRF configuration
COPY <<'EOF' /opt/openwebrx/config/hackrf-config.json
{
    "version": 2,
    "sdrs": {
        "hackrf": {
            "name": "HackRF One",
            "type": "hackrf",
            "ppm": 0,
            "always-on": false,
            "profiles": {
                "2m": {
                    "name": "2m Amateur Band",
                    "center_freq": 145000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 145700000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -72,
                    "waterfall_max_level": -30,
                    "lfo_offset": 300
                },
                "70cm": {
                    "name": "70cm Amateur Band",
                    "center_freq": 435000000,
                    "rf_gain": "VGA=35,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 435000000,
                    "start_mod": "nfm",
                    "waterfall_min_level": -78,
                    "waterfall_max_level": -30,
                    "lfo_offset": 300
                },
                "airband": {
                    "name": "Airband",
                    "center_freq": 120000000,
                    "rf_gain": "VGA=30,LNA=40,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 120000000,
                    "start_mod": "am",
                    "waterfall_min_level": -80,
                    "waterfall_max_level": -20,
                    "lfo_offset": 0
                },
                "fm_broadcast": {
                    "name": "FM Broadcast",
                    "center_freq": 100000000,
                    "rf_gain": "VGA=25,LNA=30,AMP=0",
                    "samp_rate": 2400000,
                    "start_freq": 100000000,
                    "start_mod": "wfm",
                    "waterfall_min_level": -70,
                    "waterfall_max_level": -20,
                    "lfo_offset": 0
                }
            }
        }
    }
}
EOF

# Create startup script
COPY <<'EOF' /opt/openwebrx/startup.sh
#!/bin/bash
set -e

echo "Starting OpenWebRX with HackRF support..."

# Check if HackRF is connected
if lsusb | grep -q "1d50:6089"; then
    echo "HackRF device detected"
    hackrf_info || true
else
    echo "WARNING: No HackRF device detected"
fi

# Initialize configuration if not exists
if [ ! -f /var/lib/openwebrx/sdrs.json ]; then
    echo "Initializing HackRF configuration..."
    cp /opt/openwebrx/config/hackrf-config.json /var/lib/openwebrx/sdrs.json
fi

# Ensure proper permissions
chown -R openwebrx:openwebrx /var/lib/openwebrx /etc/openwebrx

# Test SoapySDR
echo "Testing SoapySDR..."
SoapySDRUtil --info || true
echo ""
echo "Detecting devices..."
SoapySDRUtil --find || true

# Start OpenWebRX
cd /opt/openwebrx
exec /opt/openwebrx/venv/bin/openwebrx --config /etc/openwebrx
EOF

RUN chmod +x /opt/openwebrx/startup.sh

# Create healthcheck script
COPY <<'EOF' /opt/openwebrx/healthcheck.sh
#!/bin/bash
curl -f http://localhost:8073/ || exit 1
EOF

RUN chmod +x /opt/openwebrx/healthcheck.sh

# Set permissions
RUN chown -R openwebrx:openwebrx /opt/openwebrx /var/lib/openwebrx /etc/openwebrx

# Expose port
EXPOSE 8073

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /opt/openwebrx/healthcheck.sh

# Switch to openwebrx user
USER openwebrx

# Set working directory
WORKDIR /opt/openwebrx

# Entry point
ENTRYPOINT ["/opt/openwebrx/startup.sh"]