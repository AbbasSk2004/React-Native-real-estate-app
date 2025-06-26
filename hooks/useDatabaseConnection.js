import { useState, useEffect } from 'react';
import { endpoints } from '../services/api';
import { useToast } from './useToast';

export const useDatabaseConnection = () => {
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const toast = useToast();

  const checkDatabaseConnection = async () => {
    try {
      setIsChecking(true);
      // Use health check endpoint instead of verifyToken
      await endpoints.health.check();
      setIsDbConnected(true);
      return true;
    } catch (error) {
      // Only set as disconnected for network errors or 500s
      if (!error.response || error.response.status === 500) {
        console.error('Database connection error:', error);
        setIsDbConnected(false);
        toast.error('Unable to connect to server');
      } else {
        // For other errors, we're still connected
        setIsDbConnected(true);
      }
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (mounted) {
        await checkDatabaseConnection();
      }
    };

    check();

    // Check database connection every 5 minutes
    const interval = setInterval(() => {
      if (mounted) {
        check();
      }
    }, 300000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    isDbConnected,
    isChecking,
    checkDatabaseConnection
  };
}; 