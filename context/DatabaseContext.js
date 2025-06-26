import React, { createContext, useContext } from 'react';
import { useDatabaseConnection } from '../hooks/useDatabaseConnection';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const dbConnection = useDatabaseConnection();

  return (
    <DatabaseContext.Provider value={dbConnection}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}; 