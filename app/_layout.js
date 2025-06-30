import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
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
import * as Linking from 'expo-linking';

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

export default function RootLayout() {
  const router = useRouter();
  // Remove font loading since the files don't exist
  const [fontsLoaded] = useState(true);

  // Handle deep linking for auth verification
  useEffect(() => {
    // Handle deep links when the app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Handle deep links that launched the app
    const initializeDeepLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };
    
    initializeDeepLink();
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Function to handle deep links
  const handleDeepLink = ({ url }) => {
    if (!url) return;
    
    console.log('Received deep link:', url);
    
    // Handle both production and development deep links
    if (url.includes('/auth/v1/verify') || 
        url.includes('/auth/verify') || 
        url.includes('token=') || 
        url.includes('/--/verification-success')) {
      try {
        // Extract token from URL if present
        let token = '';
        
        if (url.includes('token=')) {
          // Parse the URL to extract the token parameter
          try {
            const urlObj = new URL(url);
            token = urlObj.searchParams.get('token');
          } catch (e) {
            // Fallback for malformed URLs
            const tokenMatch = url.match(/token=([^&]+)/);
            if (tokenMatch && tokenMatch[1]) {
              token = tokenMatch[1];
            }
          }
        } else if (url.includes('/auth/v1/verify/')) {
          // Extract token from path if it's in the URL path
          const parts = url.split('/auth/v1/verify/');
          if (parts.length > 1) {
            token = parts[1].split('?')[0];
          }
        }
        
        if (token) {
          console.log('Auth verification token received:', token.substring(0, 10) + '...');
          // Navigate to verification success screen with the token
          router.push({
            pathname: '/verification-success',
            params: { token }
          });
          return;
        }
      } catch (error) {
        console.error('Error parsing deep link URL:', error);
      }
    }
    
    // Handle other types of deep links here if needed
  };

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <ChatProvider>
                <Stack
                  screenOptions={{
                    headerShown: true,
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="sign-in" options={{ headerTitle: "Sign In" }} />
                  <Stack.Screen name="sign-up" options={{ headerTitle: "Sign Up" }} />
                  <Stack.Screen name="propertyDetails" options={{ headerTitle: "Property Details" }} />
                  <Stack.Screen name="payment-methods" options={{ headerTitle: "Payment Methods" }} />
                </Stack>
              </ChatProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
} 