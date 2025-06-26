import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Platform, Appearance } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../constants/theme';

const ThemeContext = createContext();

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// Color schemes
export const COLOR_SCHEMES = {
  DEFAULT: 'default',
  BLUE: 'blue',
  GREEN: 'green',
  PURPLE: 'purple',
  ORANGE: 'orange'
};

// Font sizes
export const FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};

// Action types
const THEME_ACTIONS = {
  SET_THEME: 'SET_THEME',
  SET_COLOR_SCHEME: 'SET_COLOR_SCHEME',
  SET_FONT_SIZE: 'SET_FONT_SIZE',
  SET_SYSTEM_THEME: 'SET_SYSTEM_THEME',
  TOGGLE_THEME: 'TOGGLE_THEME',
  RESET_THEME: 'RESET_THEME'
};

// Initial state
const initialState = {
  theme: THEMES.LIGHT,
  colorScheme: COLOR_SCHEMES.DEFAULT,
  fontSize: FONT_SIZES.MEDIUM,
  systemTheme: THEMES.LIGHT,
  isDark: false
};

// Reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case THEME_ACTIONS.SET_THEME:
      const newTheme = action.payload;
      const isDark = newTheme === THEMES.AUTO 
        ? state.systemTheme === THEMES.DARK
        : newTheme === THEMES.DARK;
      
      return {
        ...state,
        theme: newTheme,
        isDark
      };

    case THEME_ACTIONS.SET_COLOR_SCHEME:
      return {
        ...state,
        colorScheme: action.payload
      };

    case THEME_ACTIONS.SET_FONT_SIZE:
      return {
        ...state,
        fontSize: action.payload
      };

    case THEME_ACTIONS.SET_SYSTEM_THEME:
      const systemTheme = action.payload;
      const isDarkWithSystem = state.theme === THEMES.AUTO 
        ? systemTheme === THEMES.DARK
        : state.isDark;
      
      return {
        ...state,
        systemTheme,
        isDark: isDarkWithSystem
      };

    case THEME_ACTIONS.TOGGLE_THEME:
      const toggledTheme = state.theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
      return {
        ...state,
        theme: toggledTheme,
        isDark: toggledTheme === THEMES.DARK
      };

    case THEME_ACTIONS.RESET_THEME:
      return {
        ...initialState,
        systemTheme: state.systemTheme
      };

    default:
      return state;
  }
};

// Provider component
export const ThemeProvider = ({ children }) => {
  // Initialize with stored theme or default to light
  const [state, dispatch] = useReducer(themeReducer, initialState);
  
  // Persisted theme handling -------------------------------------------------
  // Reuse the cross-platform `useLocalStorage` hook so that the theme value is
  // stored in AsyncStorage on native (Android/iOS/emulators) and localStorage
  // on web. This guarantees the preference survives full app restarts.

  const [persistedTheme, setPersistedTheme] = useLocalStorage('theme', THEMES.LIGHT);

  // Sync the persisted value into our reducer-managed state on mount / change.
  useEffect(() => {
    if (persistedTheme && persistedTheme !== state.theme) {
      dispatch({ type: THEME_ACTIONS.SET_THEME, payload: persistedTheme });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedTheme]);

  // Detect system theme preference
  useEffect(() => {
    if (Platform.OS === 'web') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const systemTheme = mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
      
      dispatch({ type: THEME_ACTIONS.SET_SYSTEM_THEME, payload: systemTheme });

      const handleChange = (e) => {
        const newSystemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
        dispatch({ type: THEME_ACTIONS.SET_SYSTEM_THEME, payload: newSystemTheme });
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      const colorScheme = Appearance.getColorScheme();
      const systemTheme = colorScheme === 'dark' ? THEMES.DARK : THEMES.LIGHT;
      dispatch({ type: THEME_ACTIONS.SET_SYSTEM_THEME, payload: systemTheme });

      const subscription = Appearance.addChangeListener(({ colorScheme: cs }) => {
        const newTheme = cs === 'dark' ? THEMES.DARK : THEMES.LIGHT;
        dispatch({ type: THEME_ACTIONS.SET_SYSTEM_THEME, payload: newTheme });
      });
      return () => subscription.remove();
    }
  }, []);

  // Apply theme to document - only relevant on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.remove('color-default', 'color-blue', 'color-green', 'color-purple', 'color-orange');
    root.classList.remove('font-small', 'font-medium', 'font-large');
    
    // Apply current theme
    root.classList.add(`theme-${state.isDark ? 'dark' : 'light'}`);
    root.classList.add(`color-${state.colorScheme}`);
    root.classList.add(`font-${state.fontSize}`);
    
    // Set CSS custom properties
    root.style.setProperty('--theme-mode', state.isDark ? 'dark' : 'light');
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', state.isDark ? '#1a1a1a' : '#ffffff');
    }
  }, [state.isDark, state.colorScheme, state.fontSize]);

  // Set theme
  const setTheme = (theme) => {
    dispatch({ type: THEME_ACTIONS.SET_THEME, payload: theme });
    // Persist the new theme through the hook (AsyncStorage on native /
    // localStorage on web). No need for explicit try/catch – the hook already
    // handles its own error logging.
    setPersistedTheme(theme);
  };

  // Set color scheme
  const setColorScheme = (colorScheme) => {
    dispatch({ type: THEME_ACTIONS.SET_COLOR_SCHEME, payload: colorScheme });
  };

  // Set font size
  const setFontSize = (fontSize) => {
    dispatch({ type: THEME_ACTIONS.SET_FONT_SIZE, payload: fontSize });
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = state.theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setTheme(newTheme);
  };

  // Reset to default theme
  const resetTheme = () => {
    dispatch({ type: THEME_ACTIONS.RESET_THEME });
    setTheme(THEMES.LIGHT);
  };

  // Get theme colors
  const getThemeColors = () => {
    return state.isDark ? darkTheme.colors : lightTheme.colors;
  };

  // Check if user prefers reduced motion (web only)
  const prefersReducedMotion = () => {
    if (Platform.OS !== 'web') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // Get contrast ratio for accessibility
  const getContrastRatio = (color1, color2) => {
    const getLuminance = (color) => {
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const value = {
    // State
    ...state,
    
    // Constants
    THEMES,
    COLOR_SCHEMES,
    FONT_SIZES,
    
    // Actions
    setTheme,
    setColorScheme,
    setFontSize,
    toggleTheme,
    resetTheme,
    
    // Utilities
    getThemeColors,
    prefersReducedMotion,
    getContrastRatio
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Higher-order component for theme-aware components
export const withTheme = (Component) => {
  return function ThemedComponent(props) {
    const theme = useTheme();
    return <Component {...props} theme={theme} />;
  };
};