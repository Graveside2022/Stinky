# HackRF-only configuration for OpenWebRX

# receiver_name: [string]
#   This is shown in the receiver title
receiver_name = "OpenWebRX - HackRF"

# receiver_location: [string]
#   Shown as receiver location
receiver_location = "Raspberry Pi"

# receiver_admin: [string]
#   Shown as receiver admin
receiver_admin = "admin@localhost"

# receiver_gps: [tuple]
#   GPS coordinates for the receiver
receiver_gps = (0.0, 0.0)

# sdrs: [object]
#   SDR device configuration
sdrs = {
    "hackrf": {
        "name": "HackRF One",
        "type": "hackrf",
        "ppm": 0,
        "always_on": True,
        "profiles": {
            "fm_broadcast": {
                "name": "FM Broadcast",
                "center_freq": 98000000,
                "rf_gain": "VGA=20,LNA=16,AMP=0",
                "samp_rate": 2400000,
                "start_freq": 98000000,
                "start_mod": "wfm",
                "waterfall_min_level": -65,
                "lfo_offset": 0,
                "initial_squelch_level": -150,
                "auto_squelch": False,
                "squelch_level": -150,
                "demod_auto_start": True
            },
            "2m": {
                "name": "2m Amateur Band",
                "center_freq": 145000000,
                "rf_gain": "VGA=35,LNA=40,AMP=0",
                "samp_rate": 2400000,
                "start_freq": 145700000,
                "start_mod": "nfm",
                "waterfall_min_level": -72,
                "lfo_offset": 300,
                "initial_squelch_level": -150,
                "auto_squelch": False,
                "squelch_level": -150,
                "demod_auto_start": True
            }
        }
    }
}

# waterfall_scheme: [object]
waterfall_scheme = "GoogleTurboWaterfall"

# fft_fps: [int]
fft_fps = 25

# audio_compression: [string]
audio_compression = "none"

# waterfall_levels: [object]
waterfall_levels = {"min": -88.0, "max": -20.0}

# tuning_precision: [int]
tuning_precision = 1