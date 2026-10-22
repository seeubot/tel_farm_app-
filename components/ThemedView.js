import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../utils/theme';

export function ThemedView({ style, children, ...props }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.background }, style]} {...props}>
      {children}
    </View>
  );
}

export function ThemedScrollView({ style, children, ...props }) {
  const { colors } = useTheme();
  return (
    <ScrollView style={[{ backgroundColor: colors.background }, style]} {...props}>
      {children}
    </ScrollView>
  );
}

export function ThemedText({ style, children, ...props }) {
  const { colors } = useTheme();
  return (
    <Text style={[{ color: colors.text }, style]} {...props}>
      {children}
    </Text>
  );
}

export function ThemedCard({ style, children, ...props }) {
  const { colors } = useTheme();
  return (
    <View 
      style={[
        { 
          backgroundColor: colors.cardBg, 
          borderRadius: 16,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }, 
        style
      ]} 
      {...props}
    >
      {children}
    </View>
  );
}

export function ThemedInput({ style, ...props }) {
  const { colors } = useTheme();
  return (
    <TextInput
      style={[
        {
          backgroundColor: colors.inputBg,
          color: colors.text,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 12,
          fontSize: 14,
        },
        style,
      ]}
      placeholderTextColor={colors.textMuted}
      {...props}
    />
  );
}

export function ThemedButton({ style, textStyle, children, onPress, disabled, ...props }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        {
          backgroundColor: disabled ? colors.textMuted : colors.primary,
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 12,
          alignItems: 'center',
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Text style={[{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}