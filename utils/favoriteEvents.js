// Lightweight event-bus implementation (avoids Node's EventEmitter)
// Works in both React Native and web without additional deps.

const listeners = {};

const on = (event, handler) => {
  listeners[event] = listeners[event] || new Set();
  listeners[event].add(handler);
};

const off = (event, handler) => {
  if (!listeners[event]) return;
  listeners[event].delete(handler);
};

const emit = (event, payload) => {
  if (!listeners[event]) return;
  listeners[event].forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      // Prevent one faulty listener from breaking the chain
      console.error('favoriteEvents listener error:', err);
    }
  });
};

export default {
  on,
  off,
  emit,
}; 