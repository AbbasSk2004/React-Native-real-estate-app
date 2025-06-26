// This file is no longer needed since we're using expo-router/entry in index.js

import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions } from './utils/notificationUtils';

// Configure notification handler for when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  // Request notification permissions when app starts
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await requestNotificationPermissions();
      } catch (error) {
        console.log('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();
  }, []);
  
  return (
    <ExpoRoot context={require.context('./app')} />
  );
}

registerRootComponent(App);

