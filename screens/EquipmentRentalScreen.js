import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  Linking,
  AppState,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';
import { equipmentAPI, adsAPI, API_BASE_URL } from '../utils/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../utils/queryKeys';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
  const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
  return urlPattern.test(url) ? url : null;
};

const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http') || url.startsWith('https') || 
         url.startsWith('file://') || url.startsWith('data:');
};

const getImageSource = (img) => {
  if (!img) return null;
  if (typeof img === 'string') {
    if (isValidImageUrl(img)) return { uri: img };
    if (img.startsWith('/') || img.includes('ImagePicker')) return { uri: 'file://' + img };
    return { uri: img };
  }
  return img;
};

const InternalEquipmentCard = ({ equipment, onPress }) => {
  const { colors, isDarkTheme } = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const primaryImage = useMemo(() => {
    if (equipment.images && equipment.images.length > 0) {
      return equipment.images[0];
    }
    return equipment.image || equipment.imageUrl || null;
  }, [equipment]);

  const imageSource = useMemo(() => getImageSource(primaryImage), [primaryImage]);

  const handleLoadStart = () => setImageLoading(true);
  const handleLoadEnd = () => setImageLoading(false);
  const handleError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <TouchableOpacity
      style={[
        cardStyles.cardContainer,
        {
          backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
          borderColor: isDarkTheme ? colors.border + '25' : '#E2E8F0',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={cardStyles.imageContainer}>
        {imageSource && !imageError ? (
          <>
            <Image
              source={imageSource}
              style={cardStyles.cardImage}
              resizeMode="cover"
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
            />
            {imageLoading && (
              <View style={[cardStyles.imageLoadingOverlay, { backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </>
        ) : (
          <View style={[cardStyles.imagePlaceholder, { backgroundColor: isDarkTheme ? colors.border + '20' : '#F1F5F9' }]}>
            <MaterialCommunityIcons
              name={imageError ? 'image-broken-variant' : 'tractor'}
              size={36}
              color={colors.textMuted}
            />
            <Text style={[cardStyles.placeholderText, { color: colors.textMuted }]}>
              {imageError ? 'Image unavailable' : 'No preview'}
            </Text>
          </View>
        )}

        {equipment.category && (
          <View style={[cardStyles.categoryBadge, { backgroundColor: colors.primary }]}>
            <Text style={cardStyles.categoryBadgeText}>{equipment.category.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={cardStyles.detailsContainer}>
        <View style={cardStyles.headerRow}>
          <Text style={[cardStyles.title, { color: colors.text }]} numberOfLines={1}>
            {equipment.name}
          </Text>
          {equipment.ownerId?.verification?.isVerified && (
            <MaterialIcons name="verified" size={16} color="#059669" style={{ marginLeft: 4 }} />
          )}
        </View>

        {equipment.teluguName && (
          <Text style={[cardStyles.teluguSub, { color: colors.primary }]} numberOfLines={1}>
            {equipment.teluguName}
          </Text>
        )}

        <View style={cardStyles.locationRow}>
          <MaterialIcons name="location-on" size={13} color={colors.textMuted} />
          <Text style={[cardStyles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>
            {equipment.location?.address || equipment.location?.village || 'Location specified on request'}
          </Text>
        </View>

        <View style={cardStyles.footerRow}>
          <View style={cardStyles.priceContainer}>
            <Text style={[cardStyles.priceValue, { color: colors.text }]}>
              â‚¹{equipment.pricing?.perDay?.toLocaleString() || 'N/A'}
            </Text>
            <Text style={[cardStyles.priceUnit, { color: colors.textMuted }]}> / day</Text>
          </View>

          <View style={[cardStyles.viewBtn, { backgroundColor: colors.primary + '12' }]}>
            <Text style={[cardStyles.viewBtnText, { color: colors.primary }]}>Details</Text>
            <MaterialIcons name="arrow-forward" size={12} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function EquipmentRentalScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  // ---- UI-only state ----
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Banner Ads UI state
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const [adImageLoading, setAdImageLoading] = useState(false);
  const [adImageError, setAdImageError] = useState(false);
  const standardSlideAnim = useRef(new Animated.Value(0)).current;
  const standardScaleAnim = useRef(new Animated.Value(1)).current;
  const standardTimer = useRef(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);
  const queryClient = useQueryClient();
  // ==================== QUERIES ====================
  const equipmentQuery = useQuery({
    queryKey: qk.equipment({}),
    queryFn: () => equipmentAPI.getAll(),
    staleTime: 60000,
  });
  const equipment = equipmentQuery.data?.equipment || [];
  const loading = equipmentQuery.isLoading;
  const adsQuery = useQuery({
    queryKey: ['ads', 'active', 'home', 3],
    queryFn: () => adsAPI.getActive('home', 3),
    staleTime: 300000,
  });
  const standardAds = adsQuery.data?.ads || [];

  const categories = [
    { id: 'all', labelKey: 'catAll', iconName: 'grid-view', iconType: 'MaterialIcons' },
    { id: 'Tractor', labelKey: 'catTractors', iconName: 'agriculture', iconType: 'MaterialIcons' },
    { id: 'Harvester', labelKey: 'catHarvesters', iconName: 'shuttle-van', iconType: 'FontAwesome5' },
    { id: 'Irrigation Pump', labelKey: 'catPumps', iconName: 'water', iconType: 'Ionicons' },
    { id: 'Power Tiller', labelKey: 'catTillers', iconName: 'hammer', iconType: 'Ionicons' },
    { id: 'Sprayer', labelKey: 'catSprayers', iconName: 'color-filter', iconType: 'Ionicons' },
  ];

  const animateStandard = useCallback(() => {
    if (standardAds.length < 2) return;
    Animated.sequence([
      Animated.spring(standardScaleAnim, { toValue: 0.96, tension: 150, friction: 9, useNativeDriver: true }),
      Animated.timing(standardSlideAnim, { toValue: -15, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStandardIndex(p => (p + 1) % standardAds.length);
      setAdImageLoading(true);
      setAdImageError(false);
      standardSlideAnim.setValue(15);
      Animated.parallel([
        Animated.spring(standardScaleAnim, { toValue: 1, tension: 150, friction: 9, useNativeDriver: true }),
        Animated.spring(standardSlideAnim, { toValue: 0, tension: 150, friction: 11, useNativeDriver: true }),
      ]).start();
    });
  }, [standardAds.length, standardScaleAnim, standardSlideAnim]);

  const startAdTimers = useCallback(() => {
    clearInterval(standardTimer.current);
    if (standardAds.length > 1) standardTimer.current = setInterval(animateStandard, 5000);
  }, [standardAds.length, animateStandard]);

  useEffect(() => {
    startAdTimers();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') startAdTimers();
      else clearInterval(standardTimer.current);
    });
    return () => {
      clearInterval(standardTimer.current);
      sub?.remove();
    };
  }, [startAdTimers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.equipment({}) }),
      queryClient.invalidateQueries({ queryKey: ['ads', 'active', 'home', 3] }),
    ]);
    setRefreshing(false);
  };

  const handleAdClick = async (ad) => {
    if (!ad?._id) return;
    adsAPI.trackClick(ad._id).catch(() => {});
    if (ad.media?.redirectUrl) {
      const url = validateAndFormatUrl(ad.media.redirectUrl);
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) Linking.openURL(url);
        else Alert.alert(t('error') || 'Error', 'Cannot open link');
      }
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.teluguName || '').includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const currentStandard = standardAds[currentStandardIndex];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading machinery rentals...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back-ios-new" size={16} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('rentEquipment') || 'Machinery Rental'}</Text>
        <TouchableOpacity 
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}
          onPress={() => navigation.navigate('PostRental')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* Search input field */}
        <View style={[dynamicStyles.searchContainer, styles.searchContainerShared]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchEquipmentPlaceholder') || 'Search tractors, tillers, pumps...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories scroll roll */}
        <View style={styles.carouselWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
            {categories.map(cat => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    dynamicStyles.categoryChip,
                    styles.categoryChipShared,
                    isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.chipInner}>
                    {cat.iconType === 'MaterialIcons' && (
                      <MaterialIcons name={cat.iconName} size={15} color={isActive ? '#FFFFFF' : colors.primary} style={styles.chipIcon} />
                    )}
                    {cat.iconType === 'Ionicons' && (
                      <Ionicons name={cat.iconName} size={15} color={isActive ? '#FFFFFF' : colors.primary} style={styles.chipIcon} />
                    )}
                    {cat.iconType === 'FontAwesome5' && (
                      <FontAwesome5 name={cat.iconName} size={13} color={isActive ? '#FFFFFF' : colors.primary} style={styles.chipIcon} />
                    )}
                    <Text style={[
                      styles.categoryText,
                      { color: isActive ? '#FFFFFF' : colors.textSecondary },
                    ]}>
                      {t(cat.labelKey) || cat.id}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Results Metadata Header */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
            {filteredEquipment.length} {t('itemsFound') || 'machinery units found'}
          </Text>
          <View style={[styles.resultsLine, { backgroundColor: colors.border + '20' }]} />
        </View>

        {/* Ad Banner with loading and error states */}
        {currentStandard && (
          <Animated.View style={{ transform: [{ scale: standardScaleAnim }, { translateX: standardSlideAnim }], marginBottom: 18 }}>
            <TouchableOpacity
              style={[dynamicStyles.stdAd, styles.stdAdShared]}
              onPress={() => handleAdClick(currentStandard)}
              activeOpacity={0.9}
            >
              <View style={styles.stdImgContainer}>
                {isValidImageUrl(currentStandard.media?.imageUrl) && !adImageError ? (
                  <>
                    <Image
                      source={{ uri: currentStandard.media.imageUrl }}
                      style={styles.stdImg}
                      resizeMode="cover"
                      onLoadStart={() => setAdImageLoading(true)}
                      onLoadEnd={() => setAdImageLoading(false)}
                      onError={() => {
                        setAdImageLoading(false);
                        setAdImageError(true);
                      }}
                    />
                    {adImageLoading && (
                      <View style={styles.adLoadingOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </>
                ) : (
                  <LinearGradient colors={[colors.primary, colors.primary + 'cc']} style={styles.stdImgFallback}>
                    <Ionicons name="megaphone-outline" size={18} color="rgba(255,255,255,0.9)" />
                  </LinearGradient>
                )}
              </View>

              <View style={styles.stdContent}>
                <Text style={[styles.stdTitle, { color: colors.text }]} numberOfLines={1}>
                  {currentStandard.title || 'Equipment Special'}
                </Text>
                <Text style={[styles.stdSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {currentStandard.description || 'Tap to check rental availability listings'}
                </Text>
              </View>

              <View style={[styles.adBadgeSmall, { backgroundColor: isDarkTheme ? colors.border + '25' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.adBadgeSmallText, { color: colors.textSecondary }]}>AD</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Equipment listing card render */}
        {filteredEquipment.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
              <MaterialIcons name="search-off" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              {t('noEquipmentFound') || 'No Machinery Matches'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Try updating your filters or list your own machinery for local farmers.
            </Text>
            <TouchableOpacity 
              style={[styles.postButtonEmpty, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('PostRental')}
              activeOpacity={0.85}
            >
              <Text style={styles.postButtonEmptyText}>{t('postEquipmentForRent') || 'List Your Equipment'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEquipment.map(item => (
            <InternalEquipmentCard
              key={item._id}
              equipment={item}
              onPress={() => navigation.navigate('EquipmentDetail', { equipment: item })}
            />
          ))
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  headerIconBtn: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '25' : '#EAF0F6',
  },
  searchContainer: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#E2E8F0',
  },
  categoryChip: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#EAF0F6',
  },
  stdAd: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '25' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#475569',
    shadowOpacity: isDarkTheme ? 0.3 : 0.08,
  }
});

const cardStyles = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  teluguSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 2,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: STATUS_BAR_HEIGHT + 12, 
    paddingBottom: 14 
  },
  headerIconBtnShared: { 
    width: 42, 
    height: 42, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 3, 
    elevation: 2 
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  loadingText: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  
  searchContainerShared: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    paddingHorizontal: 14, 
    height: 48, 
    marginBottom: 18, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.01, 
    shadowRadius: 3, 
    elevation: 1 
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, padding: 0, fontWeight: '500' },
  
  carouselWrapper: { marginBottom: 18 },
  categoriesContainer: { paddingVertical: 4, gap: 8, paddingLeft: 2 },
  categoryChipShared: { 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 14, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 3, 
    elevation: 1 
  },
  chipInner: { flexDirection: 'row', alignItems: 'center' },
  chipIcon: { marginRight: 6 },
  categoryText: { fontSize: 13, fontWeight: '700' },
  
  resultsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  resultsCount: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  resultsLine: { flex: 1, height: 1 },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 54, paddingHorizontal: 24 },
  emptyIconCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  postButtonEmpty: { marginTop: 22, paddingHorizontal: 26, paddingVertical: 13, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  postButtonEmptyText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bottomSpace: { height: 32 },

  stdAdShared: { 
    borderRadius: 20, 
    borderWidth: 1, 
    overflow: 'hidden', 
    flexDirection: 'row', 
    alignItems: 'center', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowRadius: 10, 
    elevation: 2 
  },
  stdImgContainer: { width: 80, height: 70, position: 'relative' },
  stdImg: { width: 80, height: 70 },
  stdImgFallback: { width: 80, height: 70, items: 'center', justifyContent: 'center' },
  adLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  stdContent: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  stdTitle: { fontSize: 13, fontWeight: '750', marginBottom: 2 },
  stdSub: { fontSize: 11, fontWeight: '500' },
  adBadgeSmall: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, marginRight: 14 },
  adBadgeSmallText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 }
});
