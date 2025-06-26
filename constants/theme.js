/**
 * Theme constants for the real estate app
 * Contains color definitions for light and dark modes
 */

// Color palette
const palette = {
  blue: {
    primary: '#0061FF',
    light: '#3F8CFF',
    dark: '#004EC7',
    background: '#E8F1FF'
  },
  red: {
    primary: '#FF4949',
    light: '#FF7A7A',
    dark: '#D03333'
  },
  neutral: {
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F5F5F5',
    gray100: '#EEEEEE',
    gray200: '#E0E0E0',
    gray300: '#CCCCCC',
    gray400: '#AAAAAA',
    gray500: '#999999',
    gray600: '#666666',
    gray700: '#444444',
    gray800: '#333333',
    gray900: '#1A1A1A'
  }
};

// Light theme
export const lightTheme = {
  colors: {
    primary: palette.blue.primary,
    secondary: palette.blue.light,
    accent: palette.red.primary,
    background: palette.neutral.white,
    surface: palette.neutral.gray50,
    error: palette.red.primary,
    text: palette.neutral.gray900,
    textSecondary: palette.neutral.gray600,
    textMuted: palette.neutral.gray500,
    border: palette.neutral.gray200,
    icon: palette.neutral.gray600,
    success: '#28a745',
    warning: '#ffc107',
    info: '#17a2b8',
  },
  statusBar: {
    style: 'dark-content',
    backgroundColor: palette.neutral.white
  },
  shadow: {
    small: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2
    },
    medium: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4
    },
    large: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6
    }
  }
};

// Dark theme
export const darkTheme = {
  colors: {
    primary: palette.blue.light,
    secondary: palette.blue.primary,
    accent: palette.red.light,
    background: palette.neutral.gray900,
    surface: palette.neutral.gray800,
    error: palette.red.light,
    text: palette.neutral.white,
    textSecondary: palette.neutral.gray300,
    textMuted: palette.neutral.gray400,
    border: palette.neutral.gray700,
    icon: palette.neutral.gray400,
    success: '#33cc5a',
    warning: '#ffcc33',
    info: '#4dc4d4',
  },
  statusBar: {
    style: 'light-content',
    backgroundColor: palette.neutral.gray900
  },
  shadow: {
    small: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2,
      elevation: 2
    },
    medium: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4
    },
    large: {
      shadowColor: palette.neutral.black,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6
    }
  }
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
};

// Typography
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8
  }
}; 