/**
 * GPS Service
 * 
 * Handles GPS data retrieval from GPSD
 */

const { spawn, exec } = require('child_process');

class GpsService {
    constructor(logger) {
        this.logger = logger;
    }
    
    /**
     * Get GPS data from gpspipe
     */
    async getGpsData() {
        try {
            // Check if gpsd is running
            const gpsdRunning = await this.isGpsdRunning();
            
            if (!gpsdRunning) {
                return this.getDefaultGpsData();
            }
            
            // Get GPS data using gpspipe
            const gpsOutput = await this.executeGpspipe();
            
            // Parse GPS data
            return this.parseGpsData(gpsOutput);
            
        } catch (error) {
            this.logger.error('Failed to get GPS data:', error);
            return this.getDefaultGpsData();
        }
    }
    
    /**
     * Check if GPSD is running
     */
    async isGpsdRunning() {
        return new Promise((resolve) => {
            exec('systemctl is-active gpsd', (error, stdout) => {
                resolve(stdout.trim() === 'active');
            });
        });
    }
    
    /**
     * Execute gpspipe command
     */
    async executeGpspipe() {
        return new Promise((resolve, reject) => {
            const gpspipe = spawn('gpspipe', ['-w', '-n', '10']);
            let output = '';
            let errorOutput = '';
            
            gpspipe.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            gpspipe.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            gpspipe.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`gpspipe exited with code ${code}: ${errorOutput}`));
                } else {
                    resolve(output);
                }
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                gpspipe.kill();
                resolve(output);
            }, 5000);
        });
    }
    
    /**
     * Parse GPS data from gpspipe output
     */
    parseGpsData(output) {
        const lines = output.split('\n');
        let gpsData = this.getDefaultGpsData();
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const data = JSON.parse(line);
                
                // Look for TPV (Time-Position-Velocity) objects
                if (data.class === 'TPV') {
                    gpsData.lat = data.lat || null;
                    gpsData.lon = data.lon || null;
                    gpsData.alt = data.alt || null;
                    gpsData.mode = data.mode || 0;
                    gpsData.time = data.time || null;
                    gpsData.speed = data.speed || null;
                    gpsData.track = data.track || null;
                    
                    // Update status based on mode
                    switch (data.mode) {
                        case 2:
                            gpsData.status = '2D Fix';
                            break;
                        case 3:
                            gpsData.status = '3D Fix';
                            break;
                        default:
                            gpsData.status = 'No Fix';
                    }
                    
                    // If we have a good fix, we can stop
                    if (data.mode >= 2 && data.lat && data.lon) {
                        break;
                    }
                }
            } catch (error) {
                // Skip malformed JSON lines
                this.logger.debug('Failed to parse GPS line:', line);
            }
        }
        
        return gpsData;
    }
    
    /**
     * Get default GPS data structure
     */
    getDefaultGpsData() {
        return {
            lat: null,
            lon: null,
            alt: null,
            mode: 0,
            time: null,
            speed: null,
            track: null,
            status: 'No Fix'
        };
    }
    
    /**
     * Check if we have a valid GPS fix
     */
    hasValidFix() {
        return this.getGpsData().then(data => data.mode >= 2);
    }
}

module.exports = GpsService;