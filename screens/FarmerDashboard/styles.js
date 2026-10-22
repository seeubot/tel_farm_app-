import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive spacing helpers
export const spacing = {
  xs: width * 0.02,      // 2% of screen width
  sm: width * 0.03,      // 3%
  md: width * 0.04,      // 4%
  lg: width * 0.05,      // 5%
  xl: width * 0.06,      // 6%
  xxl: width * 0.08,     // 8%
};

export const fontSize = {
  xs: width * 0.03,      // ~12px on 400dp width
  sm: width * 0.035,     // ~14px
  md: width * 0.04,      // ~16px
  lg: width * 0.05,      // ~20px
  xl: width * 0.06,      // ~24px
  xxl: width * 0.08,     // ~32px
};

// Shared color palette
export const colors = {
  light: {
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
  },
  dark: {
    primary: '#4CAF50',
    primaryLight: '#2C2C2C',
    primaryDark: '#388E3C',
    secondary: '#FF9800',
    secondaryLight: '#3D2A1A',
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
    verifiedBg: '#2C2C2C',
  },
};

// Shared shadow styles
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Shared border radius
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

// Function to get dynamic styles based on theme
export const getGlobalStyles = (isDarkTheme) => {
  const themeColors = isDarkTheme ? colors.dark : colors.light;
  
  return {
    // Container styles
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    
    // Header styles
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.md,
    },
    headerTitle: {
      fontSize: fontSize.lg,
      fontWeight: 'bold',
      color: themeColors.primary,
      flex: 1,
      marginLeft: spacing.sm,
    },
    
    // Card styles
    card: {
      backgroundColor: themeColors.surface,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      ...shadows.medium,
    },
    
    // Text styles
    title: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: themeColors.primary,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: themeColors.textSecondary,
    },
    bodyText: {
      fontSize: fontSize.md,
      color: themeColors.text,
    },
    caption: {
      fontSize: fontSize.xs,
      color: themeColors.textMuted,
    },
    
    // Button styles
    primaryButton: {
      backgroundColor: themeColors.primary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: themeColors.primary,
    },
    outlineButtonText: {
      color: themeColors.primary,
      fontWeight: '600',
      fontSize: fontSize.sm,
    },
    
    // Input styles
    input: {
      backgroundColor: isDarkTheme ? '#2C2C2C' : '#F5F5F5',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.sm,
      color: themeColors.text,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    
    // Divider
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
      marginVertical: spacing.md,
    },
    
    // Row layout
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    // Badge styles
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      alignSelf: 'flex-start',
    },
    badgePrimary: {
      backgroundColor: themeColors.primaryLight,
    },
    badgeText: {
      fontSize: fontSize.xs,
      fontWeight: '500',
      color: themeColors.primary,
    },
    
    // Verified badge
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.verifiedBg,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    verifiedText: {
      fontSize: fontSize.xs,
      color: themeColors.verified,
      marginLeft: 2,
      fontWeight: '500',
    },
    
    // Chip styles
    chip: {
      backgroundColor: themeColors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      marginRight: spacing.xs,
      marginBottom: spacing.xs,
    },
    chipText: {
      fontSize: fontSize.xs,
      color: themeColors.primary,
    },
    chipActive: {
      backgroundColor: themeColors.primary,
    },
    chipTextActive: {
      color: '#FFFFFF',
    },
    
    // Empty state
    emptyContainer: {
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: themeColors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: themeColors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    
    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  };
};

// Responsive width helpers
export const getResponsiveWidth = (percentage) => {
  return (width * percentage) / 100;
};

// Responsive height helpers
export const getResponsiveHeight = (percentage) => {
  return (height * percentage) / 100;
};

// Export dimensions for direct use
export { width, height };