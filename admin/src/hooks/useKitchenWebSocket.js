import { useEffect, useRef, useState } from 'react';

const useKitchenWebSocket = () => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const subscribedOrders = useRef(new Set());

  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = () => {
    try {
      setConnectionState('connecting');
      const ws = new WebSocket('ws://localhost:5000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 Kitchen WebSocket connected');
        setConnectionState('connected');
        reconnectAttempts.current = 0;

        ws.send(JSON.stringify({
          type: 'auth',
          role: 'kitchen_manager'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Kitchen WebSocket message:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 Kitchen WebSocket disconnected');
        setConnectionState('disconnected');

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          setConnectionState('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Attempting to reconnect... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
            connect();
          }, 2000 * reconnectAttempts.current);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Kitchen WebSocket error:', error);
        setConnectionState('disconnected');
      };
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setConnectionState('disconnected');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

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

  const subscribeToOrders = (orderIds) => {
    orderIds.forEach(orderId => {
      if (!subscribedOrders.current.has(orderId)) {
        subscribeToOrder(orderId);
      }
    });
  };

  const unsubscribeFromAllOrders = () => {
    subscribedOrders.current.forEach(orderId => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'unsubscribe',
          orderId: orderId
        }));
      }
    });
    subscribedOrders.current.clear();
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    connectionState,
    lastMessage,
    connect,
    disconnect,
    subscribeToOrder,
    subscribeToOrders,
    unsubscribeFromAllOrders
  };
};

export default useKitchenWebSocket;

