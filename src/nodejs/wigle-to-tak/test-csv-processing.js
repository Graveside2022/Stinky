#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

console.log('=== Advanced CSV Processing Test ===');

// Create a proper Wigle CSV file with correct format
const properWigleCSV = `WigleWifi-1.4,appRelease=2.26,model=Pixel,release=11,device=Pixel,display=,board=,brand=google
MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
00:11:22:33:44:55,TestNetwork1,[WPA2-PSK-CCMP][ESS],2023-06-15 12:00:00,6,-45,40.7128,-74.0060,10,5,WiFi
AA:BB:CC:DD:EE:FF,TestNetwork2,[WPA-PSK-TKIP][ESS],2023-06-15 12:01:00,11,-62,40.7129,-74.0061,12,8,WiFi
11:22:33:44:55:66,OpenNetwork,[ESS],2023-06-15 12:02:00,1,-78,40.7130,-74.0062,15,10,WiFi
22:33:44:55:66:77,TestNetwork3,[WPA2-PSK-CCMP][WPS][ESS],2023-06-15 12:03:00,6,-55,40.7131,-74.0063,8,6,WiFi`;

// Ensure test directory exists
if (!fs.existsSync('./test-data')) {
    fs.mkdirSync('./test-data', { recursive: true });
}

const testFilePath = './test-data/proper-wigle.wiglecsv';
fs.writeFileSync(testFilePath, properWigleCSV);

console.log('Created proper Wigle CSV file for testing...');

// Function to process Wigle CSV properly
function processWigleCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        let isHeaderSkipped = false;
        
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => {
                // Skip the first row which contains metadata
                if (!isHeaderSkipped) {
                    isHeaderSkipped = true;
                    // Check if this row looks like the actual column headers
                    if (data.MAC && data.SSID && data.AuthMode) {
                        return; // This is the header row, skip it
                    }
                }
                
                // Validate that we have the required fields for a WiFi entry
                if (data.MAC && data.SSID) {
                    results.push(data);
                }
            })
            .on('end', () => {
                console.log(`✅ CSV processing completed: ${results.length} WiFi entries found`);
                
                if (results.length > 0) {
                    console.log('Sample entry:');
                    console.log(JSON.stringify(results[0], null, 2));
                    
                    console.log('\nValidation checks:');
                    console.log(`✅ MAC addresses: ${results.every(r => r.MAC && r.MAC.match(/^[0-9A-Fa-f:]{17}$/))}`);
                    console.log(`✅ SSID present: ${results.every(r => r.SSID !== undefined)}`);
                    console.log(`✅ Location data: ${results.every(r => r.CurrentLatitude && r.CurrentLongitude)}`);
                    console.log(`✅ Signal strength: ${results.every(r => r.RSSI && parseInt(r.RSSI) < 0)}`);
                }
                
                resolve(results);
            })
            .on('error', (error) => {
                console.log(`❌ CSV processing failed: ${error.message}`);
                reject(error);
            });
    });
}

// Function to process raw Wigle CSV (skipping metadata header)
function processWigleCSVRaw(filePath) {
    return new Promise((resolve, reject) => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            // Find the line with column headers (starts with MAC,SSID,...)
            let headerLineIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('MAC,SSID,')) {
                    headerLineIndex = i;
                    break;
                }
            }
            
            if (headerLineIndex === -1) {
                throw new Error('Could not find CSV header line');
            }
            
            // Extract headers and data
            const headers = lines[headerLineIndex].split(',');
            const dataLines = lines.slice(headerLineIndex + 1).filter(line => line.trim());
            
            const results = dataLines.map(line => {
                const values = line.split(',');
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                return obj;
            });
            
            console.log(`✅ Raw CSV processing completed: ${results.length} entries found`);
            console.log(`Headers found: ${headers.join(', ')}`);
            
            if (results.length > 0) {
                console.log('\nSample parsed entry:');
                console.log(JSON.stringify(results[0], null, 2));
            }
            
            resolve(results);
        } catch (error) {
            console.log(`❌ Raw CSV processing failed: ${error.message}`);
            reject(error);
        }
    });
}

// Test both processing methods
async function runTests() {
    console.log('\n1. Testing with csv-parser library:');
    try {
        await processWigleCSV(testFilePath);
    } catch (error) {
        console.log(`Processing failed: ${error.message}`);
    }
    
    console.log('\n2. Testing with raw CSV processing:');
    try {
        await processWigleCSVRaw(testFilePath);
    } catch (error) {
        console.log(`Raw processing failed: ${error.message}`);
    }
    
    // Test file monitoring simulation
    console.log('\n3. Testing file monitoring simulation:');
    testFileWatching();
    
    // Cleanup
    setTimeout(() => {
        try {
            fs.unlinkSync(testFilePath);
            fs.rmdirSync('./test-data');
            console.log('\n✅ Test cleanup completed');
        } catch (error) {
            console.log(`⚠️ Cleanup warning: ${error.message}`);
        }
    }, 1000);
}

function testFileWatching() {
    const watchDir = './test-data';
    
    if (!fs.existsSync(watchDir)) {
        fs.mkdirSync(watchDir, { recursive: true });
    }
    
    const watcher = fs.watch(watchDir, (eventType, filename) => {
        if (filename && filename.endsWith('.wiglecsv')) {
            console.log(`📁 File event: ${eventType} detected for ${filename}`);
            
            // Simulate processing new file
            const filePath = path.join(watchDir, filename);
            if (eventType === 'rename' && fs.existsSync(filePath)) {
                console.log(`🔄 New Wigle CSV file detected: ${filename}`);
                console.log(`📊 File size: ${fs.statSync(filePath).size} bytes`);
            }
        }
    });
    
    // Simulate file creation
    setTimeout(() => {
        const newFile = path.join(watchDir, 'new-scan.wiglecsv');
        fs.writeFileSync(newFile, properWigleCSV);
        console.log('📝 Created new file for monitoring test');
        
        setTimeout(() => {
            watcher.close();
            console.log('✅ File monitoring test completed');
        }, 200);
    }, 100);
}

runTests();