import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TabIcon = ({focused, icon, title, isDark}) => (
  <View style={{
    flex: 1, 
    marginTop: 3, 
    flexDirection: 'column', 
    alignItems: 'center'
  }}>
    <Ionicons name={icon} size={24} color={focused ? '#0061FF' : isDark ? '#AAAAAA' : '#666876'} />
    <Text style={{
      color: focused ? '#0061FF' : isDark ? '#AAAAAA' : '#666876',
      fontSize: 12,
      fontWeight: focused ? '500' : '400',
      width: '100%',
      textAlign: 'center',
      marginTop: 1
    }}>
      {title}
    </Text>
  </View>
)

export default function TabsLayout() {
  const { isAuthenticated, initialized } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  // Only redirect to welcome page if auth is initialized and user is not authenticated
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = () => {
      // Only check authentication state after it has been properly initialized
      if (initialized && !isAuthenticated && isMounted) {
        // Delay navigation until after component mounting is complete
        setTimeout(() => {
          if (isMounted) {
            router.replace('/');
          }
        }, 100);
      }
    };
    
    // Check after a short delay to ensure auth state is properly initialized
    const timeoutId = setTimeout(checkAuth, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, initialized, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#1A1A1A' : 'white',
          borderTopColor: isDark ? '#333333' : '#0061FF1A',
          borderTopWidth: 1,
          minHeight: 70,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({focused}) => (
            <TabIcon icon="home-outline" focused={focused} title="Home" isDark={isDark} />
          )
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({focused}) => (
            <TabIcon icon="search-outline" focused={focused} title="Explore" isDark={isDark} />
          )
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: 'Agents',
          tabBarIcon: ({focused}) => (
            <TabIcon icon="people-outline" focused={focused} title="Agents" isDark={isDark} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({focused}) => (
            <TabIcon icon="person-outline" focused={focused} title="Profile" isDark={isDark} />
          )
        }}
      />
    </Tabs>
  );
} 