import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsSection({ 
  title, 
  items, 
  isDarkTheme,
  radiusValue,
  onRadiusChange,
  onIncrement,
  onDecrement,
  onThemeToggle,  // Pass toggle function from parent
  themeValue       // Pass theme value from parent
}) {
  const themeColors = isDarkTheme ? {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#E0E0E0',
    textSecondary: '#B0B0B0',
    textMuted: '#888888',
    border: '#2C2C2C',
    primary: '#4CAF50',
    primaryLight: '#2C2C2C',
  } : {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#E0E0E0',
    primary: '#2E7D32',
    primaryLight: '#E8F5E9',
  };

  const styles = {
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.primary,
      marginBottom: 12,
      marginLeft: 4,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      marginBottom: 8,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingText: {
      fontSize: 15,
      color: themeColors.text,
      marginLeft: 12,
    },
    radiusControl: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    radiusBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: themeColors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radiusBtnText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.primary,
    },
    radiusValue: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.primary,
      minWidth: 45,
      textAlign: 'center',
    },
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.settingItem}
          onPress={item.onPress}
          disabled={!item.onPress && item.type !== 'switch' && item.type !== 'radius'}
        >
          <View style={styles.settingInfo}>
            <MaterialIcons name={item.icon} size={24} color={item.iconColor || themeColors.primary} />
            <Text style={styles.settingText}>{item.label}</Text>
          </View>
          {item.type === 'switch' ? (
            <Switch
              value={themeValue}
              onValueChange={onThemeToggle}
              trackColor={{ false: '#767577', true: themeColors.primary }}
              thumbColor={themeValue ? '#fff' : '#f4f3f4'}
            />
          ) : item.type === 'radius' ? (
            <View style={styles.radiusControl}>
              <TouchableOpacity onPress={onDecrement} style={styles.radiusBtn}>
                <Text style={styles.radiusBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.radiusValue}>{radiusValue} km</Text>
              <TouchableOpacity onPress={onIncrement} style={styles.radiusBtn}>
                <Text style={styles.radiusBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MaterialIcons name="chevron-right" size={24} color={themeColors.textMuted} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}