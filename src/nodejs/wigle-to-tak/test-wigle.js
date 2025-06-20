const WigleToTAK = require('./lib/wigleToTakCore');
const path = require('path');

async function testWigleToTAK() {
  console.log('=== Testing WigleToTAK Core Implementation ===');
  
  // Initialize WigleToTAK
  const wigleToTak = new WigleToTAK({
    directory: './test-data',
    port: 6969
  });
  
  console.log('1. Testing status check...');
  const status = wigleToTak.getStatus();
  console.log('Status:', JSON.stringify(status, null, 2));
  
  console.log('\n2. Testing antenna settings...');
  const antennaSettings = wigleToTak.getAntennaSettings();
  console.log('Antenna Settings:', JSON.stringify(antennaSettings, null, 2));
  
  console.log('\n3. Testing configuration updates...');
  wigleToTak.updateTakSettings('192.168.1.100', 6970);
  wigleToTak.updateAnalysisMode('postcollection');
  wigleToTak.updateAntennaSensitivity('alta_card');
  
  console.log('Updated status:', JSON.stringify(wigleToTak.getStatus(), null, 2));
  
  console.log('\n4. Testing whitelist/blacklist functionality...');
  wigleToTak.addToWhitelist('TestNetwork1');
  wigleToTak.addToBlacklist('OpenNetwork', null, '-16711936'); // Green color
  
  console.log('Status with filters:', JSON.stringify(wigleToTak.getStatus(), null, 2));
  
  console.log('\n5. Testing CSV file discovery...');
  const csvFiles = await wigleToTak.findCsvFiles('./test-data');
  console.log('Found CSV files:', csvFiles);
  
  console.log('\n6. Testing TAK XML generation...');
  const cotXml = wigleToTak.createCotXmlPayload(
    'AA:BB:CC:DD:EE:01',
    'TestNetwork1',
    '2023-01-01T12:00:00Z',
    '6',
    '-65',
    '40.7128',
    '-74.0060',
    '100',
    '5',
    'WPA2',
    'WiFi'
  );
  console.log('Generated CoT XML:');
  console.log(cotXml);
  
  console.log('\n7. Testing CSV processing (without actual UDP broadcasting)...');
  // Temporarily disable UDP broadcasting for testing
  const originalBroadcast = wigleToTak.broadcastUDP;
  wigleToTak.broadcastUDP = async (message) => {
    console.log('Would broadcast:', message.substring(0, 100) + '...');
    return Promise.resolve();
  };
  
  try {
    const result = await wigleToTak.startBroadcasting('test.wiglecsv');
    console.log('Start broadcast result:', result);
    
    // Let it run for a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stopResult = wigleToTak.stopBroadcasting();
    console.log('Stop broadcast result:', stopResult);
  } catch (error) {
    console.error('Error during broadcasting test:', error);
  }
  
  // Restore original broadcast function
  wigleToTak.broadcastUDP = originalBroadcast;
  
  console.log('\n=== WigleToTAK Core Testing Complete ===');
}

// Run the test
testWigleToTAK().catch(console.error);