import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../utils/theme';
import { produceAPI } from '../../utils/api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;

const CROP_OPTIONS = [
  'Paddy', 'Cotton', 'Sugarcane', 'Chilli', 'Maize', 
  'Groundnut', 'Tobacco', 'Turmeric', 'Mango', 'Banana',
  'Red Gram', 'Black Gram', 'Vegetables'
];

const PRICE_UNITS = [
  { id: 'per kg', label: '/ KG' },
  { id: 'per quintal', label: '/ Quintal' },
  { id: 'per ton', label: '/ Ton' },
];

const QUANTITY_UNITS = [
  { id: 'kg', label: 'KG' },
  { id: 'quintal', label: 'Quintal' },
  { id: 'ton', label: 'Ton' },
];

export default function FarmerListingScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [useAutoLocation, setUseAutoLocation] = useState(true);
  
  const [formData, setFormData] = useState({
    cropName: '',
    teluguName: '',
    variety: '',
    quantity: '',
    unit: 'kg',
    minOrder: '1',
    price: '',
    priceUnit: 'per quintal',
    organic: false,
    description: '',
    manualAddress: '',
    village: '',
    district: '',
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is needed to automatically detect your location.',
          [
            { text: 'Enter Manually', onPress: () => setUseAutoLocation(false) },
            { text: 'Try Again', onPress: () => getCurrentLocation() },
          ]
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });

      const addressArray = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (addressArray && addressArray.length > 0) {
        const address = addressArray[0];
        const formattedAddress = [
          address.name,
          address.street,
          address.city,
          address.subregion,
          address.district,
          address.region,
          address.postalCode,
        ]
          .filter(Boolean)
          .join(', ');

        setLocationAddress(formattedAddress);
        setFormData(prev => ({
          ...prev,
          village: address.city || address.subregion || address.district || '',
          district: address.district || address.region || '',
        }));
        setUseAutoLocation(true);
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Could not fetch location automatically. You can switch to manual entry.',
        [
          { text: 'Enter Manually', onPress: () => setUseAutoLocation(false) },
          { text: 'Retry', onPress: () => getCurrentLocation() },
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.cropName || !formData.quantity || !formData.price) {
      Alert.alert('Missing Fields', 'Please complete all required fields (*)');
      return;
    }

    if (useAutoLocation && !currentLocation) {
      Alert.alert('Location Required', 'Detecting location or switch to manual address.');
      return;
    }

    if (!useAutoLocation && !formData.manualAddress) {
      Alert.alert('Address Required', 'Please enter your address.');
      return;
    }

    setLoading(true);
    try {
      const produceData = {
        cropName: formData.cropName,
        teluguName: formData.teluguName || undefined,
        variety: formData.variety || undefined,
        quantity: parseFloat(formData.quantity) || 0,
        unit: formData.unit,
        minOrder: parseFloat(formData.minOrder) || 1,
        price: parseFloat(formData.price) || 0,
        priceUnit: formData.priceUnit,
        organic: formData.organic,
        description: formData.description || undefined,
        location: useAutoLocation && currentLocation
          ? {
              lat: currentLocation.lat,
              lng: currentLocation.lng,
              address: locationAddress,
              village: formData.village || undefined,
              district: formData.district || undefined,
            }
          : {
              address: formData.manualAddress,
              village: formData.village || undefined,
              district: formData.district || undefined,
            },
        isAvailable: true,
      };

      await produceAPI.create(produceData);
      
      Alert.alert(
        'Success! 🎉',
        'Your produce listing is now live for buyers.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit listing.');
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.iconButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="arrow-back-ios-new" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List Produce</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section: Crop Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <MaterialIcons name="grass" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Crop Information</Text>
          </View>

          {/* Crop Selector */}
          <Text style={styles.inputLabel}>Select Crop <Text style={styles.required}>*</Text></Text>
          <View style={styles.chipGrid}>
            {CROP_OPTIONS.map(crop => {
              const selected = formData.cropName === crop;
              return (
                <TouchableOpacity
                  key={crop}
                  style={[styles.cropChip, selected && styles.cropChipActive]}
                  onPress={() => setFormData({ ...formData, cropName: crop })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cropText, selected && styles.cropTextActive]}>
                    {crop}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Telugu Name */}
          <Text style={styles.inputLabel}>Telugu Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., వరి, ప్రత్తి"
            placeholderTextColor={colors.textMuted}
            value={formData.teluguName}
            onChangeText={(text) => setFormData({ ...formData, teluguName: text })}
          />

          {/* Variety */}
          <Text style={styles.inputLabel}>Variety</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sona Masuri, BT Cotton"
            placeholderTextColor={colors.textMuted}
            value={formData.variety}
            onChangeText={(text) => setFormData({ ...formData, variety: text })}
          />

          {/* Quantity Input Block */}
          <Text style={styles.inputLabel}>Total Quantity Available <Text style={styles.required}>*</Text></Text>
          <View style={styles.compositeInputRow}>
            <TextInput
              style={styles.compositeInputText}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitSelector}>
              {QUANTITY_UNITS.map(unit => {
                const selected = formData.unit === unit.id;
                return (
                  <TouchableOpacity
                    key={unit.id}
                    style={[styles.unitSegment, selected && styles.unitSegmentActive]}
                    onPress={() => setFormData({ ...formData, unit: unit.id })}
                  >
                    <Text style={[styles.unitSegmentText, selected && styles.unitSegmentTextActive]}>
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Minimum Order Limit Input */}
          <Text style={styles.inputLabel}>Minimum Order Limit ({formData.unit.toUpperCase()})</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1"
            placeholderTextColor={colors.textMuted}
            value={formData.minOrder}
            onChangeText={(text) => setFormData({ ...formData, minOrder: text })}
            keyboardType="decimal-pad"
          />

          {/* Price Input Block */}
          <Text style={styles.inputLabel}>Price (₹) <Text style={styles.required}>*</Text></Text>
          <View style={styles.compositeInputRow}>
            <TextInput
              style={styles.compositeInputText}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitSelector}>
              {PRICE_UNITS.map(unit => {
                const selected = formData.priceUnit === unit.id;
                return (
                  <TouchableOpacity
                    key={unit.id}
                    style={[styles.unitSegment, selected && styles.unitSegmentActive]}
                    onPress={() => setFormData({ ...formData, priceUnit: unit.id })}
                  >
                    <Text style={[styles.unitSegmentText, selected && styles.unitSegmentTextActive]}>
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Organic Switch Switch */}
          <TouchableOpacity 
            style={styles.organicToggleRow}
            onPress={() => setFormData({ ...formData, organic: !formData.organic })}
            activeOpacity={0.8}
          >
            <View style={styles.organicRowLeft}>
              <MaterialIcons name="eco" size={20} color={formData.organic ? colors.primary : colors.textMuted} />
              <View style={styles.organicTextContainer}>
                <Text style={styles.organicTitle}>Certified Organic</Text>
                <Text style={styles.organicSubtitle}>Check if this yield is chemical-free</Text>
              </View>
            </View>
            <View style={[styles.switchTrack, formData.organic && styles.switchTrackActive]}>
              <View style={[styles.switchThumb, formData.organic && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          {/* Description */}
          <Text style={styles.inputLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Mention harvest date, quality metrics, or batch specifics..."
            placeholderTextColor={colors.textMuted}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Section: Location */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <MaterialIcons name="place" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Farm Location</Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, useAutoLocation && styles.segmentBtnActive]}
              onPress={() => setUseAutoLocation(true)}
            >
              <MaterialIcons name="gps-fixed" size={15} color={useAutoLocation ? colors.primary : colors.textMuted} />
              <Text style={[styles.segmentBtnText, useAutoLocation && styles.segmentBtnTextActive]}>GPS Auto Detect</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.segmentBtn, !useAutoLocation && styles.segmentBtnActive]}
              onPress={() => setUseAutoLocation(false)}
            >
              <MaterialIcons name="edit" size={15} color={!useAutoLocation ? colors.primary : colors.textMuted} />
              <Text style={[styles.segmentBtnText, !useAutoLocation && styles.segmentBtnTextActive]}>Manual</Text>
            </TouchableOpacity>
          </View>

          {useAutoLocation ? (
            <TouchableOpacity
              style={styles.locationContainer}
              onPress={getCurrentLocation}
              disabled={locationLoading}
              activeOpacity={0.8}
            >
              {locationLoading ? (
                <View style={styles.locationStateCentered}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.locationStateText}>Acquiring GPS coordinates...</Text>
                </View>
              ) : currentLocation ? (
                <View style={styles.locationDetectedContent}>
                  <View style={styles.locationHeaderRow}>
                    <View style={styles.statusBadge}>
                      <MaterialIcons name="check-circle" size={16} color={colors.success || '#10B981'} />
                      <Text style={styles.statusBadgeText}>Location Locked</Text>
                    </View>
                    <MaterialIcons name="refresh" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.addressText} numberOfLines={2}>
                    {locationAddress}
                  </Text>
                </View>
              ) : (
                <View style={styles.locationStateCentered}>
                  <MaterialIcons name="my-location" size={28} color={colors.primary} />
                  <Text style={styles.locationPromptText}>Tap to detect position</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.manualFieldsBlock}>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                placeholder="Full Street / Farm Address"
                placeholderTextColor={colors.textMuted}
                value={formData.manualAddress}
                onChangeText={(text) => setFormData({ ...formData, manualAddress: text })}
                multiline
                numberOfLines={2}
              />
              <View style={styles.dualInputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="Village / Town"
                  placeholderTextColor={colors.textMuted}
                  value={formData.village}
                  onChangeText={(text) => setFormData({ ...formData, village: text })}
                />
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  placeholder="District"
                  placeholderTextColor={colors.textMuted}
                  value={formData.district}
                  onChangeText={(text) => setFormData({ ...formData, district: text })}
                />
              </View>
            </View>
          )}
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitButtonText}>Publish Produce Listing</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkTheme ? '#121212' : '#F8FAFC',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    borderBottomWidth: 1,
    borderBottomColor: isDarkTheme ? '#2A2A2A' : '#E2E8F0',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkTheme ? '#2A2A2A' : '#EDF2F7',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary || (isDarkTheme ? '#A0AEC0' : '#4A5568'),
    marginBottom: 6,
    marginTop: 10,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkTheme ? '#333' : '#E2E8F0',
    backgroundColor: isDarkTheme ? '#262626' : '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
  },
  textAreaSmall: {
    minHeight: 60,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  cropChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkTheme ? '#333' : '#E2E8F0',
    backgroundColor: isDarkTheme ? '#262626' : '#F8FAFC',
  },
  cropChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cropText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  cropTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  compositeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkTheme ? '#333' : '#E2E8F0',
    backgroundColor: isDarkTheme ? '#262626' : '#F8FAFC',
    borderRadius: 10,
    padding: 4,
  },
  compositeInputText: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: isDarkTheme ? '#1A1A1A' : '#EDF2F7',
    borderRadius: 8,
    padding: 2,
  },
  unitSegment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitSegmentActive: {
    backgroundColor: colors.primary,
  },
  unitSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted || '#718096',
  },
  unitSegmentTextActive: {
    color: '#FFFFFF',
  },
  organicToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: isDarkTheme ? '#262626' : '#F8FAFC',
    borderRadius: 10,
  },
  organicRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  organicTextContainer: {
    flexDirection: 'column',
  },
  organicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  organicSubtitle: {
    fontSize: 11,
    color: colors.textMuted || '#718096',
  },
  switchTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: isDarkTheme ? '#404040' : '#CBD5E1',
    padding: 2,
  },
  switchTrackActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    transform: [{ translateX: 18 }],
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: isDarkTheme ? '#262626' : '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted || '#64748B',
  },
  segmentBtnTextActive: {
    color: colors.primary,
  },
  locationContainer: {
    borderWidth: 1,
    borderColor: isDarkTheme ? '#333' : '#E2E8F0',
    backgroundColor: isDarkTheme ? '#262626' : '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    minHeight: 85,
    justifyContent: 'center',
  },
  locationStateCentered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  locationStateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  locationPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  locationDetectedContent: {
    gap: 6,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success || '#10B981',
  },
  addressText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  manualFieldsBlock: {
    gap: 8,
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexInput: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});