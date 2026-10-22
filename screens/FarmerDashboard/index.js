import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Dimensions,
  Animated, Easing, Linking, TextInput,
  SafeAreaView, StatusBar, Platform, AppState,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import Layout from '../../components/Layout';
import * as Location from 'expo-location';
import { useLanguage } from '../../utils/i18n';
import { API_BASE_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Premium Color System Palette
const THEME_LABOUR = {
  primary: '#0D9488',
  lightBg: '#F0FDFA',
  textDark: '#0F766E',
  glow: 'rgba(13, 148, 136, 0.15)',
};

const THEME_CONTRACTOR = {
  primary: '#E11D48',
  lightBg: '#FFF1F2',
  textDark: '#BE123C',
  glow: 'rgba(225, 29, 72, 0.15)',
};

const CROP_OPTIONS = [
  { id: 'All crops', labelKey: 'all' },
  { id: 'Paddy', labelKey: 'Paddy' },
  { id: 'Cotton', labelKey: 'Cotton' },
  { id: 'Sugarcane', labelKey: 'Sugarcane' },
  { id: 'Chilli', labelKey: 'Chilli' },
  { id: 'Maize', labelKey: 'Maize' },
  { id: 'Groundnut', labelKey: 'Groundnut' },
  { id: 'Tobacco', labelKey: 'Tobacco' },
  { id: 'Turmeric', labelKey: 'Turmeric' },
  { id: 'Mango', labelKey: 'Mango' },
  { id: 'Banana', labelKey: 'Banana' },
  { id: 'Red Gram', labelKey: 'RedGram' },
  { id: 'Black Gram', labelKey: 'BlackGram' },
  { id: 'Vegetables', labelKey: 'Vegetables' },
];

const RADIUS_PRESETS = [5, 10, 25, 50];

const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
  const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
  return urlPattern.test(url) ? url : null;
};

