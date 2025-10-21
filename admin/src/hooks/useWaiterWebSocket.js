import { useEffect, useRef, useState } from 'react';

const useWaiterWebSocket = () => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      setConnectionState('connecting');
      
      const ws = new WebSocket('ws://localhost:5000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 Waiter WebSocket connected');
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          role: 'waiter'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Waiter WebSocket message:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('🔌 Waiter WebSocket disconnected');
        setConnectionState('disconnected');
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setConnectionState('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`🔄 Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, 2000 * reconnectAttempts.current); // Exponential backoff
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Waiter WebSocket error:', error);
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
    disconnect
  };
};

export default useWaiterWebSocket;
