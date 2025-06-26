import api from '../services/api';

export const checkEnvironmentSetup = async () => {
  // Only check for backend API env variable
  if (!process.env.REACT_APP_API_BASE_URL) {
    console.warn('⚠️ REACT_APP_API_BASE_URL not set, using default: http://localhost:3001/api');
  }

  // Test backend API connection
  try {
    const isHealthy = await api.checkHealth();
    if (isHealthy) {
      console.log('✅ Backend API connection successful');
      return true;
    }
    
    // If health check returns false (not throws), log a warning
    console.warn(`
      Backend API health check failed!
      Please check:
      1. Your environment variables are correct
      2. The API server is running on ${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}
      3. Your network connection is working
    `);
    return false;
  } catch (error) {
    // Log error and return false
    console.error('Backend API connection error:', error);
    return false;
  }
};

export const getSetupInstructions = () => {
  return `
    To set up your environment:
    1. Create a .env file in your project root
    2. Add this variable to your .env file:
       REACT_APP_API_BASE_URL=http://localhost:3001/api
    3. Start the API server:
       - Navigate to the backend directory
       - Run npm install
       - Run npm start
    4. Save the .env file
    5. Restart your development server
    Need help? Check the documentation in the README.md
  `;
}; 