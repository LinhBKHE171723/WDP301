const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // Map<orderId, Set<WebSocket>>
    this.clientOrders = new Map(); // Map<WebSocket, orderId>
    this.heartbeatInterval = 30000; // 30 seconds
    this.heartbeatTimer = null;
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection established');
      
      // Store connection
      ws.isAlive = true;
      
      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.handleDisconnection(ws);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established'
      }));
    });

    // Start heartbeat mechanism
    this.startHeartbeat();
    
    console.log('✅ WebSocket service initialized');
  }

  handleMessage(ws, message) {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.orderId);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.orderId);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  handleSubscribe(ws, orderId) {
    if (!orderId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'OrderId is required for subscription'
      }));
      return;
    }

    console.log(`📡 Client subscribing to order: ${orderId}`);

    // Remove from previous order if any
    const previousOrderId = this.clientOrders.get(ws);
    if (previousOrderId) {
      this.removeFromOrder(ws, previousOrderId);
    }

    // Add to new order
    this.addToOrder(ws, orderId);
    this.clientOrders.set(ws, orderId);

    ws.send(JSON.stringify({
      type: 'subscribed',
      orderId: orderId,
      message: `Successfully subscribed to order ${orderId}`
    }));
  }

  handleUnsubscribe(ws, orderId) {
    console.log(`📡 Client unsubscribing from order: ${orderId}`);
    this.removeFromOrder(ws, orderId);
    this.clientOrders.delete(ws);
    
    ws.send(JSON.stringify({
      type: 'unsubscribed',
      orderId: orderId,
      message: `Successfully unsubscribed from order ${orderId}`
    }));
  }

  addToOrder(ws, orderId) {
    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }
    this.connections.get(orderId).add(ws);
    console.log(`📊 Order ${orderId} now has ${this.connections.get(orderId).size} subscribers`);
  }

  removeFromOrder(ws, orderId) {
    if (this.connections.has(orderId)) {
      this.connections.get(orderId).delete(ws);
      if (this.connections.get(orderId).size === 0) {
        this.connections.delete(orderId);
        console.log(`📊 Order ${orderId} has no more subscribers`);
      } else {
        console.log(`📊 Order ${orderId} now has ${this.connections.get(orderId).size} subscribers`);
      }
    }
  }

  handleDisconnection(ws) {
    const orderId = this.clientOrders.get(ws);
    if (orderId) {
      this.removeFromOrder(ws, orderId);
      this.clientOrders.delete(ws);
    }
  }

  // Broadcast order update to all clients subscribed to this order
  broadcastToOrder(orderId, eventType, data) {
    // Convert ObjectId to string for consistent lookup
    const orderIdStr = orderId.toString();
    
    if (!this.connections.has(orderIdStr)) {
      return;
    }

    const message = {
      type: eventType,
      orderId: orderIdStr,
      data: data,
      timestamp: new Date().toISOString()
    };

    const subscribers = this.connections.get(orderIdStr);
    let sentCount = 0;
    let failedCount = 0;

    subscribers.forEach(ws => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
          sentCount++;
        } else {
          // Remove dead connections
          subscribers.delete(ws);
          this.clientOrders.delete(ws);
          failedCount++;
        }
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        subscribers.delete(ws);
        this.clientOrders.delete(ws);
        failedCount++;
      }
    });

    // Clean up empty order subscriptions
    if (subscribers.size === 0) {
      this.connections.delete(orderIdStr);
    }
  }

  // Heartbeat mechanism to keep connections alive
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
          console.log('💀 Terminating dead WebSocket connection');
          ws.terminate();
          this.handleDisconnection(ws);
          return;
        }

        ws.isAlive = false;
        try {
          ws.ping();
        } catch (error) {
          console.error('❌ Error sending ping:', error);
          ws.terminate();
          this.handleDisconnection(ws);
        }
      });
    }, this.heartbeatInterval);
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      totalOrders: this.connections.size,
      ordersWithSubscribers: Array.from(this.connections.keys()),
      connectionsPerOrder: Object.fromEntries(
        Array.from(this.connections.entries()).map(([orderId, connections]) => [
          orderId, 
          connections.size
        ])
      )
    };
  }

  // Cleanup method
  destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
module.exports = webSocketService;
