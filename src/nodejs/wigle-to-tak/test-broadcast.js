const WigleToTAK = require('./lib/wigleToTakCore');
const dgram = require('dgram');

async function testUDPBroadcasting() {
  console.log('=== Testing UDP Broadcasting ===');
  
  // Create a UDP listener to capture broadcast messages
  const listener = dgram.createSocket('udp4');
  const receivedMessages = [];
  
  listener.on('message', (msg, rinfo) => {
    console.log(`Received UDP message from ${rinfo.address}:${rinfo.port}`);
    console.log('Message content:', msg.toString());
    receivedMessages.push(msg.toString());
  });
  
  listener.bind(6969, () => {
    console.log('UDP listener bound to port 6969');
  });
  
  // Initialize WigleToTAK
  const wigleToTak = new WigleToTAK({
    directory: './test-data',
    port: 6969
  });
  
  // Test direct UDP broadcast
  console.log('\n1. Testing direct UDP broadcast...');
  wigleToTak.takServerIp = '127.0.0.1';
  wigleToTak.takMulticastState = false;
  
  const testMessage = '<?xml version="1.0" encoding="UTF-8"?><event><test>message</test></event>';
  
  try {
    await wigleToTak.broadcastUDP(testMessage);
    console.log('UDP broadcast sent successfully');
  } catch (error) {
    console.error('Error broadcasting UDP:', error);
  }
  
  // Wait a moment for message to be received
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`\nReceived ${receivedMessages.length} messages`);
  
  // Test CSV processing with mock UDP
  console.log('\n2. Testing CSV processing...');
  
  // Override broadcastUDP to capture messages instead of sending
  const originalBroadcast = wigleToTak.broadcastUDP;
  const capturedMessages = [];
  
  wigleToTak.broadcastUDP = async (message) => {
    capturedMessages.push(message);
    console.log('Captured message for:', message.match(/uid="([^"]+)"/)?.[1] || 'unknown');
    return Promise.resolve();
  };
  
  try {
    await wigleToTak.processCsvFile('./test-data/test.wiglecsv');
    console.log(`Processed CSV and captured ${capturedMessages.length} messages`);
    
    if (capturedMessages.length > 0) {
      console.log('\nFirst captured message:');
      console.log(capturedMessages[0]);
    }
  } catch (error) {
    console.error('Error processing CSV:', error);
  }
  
  // Restore original broadcast function
  wigleToTak.broadcastUDP = originalBroadcast;
  
  // Clean up
  listener.close();
  console.log('\n=== UDP Broadcasting Test Complete ===');
}

testUDPBroadcasting().catch(console.error);