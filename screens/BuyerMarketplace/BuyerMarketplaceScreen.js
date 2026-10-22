import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Easing,
  Linking,
  AppState,
  Alert,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import { useLanguage } from '../../utils/i18n';
import { produceAPI, API_BASE_URL } from '../../utils/api';
import ProduceCard from '../../components/ProduceCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const CROP_CATEGORIES = [
  { id: 'all', labelKey: 'allCrops' },
  { id: 'Paddy', labelKey: 'cropPaddy' },
  { id: 'Cotton', labelKey: 'cropCotton' },
  { id: 'Chilli', labelKey: 'cropChilli' },
  { id: 'Maize', labelKey: 'cropMaize' },
  { id: 'Groundnut', labelKey: 'cropGroundnut' },
  { id: 'Turmeric', labelKey: 'cropTurmeric' },
  { id: 'Mango', labelKey: 'cropMango' },
];

const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
  const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
  return urlPattern.test(url) ? url : null;
};

export default function BuyerMarketplaceScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  const [produce, setProduce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Embedded Ad Banner Engine State Setup
  const [standardAds, setStandardAds] = useState([]);
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const standardSlideAnim = useRef(new Animated.Value(0)).current;
  const standardScaleAnim = useRef(new Animated.Value(1)).current;
  const standardTimer = useRef(null);

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);

  // Auto Standard Ad Rotator Loop
  const animateStandard = useCallback(() => {
    if (standardAds.length < 2) return;
    Animated.sequence([
      Animated.spring(standardScaleAnim, { toValue: 0.97, tension: 140, friction: 9, useNativeDriver: true }),
      Animated.timing(standardSlideAnim, { toValue: -20, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStandardIndex(p => (p + 1) % standardAds.length);
      standardSlideAnim.setValue(20);
      Animated.parallel([
        Animated.spring(standardScaleAnim, { toValue: 1, tension: 140, friction: 9, useNativeDriver: true }),
        Animated.spring(standardSlideAnim, { toValue: 0, tension: 140, friction: 11, useNativeDriver: true }),
      ]).start();
    });
  }, [standardAds.length]);

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

  const fetchAllAds = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('idToken');
      const headers = { Authorization: token ? `Bearer ${token}` : '' };
      const sRes = await fetch(`${API_BASE_URL}/api/ads/active?placement=home&limit=3`, { headers });
      const sData = await sRes.json();
      if (sData.success) setStandardAds(sData.ads || []);
    } catch (e) { console.error(e); }
  }, []);

  const handleAdClick = useCallback(async (ad) => {
    if (!ad?._id) return;
    fetch(`${API_BASE_URL}/api/ads/${ad._id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.media?.redirectUrl) {
      const url = validateAndFormatUrl(ad.media.redirectUrl);
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) Linking.openURL(url);
        else Alert.alert(t('error') || 'Error', 'Cannot open link');
      }
    }
  }, [t]);

  const fetchProduce = async () => {
    try {
      const response = await produceAPI.getAll();
      setProduce(response?.produce || []);
    } catch (error) {
      console.error('Error fetching produce:', error);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchProduce(), fetchAllAds()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProduce(), fetchAllAds()]);
    setRefreshing(false);
  };

  const filteredProduce = produce.filter(item => {
    if (!item) return false;
    const cropName = String(item.cropName || '').toLowerCase();
    const matchesCategory = selectedCategory === 'all' || item.cropName === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch = cropName.includes(query) ||
                          String(item.variety || '').toLowerCase().includes(query) ||
                          String(item.farmerId?.profile?.name || '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const currentStandard = standardAds[currentStandardIndex];
  const isValidUrl = (url) => url && typeof url === 'string' && url.length > 0;

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* HEADER ROW */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('buyerMarketplace') || 'Marketplace'}</Text>
        <TouchableOpacity 
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}
          onPress={() => navigation.navigate('FarmerListing')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add-box" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* UNIFIED SEARCH INPUT CONTAINER */}
        <View style={[dynamicStyles.searchContainer, styles.searchContainerShared]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('searchProducePlaceholder') || 'Search crops, farmers...'}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* PILL CATEGORIES CONTAINER */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {CROP_CATEGORIES.map(cat => {
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
                <Text style={[
                  styles.categoryText,
                  { color: isActive ? '#FFFFFF' : colors.textSecondary },
                ]}>
                  {t(cat.labelKey) || cat.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* RESULTS METADATA PANEL */}
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {filteredProduce.length} {t('listingsFound') || 'Listings Found'}
        </Text>

        {/* INTEGRATED FLOATING PRODUCE ITEMS FEED GRID */}
        {filteredProduce.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="storefront" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t('noProduceListings') || 'No Listings Available'}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('beFirstToProduce') || 'Be the first to post agricultural produce.'}</Text>
            <TouchableOpacity 
              style={[styles.listButtonEmpty, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('FarmerListing')}
              activeOpacity={0.85}
            >
              <Text style={styles.listButtonEmptyText}>{t('listYourProduce') || 'List Produce'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProduce.map(item => (
            <ProduceCard
              key={item._id}
              produce={item}
              onPress={() => navigation.navigate('ProductDetail', { produce: item })}
            />
          ))
        )}

        {/* INJECTED TARGETED BOTTOM BANNER AD CONSOLE */}
        {currentStandard && (
          <Animated.View style={{ transform: [{ scale: standardScaleAnim }, { translateX: standardSlideAnim }], marginTop: 14, marginBottom: 8 }}>
            <TouchableOpacity
              style={[dynamicStyles.stdAd, styles.stdAdShared]}
              onPress={() => handleAdClick(currentStandard)}
              activeOpacity={0.9}
            >
              {isValidUrl(currentStandard.media?.imageUrl) ? (
                <Image source={{ uri: currentStandard.media.imageUrl }} style={styles.stdImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[colors.primary, colors.primary + 'cc']} style={styles.stdImgFallback}>
                  <Ionicons name="megaphone-outline" size={18} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              )}
              <View style={styles.stdContent}>
                <Text style={[styles.stdTitle, { color: colors.text }]} numberOfLines={1}>
                  {currentStandard.title || t('partnerNotice') || 'Notice'}
                </Text>
                <Text style={[styles.stdSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {currentStandard.description || t('exploreNow') || 'Explore Now'}
                </Text>
              </View>
              <View style={[styles.adBadgeSmall, { backgroundColor: isDarkTheme ? colors.border + '20' : 'rgba(0,0,0,0.06)' }]}><Text style={[styles.adBadgeSmallText, { color: colors.textSecondary }]}>AD</Text></View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

// MATRIX STYLING CONTROLS FOR MULTI-THEME RESOLUTION
const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  headerIconBtn: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
  },
  searchContainer: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#EAF0F6',
  },
  categoryChip: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#EAF0F6',
  },
  stdAd: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.2 : 0.08,
  }
});

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 16 },
  headerIconBtnShared: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  
  searchContainerShared: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, padding: 0, fontWeight: '500' },
  
  categoriesContainer: { flexDirection: 'row', marginBottom: 16, paddingVertical: 2 },
  categoryChipShared: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 10, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  
  resultsCount: { fontSize: 12, fontWeight: '600', marginBottom: 14, letterSpacing: 0.2 },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptyText: { fontSize: 13, marginTop: 4, marginBottom: 20 },
  listButtonEmpty: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  listButtonEmptyText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  bottomSpace: { height: 24 },

  stdAdShared: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  stdImg:         { width: 76, height: 66 },
  stdImgFallback: { width: 76, height: 66, alignItems: 'center', justifyContent: 'center' },
  stdContent:     { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  stdTitle:       { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  stdSub:         { fontSize: 11 },
  adBadgeSmall:   { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, marginRight: 14 },
  adBadgeSmallText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 }
});