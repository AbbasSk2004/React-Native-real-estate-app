import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * A reusable component that automatically applies theme styling to its contents
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.style - Additional style to apply to the container
 * @param {string} props.backgroundColor - Override the background color
 * @param {boolean} props.useSurface - Use the surface color instead of background color
 */
export const ThemedView = ({ 
  children, 
  style, 
  backgroundColor,
  useSurface = false,
  ...props 
}) => {
  const { isDark, getThemeColors } = useTheme();
  const colors = getThemeColors();
  
  const bgColor = backgroundColor || (useSurface ? colors.surface : colors.background);
  
  return (
    <View 
      style={[
        styles.container,
        { backgroundColor: bgColor },
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

/**
 * A reusable text component that automatically applies theme styling
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.style - Additional style to apply to the text
 * @param {string} props.color - Override the text color
 */
export const ThemedText = ({ 
  children, 
  style, 
  color,
  ...props 
}) => {
  const { isDark, getThemeColors } = useTheme();
  const colors = getThemeColors();
  
  return (
    <Text 
      style={[
        styles.text,
        { color: color || colors.text },
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 14,
  }
});

export default ThemedView; 