import { useEffect, useRef, useState } from 'react';

/**
 * ✅ useAdminWebSocket Hook
 * Dùng cho giao diện Admin để:
 *  - Kết nối tới WebSocket server
 *  - Nhận message real-time về preorder mới
 *  - Authenticate với role 'admin'
 */
const useAdminWebSocket = () => {
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

      // Kết nối tới server WebSocket (chạy ở port 5000)
      const ws = new WebSocket('ws://localhost:5000/ws');
      wsRef.current = ws;

      // Khi kết nối thành công
      ws.onopen = () => {
        console.log('🔌 Admin WebSocket connected');
        setConnectionState('connected');
        reconnectAttempts.current = 0; // Reset bộ đếm reconnect

        // Gửi message xác thực để server biết đây là admin
        ws.send(JSON.stringify({
          type: 'auth',
          role: 'admin'
        }));
      };

      // Khi nhận được message từ server
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Admin WebSocket message:', message);
          setLastMessage(message); // Lưu message mới vào state
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      // Khi kết nối bị đóng (do lỗi, mất mạng,...)
      ws.onclose = () => {
        console.log('🔌 Admin WebSocket disconnected');
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
        console.error('❌ Admin WebSocket error:', error);
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
  }, []);

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

