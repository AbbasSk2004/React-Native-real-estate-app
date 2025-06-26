const config = {
  API_URL: __DEV__ 
    ? 'http://localhost:8000' // Development URL
    : 'https://eskan-real-estate-backend.onrender.com/api', // Production API URL
  WS_URL: __DEV__
    ? 'ws://localhost:8000'
    : 'wss://eskan-real-estate-backend.onrender.com', // Production WebSocket URL
};

export default config; 