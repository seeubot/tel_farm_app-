import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Linking,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import { produceAPI } from '../../utils/api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;
const APP_STORE_URL = 'https://play.google.com/store/apps/details?id=com.agriagent.app';

export default function ProductDetailScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  
  // Safe extraction of params (handles both produce object and productId)
  const initialProduce = route.params?.produce || null;
  const productId = route.params?.productId || initialProduce?._id || null;

  const [produce, setProduce] = useState(initialProduce);
  const [loading, setLoading] = useState(!initialProduce && !!productId);
  const [quantity, setQuantity] = useState(1);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Fetch produce details if navigated with productId
  useEffect(() => {
    if (!produce && productId) {
      fetchProduceDetails();
    } else if (produce) {
      const initialMin = produce?.minOrder || produce?.minimumOrder || 1;
      setQuantity(Number(initialMin));
    }
  }, [productId]);

  const fetchProduceDetails = async () => {
    setLoading(true);
    try {
      const res = await produceAPI.getById(productId);
      if (res && res.produce) {
        setProduce(res.produce);
        const initialMin = res.produce?.minOrder || res.produce?.minimumOrder || 1;
        setQuantity(Number(initialMin));
      }
    } catch (error) {
      console.error('Error fetching produce detail:', error);
      Alert.alert('Error', 'Unable to load produce details.');
    } finally {
      setLoading(false);
    }
  };

  const minQty = Number(produce?.minOrder || produce?.minimumOrder || 1);
  const maxQty = Number(produce?.quantity || 1000);

  const farmerName = produce?.farmerId?.profile?.name || produce?.farmerName || 'Farmer';
  const farmerPhone = produce?.farmerId?.profile?.phone || produce?.contactPhone;
  const isVerified = produce?.farmerId?.verification?.isVerified || false;
  const farmerRating = produce?.farmerId?.ratings?.average || 0;

  // --- ACCURATE PRICE CALCULATION LOGIC ---
  const pricePerKg = (() => {
    const rawPrice = Number(produce?.price) || 0;
    const pUnit = String(produce?.priceUnit || 'per quintal').toLowerCase();

    if (pUnit.includes('ton')) return rawPrice / 1000;
    if (pUnit.includes('quintal')) return rawPrice / 100;
    return rawPrice; // per kg
  })();

  const totalKgQuantity = (() => {
    const qUnit = String(produce?.unit || 'kg').toLowerCase();

    if (qUnit.includes('ton')) return quantity * 1000;
    if (qUnit.includes('quintal')) return quantity * 100;
    return quantity; // kg
  })();

  const totalAmount = pricePerKg * totalKgQuantity;

  // --- SHARE FUNCTIONALITY ---
  const handleShareProduce = async () => {
    if (!produce) return;
    try {
      const shareMessage = 
        `🌾 *${produce?.cropName || 'Produce'}* ${produce?.teluguName ? `(${produce.teluguName})` : ''}\n` +
        `💰 Price: ₹${produce?.price || 0} / ${produce?.priceUnit || 'quintal'}\n` +
        `📦 Available: ${produce?.quantity || 0} ${produce?.unit || 'quintal'}\n` +
        `👨‍🌾 Farmer: ${farmerName}\n\n` +
        `Check out this listing and more on AgriAgent:\n${APP_STORE_URL}`;

      await Share.share({
        message: shareMessage,
        title: `Check out ${produce?.cropName || 'Produce'} on AgriAgent`,
      });
    } catch (error) {
      console.error('Error sharing produce:', error);
    }
  };

  const handleContactFarmer = () => {
    if (farmerPhone) {
      Linking.openURL(`tel:${farmerPhone}`);
    } else {
      Alert.alert('Contact', 'Farmer phone number is not available.');
    }
  };

  const handleViewLocation = async () => {
    if (produce?.location?.lat && produce?.location?.lng) {
      const url = Platform.select({
        ios: `http://maps.apple.com/?ll=${produce.location.lat},${produce.location.lng}`,
        android: `http://maps.google.com/maps?q=${produce.location.lat},${produce.location.lng}`,
      });
      await Linking.openURL(url);
    } else {
      Alert.alert('Location', 'Farm location coordinates not available');
    }
  };

  const updateQuantity = (newQty) => {
    const clamped = Math.max(minQty, Math.min(maxQty, newQty));
    setQuantity(clamped);
  };

  const styles = getStyles(colors, isDarkTheme);

  if (loading || !produce) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading produce details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />

      {/* Header with Share Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Produce Details</Text>
        <TouchableOpacity onPress={handleShareProduce} style={styles.headerShareBtn} activeOpacity={0.7}>
          <MaterialIcons name="share" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Farmer Info Card */}
        <Card style={styles.card} elevation={0}>
          <Card.Content style={styles.farmerRow}>
            <View style={styles.avatarBg}>
              <MaterialIcons name="person" size={26} color={colors.primary} />
            </View>
            <View style={styles.farmerDetails}>
              <View style={styles.farmerNameLine}>
                <Text style={styles.farmerName}>{farmerName}</Text>
                {isVerified && (
                  <View style={styles.verifiedBadge}>
                    <MaterialIcons name="verified" size={12} color="#059669" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={15} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {farmerRating > 0 ? farmerRating.toFixed(1) : 'New Listing'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Crop Info Card */}
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cropTitle}>{produce?.cropName || 'Crop'}</Text>
                {produce?.teluguName ? <Text style={styles.teluguSubTitle}>{produce.teluguName}</Text> : null}
              </View>
              {produce?.organic && (
                <View style={styles.organicBadge}>
                  <MaterialIcons name="eco" size={14} color="#15803D" />
                  <Text style={styles.organicText}>Organic</Text>
                </View>
              )}
            </View>

            <View style={styles.tagGrid}>
              <View style={styles.tagItem}>
                <MaterialIcons name="grass" size={14} color={colors.textMuted} />
                <Text style={styles.tagItemText}>{produce?.variety || 'Standard Variety'}</Text>
              </View>
              <View style={styles.tagItem}>
                <MaterialIcons name="calendar-today" size={14} color={colors.textMuted} />
                <Text style={styles.tagItemText}>
                  {produce?.harvestDate ? new Date(produce.harvestDate).toLocaleDateString() : 'Recent Harvest'}
                </Text>
              </View>
            </View>

            <Text style={styles.descriptionText} numberOfLines={showFullDescription ? undefined : 3}>
              {produce?.description || 'Direct fresh crop harvest directly from local farmland.'}
            </Text>
            <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)} style={styles.readMoreContainer}>
              <Text style={[styles.readMoreText, { color: colors.primary }]}>
                {showFullDescription ? 'Show Less' : 'Read Full Description'}
              </Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Quantity & Price Calculator */}
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <Text style={styles.sectionHeader}>Quantity & Price Calculator</Text>

            <View style={styles.unitPriceContainer}>
              <Text style={styles.unitPriceLabel}>Listed Rate</Text>
              <Text style={styles.unitPriceValue}>
                ₹{produce?.price || 0} <Text style={styles.unitPriceSub}>/ {produce?.priceUnit || 'quintal'}</Text>
              </Text>
            </View>

            {/* Quantity Controls */}
            <View style={styles.quantityPickerBlock}>
              <View style={styles.quantityHeader}>
                <Text style={styles.pickerTitle}>Required Quantity ({produce?.unit || 'quintal'})</Text>
                <Text style={styles.stockText}>Available: {produce?.quantity || 0} {produce?.unit || 'quintal'}</Text>
              </View>

              <View style={styles.counterControlRow}>
                <TouchableOpacity 
                  style={[styles.counterBtn, quantity <= minQty && styles.counterBtnDisabled]} 
                  onPress={() => updateQuantity(quantity - 1)}
                  disabled={quantity <= minQty}
                >
                  <MaterialIcons name="remove" size={20} color={quantity <= minQty ? colors.textMuted : colors.primary} />
                </TouchableOpacity>

                <View style={styles.quantityDisplay}>
                  <Text style={styles.quantityDisplayText}>{quantity}</Text>
                  <Text style={styles.quantityDisplayUnit}>{produce?.unit || 'quintal'}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.counterBtn, quantity >= maxQty && styles.counterBtnDisabled]} 
                  onPress={() => updateQuantity(quantity + 1)}
                  disabled={quantity >= maxQty}
                >
                  <MaterialIcons name="add" size={20} color={quantity >= maxQty ? colors.textMuted : colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Preset Chips */}
              <View style={styles.presetChipsRow}>
                <TouchableOpacity style={styles.presetChip} onPress={() => updateQuantity(minQty)}>
                  <Text style={styles.presetChipText}>Min ({minQty})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => updateQuantity(quantity + 5)}>
                  <Text style={styles.presetChipText}>+5 {produce?.unit || ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => updateQuantity(quantity + 10)}>
                  <Text style={styles.presetChipText}>+10 {produce?.unit || ''}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetChip} onPress={() => updateQuantity(maxQty)}>
                  <Text style={styles.presetChipText}>Max ({maxQty})</Text>
                </TouchableOpacity>
              </View>

              {minQty > 1 && (
                <Text style={styles.minOrderDisclaimer}>
                  * Minimum order limit: {minQty} {produce?.unit || 'quintal'}
                </Text>
              )}
            </View>

            {/* Calculated Total Amount */}
            <View style={styles.totalCalcRow}>
              <Text style={styles.totalCalcLabel}>Estimated Total Amount</Text>
              <Text style={styles.totalCalcValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Location Display */}
        <TouchableOpacity style={styles.locationCard} onPress={handleViewLocation} activeOpacity={0.75}>
          <View style={styles.locationPinBg}>
            <MaterialIcons name="place" size={22} color={colors.primary} />
          </View>
          <View style={styles.locationTextGroup}>
            <Text style={styles.locationLabel}>Farm Location</Text>
            <Text style={styles.locationMainText} numberOfLines={2}>
              {produce?.location?.address || produce?.location?.village || produce?.location?.district || 'Location on request'}
            </Text>
          </View>
          <MaterialIcons name="near-me" size={18} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyFooter}>
        <View style={styles.stickyPriceGroup}>
          <Text style={styles.stickyPriceLabel}>Estimated Cost</Text>
          <Text style={styles.stickyPriceValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity style={styles.callActionButton} onPress={handleContactFarmer} activeOpacity={0.85}>
          <MaterialIcons name="call" size={18} color="#FFFFFF" />
          <Text style={styles.callActionText}>Contact Farmer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkTheme ? '#121212' : '#F8FAFC',
  },
  centerLoader: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  header: {
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
  backButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: isDarkTheme ? '#262626' : '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerShareBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  card: {
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    borderWidth: 1,
    borderColor: isDarkTheme ? '#2A2A2A' : '#EDF2F7',
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerDetails: {
    flex: 1,
  },
  farmerNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  farmerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cropTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  teluguSubTitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  organicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  organicText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  tagGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: isDarkTheme ? '#262626' : '#F1F5F9',
    borderRadius: 8,
  },
  tagItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  readMoreContainer: {
    marginTop: 6,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  unitPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkTheme ? '#2A2A2A' : '#E2E8F0',
  },
  unitPriceLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  unitPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  unitPriceSub: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  quantityPickerBlock: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: isDarkTheme ? '#2A2A2A' : '#E2E8F0',
  },
  quantityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  stockText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  counterControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkTheme ? '#262626' : '#F8FAFC',
    borderRadius: 12,
    padding: 6,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: isDarkTheme ? '#333' : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkTheme ? '#404040' : '#E2E8F0',
  },
  counterBtnDisabled: {
    opacity: 0.5,
  },
  quantityDisplay: {
    alignItems: 'center',
  },
  quantityDisplayText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  quantityDisplayUnit: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: isDarkTheme ? '#262626' : '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkTheme ? '#333' : '#E2E8F0',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  minOrderDisclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  totalCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  totalCalcLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totalCalcValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: isDarkTheme ? '#2A2A2A' : '#EDF2F7',
  },
  locationPinBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationTextGroup: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  locationMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  bottomSpacer: {
    height: 20,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    borderTopWidth: 1,
    borderTopColor: isDarkTheme ? '#2A2A2A' : '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stickyPriceGroup: {
    flexDirection: 'column',
  },
  stickyPriceLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stickyPriceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  callActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0288D1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  callActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});