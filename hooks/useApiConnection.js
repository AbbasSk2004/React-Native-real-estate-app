import { useState, useEffect } from 'react';
import { endpoints } from '../services/api';
import { useToast } from './useToast';

export const useApiConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const toast = useToast();

  const checkConnection = async () => {
    try {
      setIsChecking(true);
      await endpoints.auth.verifyConnection();
      setIsConnected(true);
      return true;
    } catch (error) {
      setIsConnected(false);
      toast.error('Unable to connect to server. Please check your connection.');
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Set up periodic connection check
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isChecking,
    checkConnection
  };
}; 