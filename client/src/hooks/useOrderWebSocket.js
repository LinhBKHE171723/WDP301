import { useState, useEffect, useRef, useCallback } from 'react';
import { authenticatedFetch } from '../utils/fetchHelper';

// WebSocket configuration constants
const RETRY_INTERVALS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 25000;
const PONG_TIMEOUT = 10000;
const WS_URL = 'ws://localhost:5000/ws';

export const useOrderWebSocket = (orderId) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const pongTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const isManualCloseRef = useRef(false);
  const isConnectedRef = useRef(false);

  // Get retry interval
  const getRetryInterval = () => {
    const index = Math.min(retryCountRef.current, RETRY_INTERVALS.length - 1);
    return RETRY_INTERVALS[index];
  };

  // Stop heartbeat
  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  };

  // Start heartbeat
  const startHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Error sending ping:', error);
        }
        
        if (pongTimeoutRef.current) {
          clearTimeout(pongTimeoutRef.current);
        }
        
        pongTimeoutRef.current = setTimeout(() => {
          console.log('💀 Pong timeout - reconnecting...');
          if (!isManualCloseRef.current) {
            retryCountRef.current++;
            setConnectionState('reconnecting');
            
            if (wsRef.current) {
              wsRef.current.close();
            }

            const retryInterval = getRetryInterval();
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, retryInterval);
          }
        }, PONG_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isManualCloseRef.current) return;

    try {
      setConnectionState('connecting');
      setError(null);

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        setError(null);
        retryCountRef.current = 0;
        isConnectedRef.current = true;
        
        startHeartbeat();
        
        // Subscribe to order if orderId exists
        if (orderId) {
          try {
            ws.send(JSON.stringify({
              type: 'subscribe',
              orderId: orderId
            }));
          } catch (error) {
            console.error('Error subscribing:', error);
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            return;
          }
          
          setLastMessage(message);
          
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        stopHeartbeat();
        isConnectedRef.current = false;
        
        if (!isManualCloseRef.current) {
          retryCountRef.current++;
          setConnectionState('reconnecting');
          
          const retryInterval = getRetryInterval();
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, retryInterval);
        } else {
          setConnectionState('disconnected');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionState('disconnected');
        isConnectedRef.current = false;
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setError(error.message);
      setConnectionState('disconnected');
    }
  }, [orderId]);

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('Manually disconnecting WebSocket');
    isManualCloseRef.current = true;
    
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setConnectionState('disconnected');
    isConnectedRef.current = false;
  }, []);

  // Manual refresh
  const manualRefresh = async (orderId) => {
    if (!orderId) return null;

    try {
      const response = await authenticatedFetch(`http://localhost:5000/api/customer/orders/${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Manual refresh successful');
        return data.data;
      } else {
        console.error('Manual refresh failed:', data.message);
        return null;
      }
    } catch (error) {
      console.error('Manual refresh error:', error);
      return null;
    }
  };

  // Initialize connection
  useEffect(() => {
    isManualCloseRef.current = false;
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]); // Run only once

  // Subscribe to order when orderId changes
  useEffect(() => {
    if (orderId && isConnectedRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'subscribe',
          orderId: orderId
        }));
      } catch (error) {
        console.error('Error subscribing:', error);
      }
    }
  }, [orderId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (pongTimeoutRef.current) {
        clearTimeout(pongTimeoutRef.current);
      }
    };
  }, []);

  return {
    connectionState,
    lastMessage,
    error,
    manualRefresh,
    disconnect,
    reconnect: () => {
      isManualCloseRef.current = false;
      retryCountRef.current = 0;
      connect();
    }
  };
};
