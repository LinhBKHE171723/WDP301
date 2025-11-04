const WebSocket = require('ws');

// ===============================
// 📡 WebSocket Service Class
// ===============================
class WebSocketService {
  constructor() {
    this.wss = null; // instance của WebSocket.Server
    this.connections = new Map(); // Map<orderId, Set<WebSocket>>  → lưu danh sách client đang theo dõi từng order
    this.clientOrders = new Map(); // Map<WebSocket, orderId>  → lưu order mà client đang theo dõi
    this.heartbeatInterval = 30000; // thời gian giữa các lần "ping" để kiểm tra kết nối sống
    this.heartbeatTimer = null; // lưu interval timer cho heartbeat
  }

  // ==================================================
  // 🚀 Khởi tạo WebSocket Server
  // ==================================================
  initialize(server) {
    this.wss = new WebSocket.Server({
      server,      // server HTTP đang chạy Express
      path: '/ws'  // endpoint WebSocket (ws://localhost:5000/ws)
    });

    // Lắng nghe sự kiện khi có client kết nối
    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection established');

      ws.isAlive = true; // để heartbeat biết connection còn sống

      // =======================
      // 📩 Nhận message từ client
      // =======================
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

      // Khi client đóng kết nối
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        this.handleDisconnection(ws);
      });

      // Khi có lỗi (ví dụ client crash)
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Khi nhận "pong" từ client (để biết là còn sống)
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Gửi message chào mừng
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established'
      }));
    });

    // Kích hoạt cơ chế kiểm tra heartbeat định kỳ
    this.startHeartbeat();

    console.log('✅ WebSocket service initialized');
  }

  // ==================================================
  // 🧾 Xử lý message từ client
  // ==================================================
  handleMessage(ws, message) {
    switch (message.type) {
      case 'subscribe':
        // client muốn "theo dõi" order cụ thể
        this.handleSubscribe(ws, message.orderId);
        break;

      case 'unsubscribe':
        // client muốn "ngừng theo dõi" order
        this.handleUnsubscribe(ws, message.orderId);
        break;

      case 'auth':
        // client gửi role (vd: waiter, customer, kitchen_manager)
        ws.userRole = message.role;
        ws.userId = message.userId; // Lưu userId để có thể broadcast cho user cụ thể
        console.log(`🔐 WebSocket authenticated as: ${message.role} (userId: ${message.userId})`);
        ws.send(JSON.stringify({
          type: 'auth_success',
          role: message.role,
          userId: message.userId,
          message: `Authenticated as ${message.role}`
        }));
        break;

      case 'ping':
        // client gửi ping → server gửi pong
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  // ==================================================
  // ➕ Đăng ký (subscribe) order
  // ==================================================
  handleSubscribe(ws, orderId) {
    if (!orderId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'OrderId is required for subscription'
      }));
      return;
    }

    console.log(`📡 Client subscribing to order: ${orderId}`);

    // Nếu client trước đó đã theo dõi order khác → remove
    const previousOrderId = this.clientOrders.get(ws);
    if (previousOrderId) {
      this.removeFromOrder(ws, previousOrderId);
    }

    // Thêm client vào danh sách order mới
    this.addToOrder(ws, orderId);
    this.clientOrders.set(ws, orderId);

    ws.send(JSON.stringify({
      type: 'subscribed',
      orderId,
      message: `Successfully subscribed to order ${orderId}`
    }));
  }

  // ==================================================
  // ➖ Hủy đăng ký (unsubscribe) order
  // ==================================================
  handleUnsubscribe(ws, orderId) {
    console.log(`📡 Client unsubscribing from order: ${orderId}`);
    this.removeFromOrder(ws, orderId);
    this.clientOrders.delete(ws);

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      orderId,
      message: `Successfully unsubscribed from order ${orderId}`
    }));
  }

  // ==================================================
  // 🔗 Thêm client vào danh sách order
  // ==================================================
  addToOrder(ws, orderId) {
    if (!this.connections.has(orderId)) {
      this.connections.set(orderId, new Set());
    }
    this.connections.get(orderId).add(ws);
    console.log(`📊 Order ${orderId} now has ${this.connections.get(orderId).size} subscribers`);
  }

  // ==================================================
  // ❌ Gỡ client khỏi order
  // ==================================================
  removeFromOrder(ws, orderId) {
    if (this.connections.has(orderId)) {
      this.connections.get(orderId).delete(ws);

      // Nếu order không còn ai theo dõi → xóa luôn entry
      if (this.connections.get(orderId).size === 0) {
        this.connections.delete(orderId);
        console.log(`📊 Order ${orderId} has no more subscribers`);
      } else {
        console.log(`📊 Order ${orderId} now has ${this.connections.get(orderId).size} subscribers`);
      }
    }
  }

  // ==================================================
  // 🧹 Khi client ngắt kết nối
  // ==================================================
  handleDisconnection(ws) {
    const orderId = this.clientOrders.get(ws);
    if (orderId) {
      this.removeFromOrder(ws, orderId);
      this.clientOrders.delete(ws);
    }
  }

  // ==================================================
  // 📢 Gửi thông báo cho tất cả client theo dõi order
  // ==================================================
  broadcastToOrder(orderId, eventType, data) {
    const orderIdStr = orderId.toString();
    if (!this.connections.has(orderIdStr)) return;

    const message = {
      type: eventType,
      orderId: orderIdStr,
      data,
      timestamp: new Date().toISOString()
    };

    const subscribers = this.connections.get(orderIdStr);
    let sentCount = 0, failedCount = 0;

    subscribers.forEach(ws => {
      try {
        // ✅ Kiểm tra xem socket client này còn "sống" không (đang mở kết nối)
        if (ws.readyState === WebSocket.OPEN) {
          // 📨 Gửi message (dưới dạng JSON) cho client qua WebSocket
          ws.send(JSON.stringify(message));
          sentCount++; // Đếm số client đã gửi thành công
        } else {
          // ⚠️ Nếu socket này đã đóng (dead connection)
          subscribers.delete(ws); // → Xóa client khỏi danh sách order này
          this.clientOrders.delete(ws); // → Xóa mapping client ↔ order
          failedCount++; // Đếm số gửi thất bại
        }
      } catch (error) {
        // ❌ Nếu có lỗi trong quá trình gửi (VD: client mất kết nối đột ngột)
        console.error('❌ Error sending WebSocket message:', error);

        // 🧹 Dọn dẹp để tránh giữ kết nối rác
        subscribers.delete(ws);      // Xóa khỏi danh sách subscriber
        this.clientOrders.delete(ws); // Xóa khỏi map theo dõi order
        failedCount++;
      }
    });
    if (subscribers.size === 0) this.connections.delete(orderIdStr);

    console.log(`📡 Broadcasted ${eventType} to ${sentCount} subscriber(s) for order ${orderIdStr}`, data);
  }

  // ==================================================
  // 📢 Gửi broadcast cho tất cả waiter
  // ==================================================
  broadcastToAllWaiters(eventType, data) {
    const message = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.userRole === 'waiter') {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    console.log(`📡 Broadcasted ${eventType} to ${sentCount} waiter(s)`, data);
  }

  // ==================================================
  // 📢 Broadcast cho tất cả cashier
  // ==================================================
  broadcastToAllCashiers(eventType, data) {
    const message = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    this.wss?.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.userRole === "cashier") {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    console.log(`📡 Broadcasted ${eventType} to ${sentCount} cashier(s)`, data);
  }

  // ==================================================
  // 📢 Gửi broadcast cho waiter cụ thể (theo waiterId)
  // ==================================================
  broadcastToWaiter(waiterId, eventType, data) {
    if (!waiterId) {
      console.warn('⚠️ broadcastToWaiter: waiterId is required');
      return;
    }

    const message = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    const waiterIdStr = waiterId.toString();
    let sentCount = 0;

    this.wss.clients.forEach(ws => {
      if (
        ws.readyState === WebSocket.OPEN &&
        ws.userRole === 'waiter' &&
        ws.userId &&
        ws.userId.toString() === waiterIdStr
      ) {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`📡 Broadcasted ${eventType} to waiter ${waiterIdStr}`, data);
    } else {
      console.log(`📡 Waiter ${waiterIdStr} not connected or not found for event ${eventType}`);
    }
  }

  // ==================================================
  // 📢 Gửi broadcast cho kitchen
  // ==================================================
  broadcastToAllKitchen(eventType, data) {
    const message = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.userRole === 'kitchen_manager') {
        ws.send(JSON.stringify(message));
      }
    });
  }

  // ==================================================
  // 📢 Gửi thông báo cập nhật bàn cho waiter (khi bàn được giải phóng/đổi trạng thái)
  // ==================================================
  broadcastTableUpdate(tableId, tableData) {
    const message = {
      type: 'table:updated',
      data: tableData,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    this.wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && ws.userRole === 'waiter') {
        ws.send(JSON.stringify(message));
        sentCount++;
      }
    });

    console.log(`📡 Broadcasted table:updated for table ${tableId} to ${sentCount} waiter(s)`);
  }

  // ==================================================
  // ❤️ Heartbeat: kiểm tra connection còn sống
  // ==================================================
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

  // ==================================================
  // 📊 Lấy thống kê hệ thống WebSocket
  // ==================================================
  getStats() {
    return {
      totalConnections: this.wss.clients.size,
      totalOrders: this.connections.size,
      ordersWithSubscribers: Array.from(this.connections.keys()),
      connectionsPerOrder: Object.fromEntries(
        Array.from(this.connections.entries()).map(([orderId, connections]) => [
          orderId, connections.size
        ])
      )
    };
  }

  // ==================================================
  // 🧨 Dừng và dọn dẹp toàn bộ WebSocket server
  // ==================================================
  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.wss) this.wss.close();
  }
}

// Singleton export (chỉ có 1 WebSocketService chạy trong hệ thống)
const webSocketService = new WebSocketService();
module.exports = webSocketService;
