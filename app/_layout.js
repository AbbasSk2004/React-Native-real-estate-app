import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import 'react-native-gesture-handler';
import { AuthProvider } from '../context/AuthContext';
import { ChatProvider } from '../context/ChatContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';
import 'react-native-url-polyfill/auto';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Error boundary component
const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Add error handler
    const errorHandler = (error) => {
      console.error('Caught error:', error);
      setHasError(true);
    };

    // Set up the error event listeners
    if (global.ErrorUtils) {
      const previousHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        errorHandler(error);
        previousHandler(error, isFatal);
      });
    }

    return () => {
      // Clean up if needed
    };
  }, []);

  if (hasError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Something went wrong
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          The app encountered an error. Please restart the app.
        </Text>
      </View>
    );
  }

  return children;
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [fontsLoaded] = useFonts({
    // Add your custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Hide the splash screen after fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View className="flex-1 items-center justify-center">
      <Text>Loading...</Text>
    </View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ChatProvider>
                <Stack initialRouteName="index">
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="sign-in" options={{ headerTitle: "Sign In" }} />
                  <Stack.Screen name="sign-up" options={{ headerTitle: "Sign Up" }} />
                  <Stack.Screen name="propertyDetails" options={{ headerTitle: "Property Details" }} />
                </Stack>
              </ChatProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
} 