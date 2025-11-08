class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.WS_URL = process.env.REACT_APP_WS_URL || 'ws://192.169.100.22:8000';
  }

  connect(userId = null, role = 'customer') {
    if (!userId) {
      console.log('No user ID provided, skipping WebSocket connection');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, WebSocket connection may be rejected');
      }

      const wsUrl = `${this.WS_URL}/ws/${userId}${token ? `?token=${token}` : ''}`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket Connected Successfully');
        this.reconnectAttempts = 0;
        this.notifySubscribers('connection', true);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket Disconnected:', event.code, event.reason);
        this.notifySubscribers('connection', false);
        
        if (event.code !== 1000) {
          this.attemptReconnect(userId, role);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        console.debug('Connection Details:', {
          url: wsUrl,
          readyState: this.ws?.readyState,
          userId,
          role
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket JSON Message Received:', data);
          
          if (data.type) {
            this.notifySubscribers(data.type, data);
          } else {
            this.notifySubscribers('notification', data);
          }
        } catch (error) {
          console.log('WebSocket Text Message Received:', event.data);
          this.notifySubscribers('notification', { 
            message: event.data, 
            type: 'info',
            timestamp: new Date().toISOString()
          });
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  attemptReconnect(userId, role) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting to reconnect in ${delay}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        console.log('Executing reconnection attempt...');
        this.connect(userId, role);
      }, delay);
    } else {
      console.warn('Max reconnection attempts reached. Please refresh the page.');
    }
  }

  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type).add(callback);
    return () => this.unsubscribe(type, callback);
  }

  unsubscribe(type, callback) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).delete(callback);
      if (this.subscribers.get(type).size === 0) {
        this.subscribers.delete(type);
      }
    }
  }

  notifySubscribers(type, data) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      console.log('Disconnecting WebSocket...');
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
      this.reconnectAttempts = 0;
    }
  }

  sendMessage(type, data) {
    if (!this.ws) {
      console.warn('Cannot send message: WebSocket not initialized');
      return;
    }
    
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({ type, ...data });
        this.ws.send(message);
        console.log('Message sent:', { type, ...data });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.warn('Cannot send message: WebSocket not open', 
        { readyState: this.ws.readyState });
    }
  }
}

export const wsService = new WebSocketService();