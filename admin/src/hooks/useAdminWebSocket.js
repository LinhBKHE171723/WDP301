import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
 * ✅ useAdminWebSocket Hook
 * Dùng cho giao diện Admin/Cashier để:
 *  - Kết nối tới WebSocket server
 *  - Nhận message real-time về preorder mới
 *  - Authenticate với role 'admin' hoặc 'cashier'
 */
const useAdminWebSocket = () => {
  const { user } = useAuth();
  const userRole = user?.role || 'admin';
  // -------------------------------
  // 🧠 State lưu trạng thái kết nối & message
  // -------------------------------
  const [connectionState, setConnectionState] = useState('disconnected'); // 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
  const [lastMessage, setLastMessage] = useState(null); // Lưu tin nhắn cuối cùng nhận được

  // -------------------------------
  // ⚙️ useRef lưu các biến không làm re-render
  // -------------------------------
  const wsRef = useRef(null); // Giữ đối tượng WebSocket hiện tại
  const reconnectTimeoutRef = useRef(null); // Timeout để reconnect
  const reconnectAttempts = useRef(0); // Đếm số lần reconnect

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
        console.log(`🔌 ${userRole === 'admin' ? 'Admin' : 'Cashier'} WebSocket connected`);
        setConnectionState('connected');
        reconnectAttempts.current = 0; // Reset bộ đếm reconnect

        // Gửi message xác thực để server biết role
        const authMessage = {
          type: 'auth',
          role: userRole
        };
        console.log(`🔐 Sending WebSocket auth:`, authMessage);
        ws.send(JSON.stringify(authMessage));
      };

      // Khi nhận được message từ server
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log(`📨 ${userRole === 'admin' ? 'Admin' : 'Cashier'} WebSocket message received:`, message.type, message);
          setLastMessage(message); // Lưu message mới vào state
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      // Khi kết nối bị đóng (do lỗi, mất mạng,...)
      ws.onclose = () => {
        console.log(`🔌 ${userRole === 'admin' ? 'Admin' : 'Cashier'} WebSocket disconnected`);
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
        console.error(`❌ ${userRole === 'admin' ? 'Admin' : 'Cashier'} WebSocket error:`, error);
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
  // 🎬 useEffect tự động connect khi component mount
  // và ngắt kết nối khi unmount
  // -------------------------------
  useEffect(() => {
    connect(); // Bắt đầu kết nối WebSocket

    return () => {
      disconnect(); // Cleanup khi component bị huỷ
    };
  }, [userRole]); // Reconnect khi role thay đổi

  // -------------------------------
  // 📤 Trả về các hàm & state cho component dùng
  // -------------------------------
  return {
    connectionState,
    lastMessage,
    connect,
    disconnect
  };
};

export default useAdminWebSocket;

