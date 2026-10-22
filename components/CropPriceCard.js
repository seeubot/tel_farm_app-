import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { API_BASE_URL } from '../utils/api';

const COMMODITIES = [
  { key: 'Paddy', icon: 'rice', color: '#10B981' },
  { key: 'Cotton', icon: 'cotton', color: '#F59E0B' },
  { key: 'Maize', icon: 'corn', color: '#EF4444' },
  { key: 'Turmeric', icon: 'spice', color: '#8B5CF6' },
  { key: 'Chilli', icon: 'chili-pepper', color: '#DC2626' },
];

export default function CropPriceCard({ locationName = 'TELANGANA' }) {
  const { colors } = useTheme();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('Paddy');
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchPrices = async (commodity) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/crop-prices/nearby?commodity=${encodeURIComponent(commodity)}&lat=17.3850&lng=78.4867`
      );
      const data = await response.json();
      if (data.success) {
        setPrices(data.prices);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      } else {
        setError('No data available');
      }
    } catch (err) {
      setError('Failed to fetch prices');
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices(selectedCrop);
  }, [selectedCrop]);

  const getPriceColor = (price) => {
    const numPrice = parseInt(price);
    if (numPrice > 2000) return '#10B981';
    if (numPrice > 1000) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="chart-line" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mandi Prices</Text>
        </View>
        <Text style={[styles.locationText, { color: colors.textSecondary }]}>{locationName}</Text>
      </View>

      {/* Commodity Selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropSelector}>
        {COMMODITIES.map((crop) => (
          <TouchableOpacity
            key={crop.key}
            style={[
              styles.cropChip,
              { borderColor: colors.border },
              selectedCrop === crop.key && { backgroundColor: crop.color + '20', borderColor: crop.color },
            ]}
            onPress={() => setSelectedCrop(crop.key)}
          >
            <MaterialCommunityIcons
              name={crop.icon}
              size={16}
              color={selectedCrop === crop.key ? crop.color : colors.textSecondary}
            />
            <Text
              style={[
                styles.cropChipText,
                { color: colors.textSecondary },
                selectedCrop === crop.key && { color: crop.color, fontWeight: '700' },
              ]}
            >
              {crop.key}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Prices */}
      {loading ? (
        <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="weather-cloudy-alert" size={28} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <Text style={[styles.errorHint, { color: colors.textMuted }]}>
            Market data updates daily at 5 PM
          </Text>
        </View>
      ) : prices.length === 0 ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="calendar-remove" size={28} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            No prices available for today
          </Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim }}>
          {prices.slice(0, 3).map((price, index) => (
            <View
              key={index}
              style={[styles.priceRow, index < prices.slice(0, 3).length - 1 && styles.priceRowBorder, { borderColor: colors.border }]}
            >
              <View style={styles.priceLeft}>
                <Text style={[styles.marketName, { color: colors.text }]} numberOfLines={1}>
                  {price.market}, {price.district}
                </Text>
                <Text style={[styles.varietyText, { color: colors.textMuted }]}>
                  {price.variety || 'Common'} | {price.distance || 'Nearby'}
                </Text>
              </View>
              <View style={styles.priceRight}>
                <Text style={[styles.modalPrice, { color: colors.text }]}>
                  Rs.{parseInt(price.modalPrice).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/quintal</Text>
                <View style={styles.priceRange}>
                  <Text style={[styles.rangeText, { color: '#EF4444' }]}>
                    Min: Rs.{parseInt(price.minPrice).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.rangeText, { color: '#10B981' }]}>
                    Max: Rs.{parseInt(price.maxPrice).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Footer */}
      <TouchableOpacity style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.primary }]}>View all market prices</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  locationText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cropSelector: {
    marginBottom: 14,
  },
  cropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  cropChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  priceRowBorder: {
    borderBottomWidth: 1,
  },
  priceLeft: {
    flex: 1,
    marginRight: 12,
  },
  marketName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  varietyText: {
    fontSize: 10,
    fontWeight: '500',
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceUnit: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  priceRange: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorHint: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
  },
});