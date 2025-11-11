import { useEffect, useRef, useState } from 'react';

// Helper function to resolve WebSocket URL
function resolveWebSocketUrl() {
  const envUrl = process.env.REACT_APP_WS_URL;
  if (envUrl) return envUrl;

  const apiUrl = process.env.REACT_APP_API_URL;
  if (apiUrl) {
    try {
      const url = new URL(apiUrl);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = url.pathname.replace(/\/api\/?$/, "");
      if (!url.pathname.endsWith("/")) url.pathname += "/";
      url.pathname += "ws";
      return url.toString();
    } catch (error) {
      console.warn("Không thể phân tích REACT_APP_API_URL để tạo websocket URL", error);
    }
  }

  if (typeof window !== "undefined" && window.location) {
    const { protocol, host } = window.location;
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${host}/ws`;
  }

  return "ws://localhost:5000/ws"; // Fallback
}

/**
 * ✅ useWaiterWebSocket Hook
 * Dùng cho giao diện Waiter để:
 *  - Kết nối tới WebSocket server trung gian (wss)
 *  - Nhận message real-time (đơn mới, cập nhật trạng thái)
 *  - Gửi message (subscribe order, phản hồi khách,...)
 * @param {string} userId - ID của waiter (optional, để server biết waiter nào đang kết nối)
 */
const useWaiterWebSocket = (userId = null) => {
  // -------------------------------
  // 🧠 State lưu trạng thái kết nối & message
  // -------------------------------
  const [connectionState, setConnectionState] = useState('disconnected'); // 'connecting' | 'connected' | 'reconnecting'
  const [lastMessage, setLastMessage] = useState(null); // Lưu tin nhắn cuối cùng nhận được

  // -------------------------------
  // ⚙️ useRef lưu các biến không làm re-render
  // -------------------------------
  const wsRef = useRef(null); // Giữ đối tượng WebSocket hiện tại
  const reconnectTimeoutRef = useRef(null); // Timeout để reconnect
  const reconnectAttempts = useRef(0); // Đếm số lần reconnect
  const subscribedOrders = useRef(new Set()); // Danh sách order mà waiter đang subscribe

  const MAX_RECONNECT_ATTEMPTS = 5; // Giới hạn reconnect tối đa

  // -------------------------------
  // 🔌 Hàm kết nối WebSocket
  // -------------------------------
  const connect = () => {
    try {
      setConnectionState('connecting');

      // Kết nối tới server WebSocket
      const ws = new WebSocket(resolveWebSocketUrl());
      wsRef.current = ws;

      // Khi kết nối thành công
      ws.onopen = () => {
        console.log('🔌 Waiter WebSocket connected');
        setConnectionState('connected');
        reconnectAttempts.current = 0; // Reset bộ đếm reconnect

        // Gửi message xác thực để server biết đây là waiter
        ws.send(JSON.stringify({
          type: 'auth',
          role: 'waiter',
          userId: userId // Gửi userId để server có thể broadcast cho waiter cụ thể
        }));
      };

      // Khi nhận được message từ server (WSS)
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Waiter WebSocket message:', message);
          setLastMessage(message); // Lưu message mới vào state
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      // Khi kết nối bị đóng (do lỗi, mất mạng,...)
      ws.onclose = () => {
        console.log('🔌 Waiter WebSocket disconnected');
        setConnectionState('disconnected');

        // Nếu chưa vượt quá giới hạn reconnect → thử lại
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          setConnectionState('reconnecting');

          // Dùng backoff delay tăng dần (2s, 4s, 6s, ...)
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Attempting to reconnect... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
            connect(); // Gọi lại chính nó
          }, 2000 * reconnectAttempts.current);
        }
      };

      // Khi gặp lỗi
      ws.onerror = (error) => {
        console.error('❌ Waiter WebSocket error:', error);
        setConnectionState('disconnected');
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setConnectionState('disconnected');
    }
  };

  // -------------------------------
  // 🔴 Hàm ngắt kết nối WebSocket
  // -------------------------------
  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  // -------------------------------
  // 📡 Subscribe vào 1 order cụ thể
  // waiter gửi lên server để nhận update real-time
  // Trong WebSocket, “subscribe” nghĩa là client nói với server: “Tôi muốn nhận mọi thay đổi liên quan đến order này.”
  // -------------------------------
  const subscribeToOrder = (orderId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        orderId: orderId
      }));
      subscribedOrders.current.add(orderId);
      console.log(`📡 Subscribed to order: ${orderId}`);
    }
  };

  // -------------------------------
  // 🚫 Hủy subscribe 1 order cụ thể
  // -------------------------------
  const unsubscribeFromOrder = (orderId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        orderId: orderId
      }));
      subscribedOrders.current.delete(orderId);
      console.log(`📡 Unsubscribed from order: ${orderId}`);
    }
  };

  // -------------------------------
  // 📦 Subscribe nhiều order cùng lúc
  // (ví dụ waiter vừa đăng nhập, cần nghe tất cả order đang pending)
  // -------------------------------
  const subscribeToOrders = (orderIds) => {
    orderIds.forEach(orderId => {
      if (!subscribedOrders.current.has(orderId)) {
        subscribeToOrder(orderId);
      }
    });
  };

  // -------------------------------
  // 🧹 Hủy tất cả order đang theo dõi
  // (khi waiter logout hoặc reload trang)
  // -------------------------------
  const unsubscribeFromAllOrders = () => {
    subscribedOrders.current.forEach(orderId => {
      unsubscribeFromOrder(orderId);
    });
    subscribedOrders.current.clear();
  };

  // -------------------------------
  // 🎬 useEffect tự động connect khi component mount
  // và ngắt kết nối khi unmount
  // -------------------------------
  useEffect(() => {
    connect(); // Bắt đầu kết nối WebSocket

    return () => {
      disconnect(); // Cleanup khi component bị huỷ
    };
  }, []);

  // -------------------------------
  // 📤 Trả về các hàm & state cho component dùng
  // -------------------------------
  return {
    connectionState,
    lastMessage,
    connect,
    disconnect,
    subscribeToOrder,
    unsubscribeFromOrder,
    subscribeToOrders,
    unsubscribeFromAllOrders
  };
};

export default useWaiterWebSocket;
