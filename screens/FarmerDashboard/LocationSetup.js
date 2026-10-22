import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { 
  ArrowLeft, 
  Map, 
  Compass, 
  Locate 
} from 'lucide-react-native';

export default function LocationSetup({
  selectedLocation,
  selectedRadius,
  onOpenMap,
  onDecrementRadius,
  onIncrementRadius,
  onRadiusChange,
  onFindLabourers,
  isDarkTheme,
  onBack
}) {
  
  // Memoize theme definitions to block unnecessary component reallocations
  const themeColors = useMemo(() => (
    isDarkTheme ? {
      background: '#0F172A',
      surface: '#1E293B',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      border: '#334155',
      primary: '#10B981',
      primaryLight: 'rgba(16, 185, 129, 0.1)',
    } : {
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      border: '#E2E8F0',
      primary: '#059669',
      primaryLight: '#E6F4EA',
    }
  ), [isDarkTheme]);

  // Generate compiled style rules reactively based on active theme matrix
  const styles = useMemo(() => getCompiledStyles(themeColors), [themeColors]);

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'} 
        translucent 
        backgroundColor="transparent" 
      />
      
      {/* Top Navigation Bar Component */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={22} color={themeColors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>AgriAgent</Text>
          <Text style={styles.subtitle}>Farmer Dashboard</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={styles.locationCard} mode="contained">
          <Card.Content style={styles.cardInnerPadding}>
            
            {/* Header Text Grouping */}
            <View style={styles.headingGroup}>
              <Text style={styles.label}>Pin Your Farm Location</Text>
              <Text style={styles.teluguLabel}>
                మ్యాప్ లో మీ పొలం ఉనికిని పిన్ చేయండి
              </Text>
            </View>

            {/* Interactive Map Button Trigger */}
            <TouchableOpacity 
              style={styles.mapButton} 
              onPress={onOpenMap}
              activeOpacity={0.8}
            >
              <Map size={18} color={themeColors.primary} strokeWidth={2.5} />
              <Text style={styles.mapButtonText}>Select Location</Text>
            </TouchableOpacity>

            {/* Conditionally Rendered Farm Location Badge */}
            {selectedLocation && (
              <View style={styles.selectedLocationBox}>
                <View style={styles.indicatorDot} />
                <View style={styles.locationDetails}>
                  <Text style={styles.selectedLocationText}>Farm location selected</Text>
                  <Text style={styles.coordsText}>
                    {selectedLocation.lat.toFixed(6)}°, {selectedLocation.lng.toFixed(6)}°
                  </Text>
                </View>
                <Locate size={16} color={themeColors.primary} strokeWidth={2} />
              </View>
            )}

            {/* Distance Parameters Matrix Adjuster Row */}
            {selectedLocation && (
              <View style={styles.radiusSection}>
                <View style={styles.radiusHeader}>
                  <View style={styles.radiusTitleBlock}>
                    <Compass size={16} color={themeColors.textSecondary} strokeWidth={2.5} />
                    <Text style={styles.radiusLabel}>Search Radius</Text>
                  </View>
                  <Text style={styles.radiusValue}>{selectedRadius} km</Text>
                </View>
                
                <View style={styles.radiusControls}>
                  <TouchableOpacity 
                    style={styles.radiusButton} 
                    onPress={onDecrementRadius}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.radiusButtonText}>-5 km</Text>
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.radiusInput}
                    value={selectedRadius.toString()}
                    onChangeText={(text) => onRadiusChange(text.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholderTextColor={themeColors.textMuted}
                  />
                  
                  <TouchableOpacity 
                    style={styles.radiusButton} 
                    onPress={onIncrementRadius}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.radiusButtonText}>+5 km</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.radiusHint}>
                  Labourers within {selectedRadius} km will be shown
                </Text>
              </View>
            )}

            {/* Core Action Call to Action Dispatcher */}
            <Button
              mode="contained"
              onPress={onFindLabourers}
              style={styles.submitButton}
              buttonColor={themeColors.primary}
              disabled={!selectedLocation}
              textColor="#FFFFFF"
              labelStyle={styles.submitButtonLabel}
              elevation={1}
            >
              Find Nearby Labourers
            </Button>
          </Card.Content>
        </Card>

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
}

// Global Static Sheet Compiler Factory
const getCompiledStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 6,
    marginRight: 4,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  locationCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardInnerPadding: {
    padding: 14,
  },
  headingGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  teluguLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    marginBottom: 14,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  selectedLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    gap: 10,
    backgroundColor: colors.primaryLight,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  locationDetails: {
    flex: 1,
  },
  selectedLocationText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  coordsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  radiusSection: {
    marginTop: 2,
    marginBottom: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  radiusTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  radiusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  radiusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  radiusButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radiusButtonText: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.primary,
  },
  radiusInput: {
    width: 60,
    height: 38,
    textAlign: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    padding: 0,
  },
  radiusHint: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.textMuted,
  },
  submitButton: {
    borderRadius: 10,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  submitButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  footerSpace: {
    height: 12,
  },
});