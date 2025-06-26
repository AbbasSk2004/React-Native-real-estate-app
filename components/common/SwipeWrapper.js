import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

// A reusable wrapper that adds left/right swipe navigation between the bottom tabs.
// Pass the tabIndex (0-based) of the **current** screen so the wrapper knows
// where we are in the tab order.
export default function SwipeWrapper({ children, tabIndex }) {
  const router = useRouter();
  const { isDark } = useTheme();

  // Absolute paths to each of the tab screens in left-to-right order.
  // Adjust the paths if you ever rename or reorder your tabs.
  const TAB_ROUTES = [
    '/(tabs)',             // Home (index)
    '/(tabs)/explore',     // Explore
    '/(tabs)/agents',      // Agents
    '/(tabs)/profile',     // Profile
  ];

  const navigateToIndex = (index) => {
    router.replace(TAB_ROUTES[index]);
  };

  // Pan gesture that triggers when the user swipes far enough (≥ 50 px).
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15]) // Engage only for horizontal swipes
    .onEnd((event) => {
      const { translationX } = event;

      // Swipe left ➜ next tab
      if (translationX < -50 && tabIndex < TAB_ROUTES.length - 1) {
        runOnJS(navigateToIndex)(tabIndex + 1);
      }

      // Swipe right ➜ previous tab
      if (translationX > 50 && tabIndex > 0) {
        runOnJS(navigateToIndex)(tabIndex - 1);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, isDark && styles.darkContainer]}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  darkContainer: {
    backgroundColor: '#1A1A1A'
  }
}); 