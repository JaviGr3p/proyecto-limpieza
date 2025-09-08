import { useEffect, useRef } from 'react';

export const useWebSocket = (userId, userRole, handlers) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const getWebSocketUrl = () => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = process.env.REACT_APP_WS_URL || 'ws://192.168.100.22:8000';
  return wsHost.replace(/^https?:/, wsProtocol.replace(':', ''));
};

  const connect = () => {
    if (!userId || !userRole) {
      console.warn('No userId or userRole provided for WebSocket connection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const wsUrl = `${getWebSocketUrl()}/ws/${userId}${token ? `?token=${token}` : ''}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        reconnectAttemptsRef.current = 0;
        handlers?.connection?.(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          if (data.type === 'notification') {
            handlers?.notification?.(data);
          } else if (data.type === 'booking_update') {
            handlers?.bookingUpdate?.(data);
          } else {
            handlers?.notification?.({ message: event.data, type: 'info' });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          handlers?.notification?.({ message: event.data, type: 'info' });
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        handlers?.connection?.(false);
        
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        handlers?.error?.(error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      handlers?.error?.(error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
    }
  };

  const sendMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  };

  useEffect(() => {
    connect();
    return disconnect;
  }, [userId, userRole]);

  return { connect, disconnect, sendMessage };
};
