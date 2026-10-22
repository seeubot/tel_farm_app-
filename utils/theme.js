import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
} from 'react';

// Light Theme Colors
export const lightColors = {
  primary: '#2E7D32',
  primaryLight: '#E8F5E9',
  primaryDark: '#1B5E20',
  secondary: '#F57C00',
  secondaryLight: '#FFF3E0',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  error: '#F44336',
  errorLight: '#FFEBEE',
  success: '#4CAF50',
  warning: '#FFC107',
  star: '#FFB300',
  verified: '#2E7D32',
  verifiedBg: '#E8F5E9',
  cardBg: '#FFFFFF',
  inputBg: '#FAFAFA',
  icon: '#666666',
};

// Dark Theme Colors
export const darkColors = {
  primary: '#4CAF50',
  primaryLight: '#1E2A1E',
  primaryDark: '#388E3C',
  secondary: '#FF9800',
  secondaryLight: '#2A1F1A',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#E0E0E0',
  textSecondary: '#B0B0B0',
  textMuted: '#888888',
  border: '#2C2C2C',
  error: '#EF9A9A',
  errorLight: '#3D1A1A',
  success: '#66BB6A',
  warning: '#FFD54F',
  star: '#FFB300',
  verified: '#4CAF50',
  verifiedBg: '#1E2A1E',
  cardBg: '#1E1E1E',
  inputBg: '#2C2C2C',
  icon: '#B0B0B0',
};

const ThemeContext = createContext({
  isDarkTheme: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => !prev);
  }, []);

  const colors = useMemo(
    () => (isDarkTheme ? darkColors : lightColors),
    [isDarkTheme]
  );

  const value = useMemo(
    () => ({
      isDarkTheme,
      colors,
      toggleTheme,
    }),
    [isDarkTheme, colors, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    console.warn(
      'useTheme used outside of ThemeProvider, returning default light theme'
    );
    return { isDarkTheme: false, colors: lightColors, toggleTheme: () => {} };
  }
  return context;
}
