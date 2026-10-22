import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, fontSize, colors, borderRadius, shadows, getGlobalStyles } from '../screens/FarmerDashboard/styles';

const cropOptions = [
  'Paddy', 'Cotton', 'Sugarcane', 'Chilli', 'Maize', 
  'Groundnut', 'Tobacco', 'Turmeric', 'Mango', 'Banana',
  'Red Gram', 'Black Gram', 'Vegetables'
];

export default function CropSearchBar({ 
  searchCrop, 
  onSearchChange, 
  selectedCrop, 
  onSelectCrop,
  isDarkTheme 
}) {
  const themeColors = isDarkTheme ? colors.dark : colors.light;

  const styles = {
    card: {
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
      backgroundColor: themeColors.surface,
      ...shadows.small,
    },
    label: {
      fontSize: fontSize.md,
      fontWeight: '500',
      color: themeColors.text,
      marginBottom: spacing.xs,
    },
    teluguLabel: {
      fontSize: fontSize.sm,
      color: themeColors.textMuted,
      marginBottom: spacing.sm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkTheme ? '#2C2C2C' : '#F5F5F5',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm,
      fontSize: fontSize.sm,
      color: themeColors.text,
    },
    chipsContainer: {
      flexDirection: 'row',
    },
    cropChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      backgroundColor: themeColors.primaryLight,
      marginRight: spacing.sm,
    },
    cropChipActive: {
      backgroundColor: themeColors.primary,
    },
    cropChipText: {
      fontSize: fontSize.xs,
      color: themeColors.textSecondary,
    },
    cropChipTextActive: {
      color: '#FFFFFF',
    },
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.label}>Search by Crop</Text>
        <Text style={styles.teluguLabel}>పంట ద్వారా శోధించండి</Text>
        
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={themeColors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop expertise..."
            placeholderTextColor={themeColors.textMuted}
            value={searchCrop}
            onChangeText={onSearchChange}
          />
          {searchCrop.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <MaterialIcons name="close" size={20} color={themeColors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.chipsContainer}
        >
          {cropOptions.map((crop) => (
            <TouchableOpacity
              key={crop}
              style={[
                styles.cropChip,
                selectedCrop === crop && styles.cropChipActive
              ]}
              onPress={() => {
                onSearchChange(crop);
                onSelectCrop(crop);
              }}
            >
              <Text style={[
                styles.cropChipText,
                selectedCrop === crop && styles.cropChipTextActive
              ]}>
                {crop}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Card.Content>
    </Card>
  );
}