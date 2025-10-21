// Test WebSocket connection
const WebSocket = require('ws');

console.log('🧪 Testing WebSocket connection...');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully');
  
  // Test subscribe message
  ws.send(JSON.stringify({
    type: 'subscribe',
    orderId: 'test-order-123'
  }));
  
  console.log('📡 Sent subscribe message');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message);
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed: ${code} ${reason}`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('🔌 Closing WebSocket connection...');
  ws.close();
}, 5000);