export default function FarmerDashboard({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  const styles = useMemo(() => makeStyles(colors, isDarkTheme), [colors, isDarkTheme]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [labourers, setLabourers] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [segment, setSegment] = useState('labourers');
  const [selectedCrop, setSelectedCrop] = useState('All crops');
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [userLocation, setUserLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState(null);
  const [locationFilter, setLocationFilter] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [standardAds, setStandardAds] = useState([]);
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const standardSlideAnim = useRef(new Animated.Value(0)).current;
  const standardScaleAnim = useRef(new Animated.Value(1)).current;
  const standardTimer = useRef(null);

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

  const fetchAllAds = useCallback(async (force = false) => {
    try {
      const token = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('idToken');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const sRes = await fetch(`${API_BASE_URL}/api/ads/active?placement=home&limit=3`, { headers });
      const sData = await sRes.json();
      if (sData.success) setStandardAds(sData.ads || []);
    } catch (e) { console.error(e); }
  }, []);

  const handleAdClick = async (ad) => {
    if (!ad?._id) return;
    fetch(`${API_BASE_URL}/api/ads/${ad._id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.media?.redirectUrl) {
      const url = validateAndFormatUrl(ad.media.redirectUrl);
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) Linking.openURL(url);
        else Alert.alert(t('error'), 'Cannot open link');
      }
    }
  };

  const fetchNearbyLabourers = useCallback(async (lat, lng, radius, crop, village) => {
    const token = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('idToken');
    const cropParam = crop && crop !== 'All crops' ? `&crop=${encodeURIComponent(crop.trim())}` : '';
    const villageParam = village ? `&village=${encodeURIComponent(village.trim())}` : '';
    const url = `${API_BASE_URL}/api/labourers/nearby?lat=${lat}&lng=${lng}&radius=${radius}${cropParam}${villageParam}`;
    const res = await fetch(url, {
      headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setLabourers(data.success && data.labourers ? data.labourers : []);
  }, []);

  const fetchContractors = useCallback(async () => {
    const token = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('idToken');
    const res = await fetch(`${API_BASE_URL}/api/contractors`, {
      headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    setContractors(data.success && data.contractors ? data.contractors : []);
  }, []);

  const loadAll = useCallback(async (lat, lng, radius, crop, village) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchNearbyLabourers(lat, lng, radius, crop, village),
        fetchContractors(),
        fetchAllAds()
      ]);
    } catch {
      setError(t('somethingWentWrongRetry'));
    } finally {
      setLoading(false);
      setSearchPerformed(true);
      setGettingLocation(false);
    }
  }, [fetchNearbyLabourers, fetchContractors, fetchAllAds, t]);

  const getUserLocation = useCallback(async () => {
    setGettingLocation(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('locationAccessDeniedSettings'));
        setGettingLocation(false);
        setSearchPerformed(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      await loadAll(coords.lat, coords.lng, selectedRadius, selectedCrop, locationFilter);
    } catch {
      setError(t('couldNotGetLocation'));
      setGettingLocation(false);
      setSearchPerformed(true);
    }
  }, [selectedRadius, selectedCrop, locationFilter, loadAll, t]);

  useEffect(() => { getUserLocation(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userLocation) await loadAll(userLocation.lat, userLocation.lng, selectedRadius, selectedCrop, locationFilter);
    else await getUserLocation();
    setRefreshing(false);
  }, [userLocation, selectedRadius, selectedCrop, locationFilter, loadAll, getUserLocation]);

  const handleCropSelect = useCallback((crop) => {
    setSelectedCrop(crop);
    if (userLocation && searchPerformed) loadAll(userLocation.lat, userLocation.lng, selectedRadius, crop, locationFilter);
  }, [userLocation, searchPerformed, selectedRadius, locationFilter, loadAll]);

  const handleRadiusSelect = useCallback((r) => {
    setSelectedRadius(r);
    if (userLocation && searchPerformed) loadAll(userLocation.lat, userLocation.lng, r, selectedCrop, locationFilter);
  }, [userLocation, searchPerformed, selectedCrop, locationFilter, loadAll]);

  const clearLocationFilter = useCallback(() => {
    setLocationFilter('');
    if (userLocation && searchPerformed) {
      loadAll(userLocation.lat, userLocation.lng, selectedRadius, selectedCrop, '');
    }
  }, [userLocation, searchPerformed, selectedRadius, selectedCrop, loadAll]);

  const handleContact = useCallback((phone) => {
    if (!phone) { Alert.alert(t('noPhoneTitle'), t('noPhoneMessage')); return; }
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() =>
      Alert.alert(t('cannotCallTitle'), t('cannotCallMessage'))
    );
  }, [t]);

  const combinedResults = useMemo(() => {
    const l = labourers.map(item => ({ item, type: 'labourer', rating: parseFloat(item.ratings?.average || 0) }));
    const c = contractors.map(item => ({ item, type: 'contractor', rating: parseFloat(item.ratings?.average || 0) }));
    let merged = segment === 'labourers' ? l : c;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      merged = merged.filter(({ item, type }) => {
        const name = (type === 'labourer' ? item.profile?.name : (item.contractorDetails?.companyName || item.profile?.name)) || '';
        return name.toLowerCase().includes(q);
      });
    }
    return merged.sort((a, b) => b.rating - a.rating);
  }, [labourers, contractors, segment, searchQuery]);

  const currentStandard = standardAds[currentStandardIndex];
  const isValidUrl = (url) => url && typeof url === 'string' && url.length > 0;
  const activeTheme = segment === 'labourers' ? THEME_LABOUR : THEME_CONTRACTOR;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Layout
        navigation={navigation}
        placement="marketplace"
        scrollable={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={activeTheme.primary} colors={[activeTheme.primary]} />
        }
        showBackButton={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER BAR WITH SOFT EMBOSSED BUTTON */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('findWorkers')}</Text>

          <View style={{ width: 42 }} />
        </View>

        {/* FLOATING GLASS SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search workers or companies..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle-sharp" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ERROR CONTAINER */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={getUserLocation} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GLOWING DUAL SEGMENT SWITCHER */}
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segment, segment === 'labourers' && { backgroundColor: THEME_LABOUR.primary }]}
            onPress={() => setSegment('labourers')}
            activeOpacity={0.9}
          >
            <Text style={[styles.segmentText, { color: segment === 'labourers' ? '#FFFFFF' : colors.textSecondary }]}>
              {t('Labourers')}
            </Text>
            <View style={[styles.segmentBadge, { backgroundColor: segment === 'labourers' ? 'rgba(255,255,255,0.25)' : colors.border + '30' }]}>
              <Text style={[styles.badgeText, { color: segment === 'labourers' ? '#FFFFFF' : colors.textSecondary }]}>
                {labourers.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segment, segment === 'contractors' && { backgroundColor: THEME_CONTRACTOR.primary }]}
            onPress={() => setSegment('contractors')}
            activeOpacity={0.9}
          >
            <Text style={[styles.segmentText, { color: segment === 'contractors' ? '#FFFFFF' : colors.textSecondary }]}>
              {t('Contractors')}
            </Text>
            <View style={[styles.segmentBadge, { backgroundColor: segment === 'contractors' ? 'rgba(255,255,255,0.25)' : colors.border + '30' }]}>
              <Text style={[styles.badgeText, { color: segment === 'contractors' ? '#FFFFFF' : colors.textSecondary }]}>
                {contractors.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CHIP FILTERS TOOLBAR */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filtersOpen && { borderColor: activeTheme.primary }]}
            onPress={() => setFiltersOpen(o => !o)}
            activeOpacity={0.8}
          >
            <Ionicons name="options" size={15} color={activeTheme.primary} />
            <Text style={[styles.filterBtnText, { color: colors.text }]}>{t('')}</Text>
          </TouchableOpacity>

          {selectedCrop !== 'All crops' && (
            <View style={[styles.filterPill, { backgroundColor: activeTheme.lightBg }]}>
              <Text style={[styles.filterPillText, { color: activeTheme.textDark }]}>
                {t(CROP_OPTIONS.find(c => c.id === selectedCrop)?.labelKey || 'allCrops')}
              </Text>
              <TouchableOpacity onPress={() => handleCropSelect('All crops')}>
                <Ionicons name="close-circle" size={15} color={activeTheme.primary} />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.filterPill, { backgroundColor: activeTheme.lightBg }]}>
            <Text style={[styles.filterPillText, { color: activeTheme.textDark }]}>{selectedRadius} {t('km')}</Text>
            <TouchableOpacity onPress={() => handleRadiusSelect(10)}>
              <Ionicons name="close-circle" size={15} color={activeTheme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* EXPANDABLE FILTER MODAL DRAWER */}
        {filtersOpen && (
          <View style={styles.filterPanel}>
            <Text style={[styles.filterPanelLabel, { color: colors.textMuted }]}>{t('cropTypeLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
              {CROP_OPTIONS.map(crop => {
                const on = selectedCrop === crop.id;
                return (
                  <TouchableOpacity
                    key={crop.id}
                    onPress={() => handleCropSelect(crop.id)}
                    style={[styles.chip, { backgroundColor: on ? activeTheme.primary : colors.surface, borderColor: on ? activeTheme.primary : colors.border + '30' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#FFF' : colors.textSecondary }}>{t(crop.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.filterPanelLabel, { marginTop: 14, color: colors.textMuted }]}>{t('searchRadius')}</Text>
            <View style={styles.filterChipRow}>
              {RADIUS_PRESETS.map(r => {
                const on = selectedRadius === r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => handleRadiusSelect(r)}
                    style={[styles.chip, { backgroundColor: on ? activeTheme.primary : colors.surface, borderColor: on ? activeTheme.primary : colors.border + '30' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: on ? '#FFF' : colors.textSecondary }}>{r} {t('km')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ADVERTISEMENT CONSOLE CAROUSEL */}
        {currentStandard && (
          <Animated.View style={{ transform: [{ scale: standardScaleAnim }, { translateX: standardSlideAnim }], marginBottom: 16 }}>
            <TouchableOpacity
              style={styles.stdAd}
              onPress={() => handleAdClick(currentStandard)}
              activeOpacity={0.9}
            >
              {isValidUrl(currentStandard.media?.imageUrl) ? (
                <Image source={{ uri: currentStandard.media.imageUrl }} style={styles.stdImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[activeTheme.primary, activeTheme.primary + 'AA']} style={styles.stdImgFallback}>
                  <Ionicons name="megaphone" size={20} color="#FFFFFF" />
                </LinearGradient>
              )}
              <View style={styles.stdContent}>
                <Text style={[styles.stdTitle, { color: colors.text }]} numberOfLines={1}>
                  {currentStandard.title || 'Market Notice'}
                </Text>
                <Text style={[styles.stdSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {currentStandard.description || 'Tap to review updates'}
                </Text>
              </View>
              <View style={[styles.adBadgeSmall, { backgroundColor: colors.border + '30' }]}>
                <Text style={[styles.adBadgeSmallText, { color: colors.textSecondary }]}>AD</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* RESULTS FEED MATRIX */}
        {loading || gettingLocation ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={activeTheme.primary} />
            <Text style={[styles.loaderText, { color: colors.textMuted }]}>{t('searching')}</Text>
          </View>
        ) : combinedResults.length === 0 ? (
          <EmptyState segment={segment} styles={styles} colors={colors} t={t} />
        ) : (
          <View style={styles.list}>
            {combinedResults.map(({ item, type }) => (
              <ResultRow
                key={item._id}
                item={item}
                type={type}
                styles={styles}
                colors={colors}
                onContact={handleContact}
                t={t}
              />
            ))}
          </View>
        )}
      </Layout>
    </SafeAreaView>
  );
}

// ─── ROW CARD COMPONENT ─────────────────────────────────────────────
const ResultRow = React.memo(({ item, type, styles, colors, onContact, t }) => {
  const isLabourer = type === 'labourer';
  const theme = isLabourer ? THEME_LABOUR : THEME_CONTRACTOR;

  const name = isLabourer
    ? (item.profile?.name || t('defaultWorkerName'))
    : (item.contractorDetails?.companyName || item.profile?.name || t('contractor'));
  const initial = name.charAt(0).toUpperCase();

  const subtitle = isLabourer
    ? (item.labourerDetails?.skills?.slice(0, 3).join(', ') || t('generalLabour'))
    : (item.contractorDetails?.crops?.slice(0, 3).join(', ') || t('generalContracting'));

  const rating = parseFloat(item.ratings?.average || 0).toFixed(1);
  const distance = item.distance ? `${Math.round(item.distance)} ${t('kmAway')}` : null;
  const serviceRadius = item.serviceRadius ? `${item.serviceRadius}km radius` : null;
  const teamSize = item.contractorDetails?.teamSize;
  const metaRight = isLabourer ? (distance || serviceRadius) : (teamSize != null ? `${t('teamOf')} ${teamSize}` : null);

  return (
    <View style={styles.rowCard}>
      <View style={[styles.avatar, { backgroundColor: theme.lightBg }]}>
        <Text style={[styles.avatarText, { color: theme.textDark }]}>{initial}</Text>
      </View>

      <View style={styles.rowMid}>
        <View style={styles.rowTopLine}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
          <View style={[styles.typeBadge, { backgroundColor: theme.lightBg }]}>
            <Text style={[styles.typeBadgeText, { color: theme.textDark }]}>
              {isLabourer ? t('labourer') : t('contractor')}
            </Text>
          </View>
        </View>

        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
        
        <View style={styles.rowMetaLine}>
          <Ionicons name="star" size={13} color="#F59E0B" />
          <Text style={[styles.rowMetaText, { color: colors.textSecondary }]}>{rating}</Text>
          {metaRight && (
            <>
              <Text style={styles.rowMetaDot}>•</Text>
              <Text style={[styles.rowMetaText, { color: colors.textMuted }]}>{metaRight}</Text>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.callBtn, { backgroundColor: theme.primary }]}
        onPress={() => onContact(item.profile?.phone)}
        activeOpacity={0.8}
      >
        <Ionicons name="call" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
});

const EmptyState = ({ segment, styles, colors, t }) => (
  <View style={styles.empty}>
    <View style={[styles.emptyIconCircle, { backgroundColor: colors.border + '30' }]}>
      <Ionicons name="people-outline" size={32} color={colors.textMuted} />
    </View>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>
      {segment === 'labourers' ? t('noLabourersFound') : t('noContractorsFound')}
    </Text>
    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{t('noWorkersMessage')}</Text>
  </View>
);

// ─── STYLES SYSTEM ─────────────────────────────────────────
const makeStyles = (colors, isDarkTheme) => StyleSheet.create({
  safeArea: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 8 : 12, paddingBottom: 32 },
  
  loader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loaderText: { fontSize: 13, fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '20',
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkTheme ? 0.2 : 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 2, fontWeight: '500' },

  // Errors
  errorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { flex: 1, fontSize: 12, color: '#991B1B', fontWeight: '600' },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#DC262615', borderRadius: 6 },
  retryText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },

  // Segment
  segmentWrap: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '20',
    padding: 4,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  segmentBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Filters
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '20',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterBtnText: { fontSize: 12, fontWeight: '700' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  filterPillText: { fontSize: 12, fontWeight: '700' },

  // Expandable Panel
  filterPanel: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '20',
    padding: 16,
    marginBottom: 14,
  },
  filterPanelLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  filterChipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { height: 32, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', borderWidth: 1 },

  // Results
  list: { gap: 12, paddingBottom: 20 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '20',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: '800' },

  rowMid: { flex: 1, marginLeft: 12, minWidth: 0 },
  rowTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },

  rowSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  rowMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rowMetaText: { fontSize: 11, fontWeight: '600' },
  rowMetaDot: { fontSize: 11, color: '#94A3B8' },

  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    flexShrink: 0,
  },

  // Empty State
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Standard Ad
  stdAd: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '20',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkTheme ? 0.2 : 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  stdImg: { width: 72, height: 64 },
  stdImgFallback: { width: 72, height: 64, alignItems: 'center', justifyContent: 'center' },
  stdContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  stdTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  stdSub: { fontSize: 11 },
  adBadgeSmall: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 12 },
  adBadgeSmallText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
});