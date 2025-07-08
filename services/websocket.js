import config from '../config';
import authStorage from '../utils/authStorage';
import { showLocalNotification } from './notificationService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 3000; // ms
    this.listeners = new Map();
    this.pendingMessages = [];
    this.debug = true; // Enable debug logging
    this.lastReconnectTime = 0;
    this.minReconnectInterval = 2000; // Minimum time between reconnect attempts (ms)
    this.reconnectTimeoutId = null;
    this.connectionInProgress = false;
  }

  async connect() {
    // Don't attempt to connect if a connection is already in progress
    if (this.connectionInProgress) {
      if (this.debug) {
        console.log('[WebSocket] Connection already in progress, skipping');
      }
      return;
    }
    
    // Avoid duplicate connections
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    // Throttle reconnection attempts
    const now = Date.now();
    if (now - this.lastReconnectTime < this.minReconnectInterval) {
      if (this.debug) {
        console.log('[WebSocket] Throttling connection attempt');
      }
      return;
    }
    
    this.lastReconnectTime = now;
    this.connectionInProgress = true;

    try {
      // 1. Synchronous lookup (web) ➜ immediate if available
      let token = authStorage.getToken ? authStorage.getToken('access_token') : null;

      // 2. Fallback to async storage (React-Native) if not found
      if (!token && authStorage.getAccessToken) {
        try {
          token = await authStorage.getAccessToken();
        } catch (_) {
          // ignore
        }
      }

      const wsUrl = `${config.WS_URL}?token=${token || ''}`;
      
      if (this.debug) {
        console.log(`[WebSocket] Connecting to ${wsUrl}`);
      }
      
      this.socket = new WebSocket(wsUrl);

      // Bind handlers
      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onclose = this.onClose.bind(this);
      this.socket.onerror = this.onError.bind(this);
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      this.connectionInProgress = false;
      this.scheduleReconnect();
    }
  }

  disconnect() {
    // Clear any pending reconnect timeouts
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      if (this.debug) console.log('[WebSocket] Disconnected');
    }
    
    this.connectionInProgress = false;
  }

  onOpen() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.connectionInProgress = false;
    if (this.debug) console.log('[WebSocket] Connected successfully');
    this.flushQueue();
    this.notify('connection', { connected: true });
  }

  onMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;
      
      if (this.debug) {
        console.log(`[WebSocket] Received message: ${type}`, data);
      }
      
      // Special handling for notification-related events
      if (type === 'notification_created' || type === 'notification_updated' || 
          type === 'notification_deleted' || type === 'new_message') {
        // These events should also trigger notification listeners for real-time updates
        if (type === 'notification_created' && data?.notification) {
          // Fire a local push notification so the user gets a system alert
          showLocalNotification(data.notification);
        } else if (type === 'new_message') {
          // For new messages we may not have a wrapped notification object – craft a placeholder
          const localNotif = {
            title: 'New message',
            message: data?.content || 'You have a new message',
            data,
            type: 'message',
          };
          showLocalNotification(localNotif);
        }

        if (type === 'new_message') {
          // Forward message events to notification_created listeners as well
          this.notify('notification_created', data);
        }
        
        // Always notify the specific event type
        this.notify(type, data);
      } 
      else if (type) {
        // For other event types, just notify normally
        this.notify(type, data);
      }
    } catch (err) {
      console.error('[WebSocket] Error parsing message:', err, event.data);
    }
  }

  onClose(e) {
    this.isConnected = false;
    this.connectionInProgress = false;
    if (this.debug) {
      console.log(`[WebSocket] Connection closed with code ${e.code}, reason: ${e.reason}`);
    }
    this.notify('connection', { connected: false });
    if (e.code !== 1000) this.scheduleReconnect();
  }

  onError(err) {
    console.error('[WebSocket] Error:', err);
    this.connectionInProgress = false;
  }

  scheduleReconnect() {
    // Don't schedule reconnect if we're at max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[WebSocket] Max reconnection attempts reached');
      return;
    }
    
    // Don't schedule if we already have a pending reconnect
    if (this.reconnectTimeoutId) {
      return;
    }
    
    this.reconnectAttempts += 1;
    const delay = this.reconnectInterval * Math.min(this.reconnectAttempts, 3); // Cap the exponential backoff
    
    if (this.debug) {
      console.log(`[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    }
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      this.connect();
    }, delay);
  }

  flushQueue() {
    if (!this.pendingMessages.length) return;
    if (this.debug) {
      console.log(`[WebSocket] Flushing ${this.pendingMessages.length} pending messages`);
    }
    this.pendingMessages.forEach(({ event, data }) => this.send(event, data));
    this.pendingMessages = [];
  }

  send(event, data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push({ event, data });
      this.connect();
      return false;
    }
    try {
      const message = JSON.stringify({ type: event, data });
      if (this.debug) {
        console.log(`[WebSocket] Sending: ${event}`, data);
      }
      this.socket.send(message);
      return true;
    } catch (err) {
      console.error('[WebSocket] Send error:', err);
      return false;
    }
  }

  subscribe(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(cb);
    if (this.debug) {
      console.log(`[WebSocket] Subscribed to ${event}, total listeners: ${this.listeners.get(event).length}`);
    }
    return () => this.unsubscribe(event, cb);
  }

  unsubscribe(event, cb) {
    if (!this.listeners.has(event)) return;
    const arr = this.listeners.get(event).filter(fn => fn !== cb);
    if (arr.length) {
      this.listeners.set(event, arr);
    } else {
      this.listeners.delete(event);
    }
    if (this.debug) {
      console.log(`[WebSocket] Unsubscribed from ${event}`);
    }
  }

  notify(event, data) {
    if (this.listeners.has(event)) {
      if (this.debug && event !== 'connection') {
        console.log(`[WebSocket] Notifying ${this.listeners.get(event).length} listeners for ${event}`);
      }
      this.listeners.get(event).forEach(fn => {
        try { fn(data); } catch (e) { console.error('[WebSocket] Listener error', e); }
      });
    }
  }
  
  // Force reconnect - useful when auth state changes
  reconnect() {
    // Don't attempt if we've reconnected too recently
    const now = Date.now();
    if (now - this.lastReconnectTime < this.minReconnectInterval) {
      if (this.debug) {
        console.log('[WebSocket] Throttling reconnect');
      }
      return;
    }
    
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}

export default new WebSocketService();
