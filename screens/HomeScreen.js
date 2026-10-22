import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView,
  Platform, ActivityIndicator, RefreshControl, Image, Animated, Linking,
  AppState, Easing, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';
import WeatherCard from '../components/WeatherCard';
import Layout from '../components/Layout';
import { API_BASE_URL } from '../utils/api';
import { requestAllPermissions } from '../utils/permissions';

const { width } = Dimensions.get('window');

// Perfectly proportional 16:9 banner container bounds
const BANNER_WIDTH = width - 40; // Screen width minus padding (20 on each side)
const BANNER_HEIGHT = BANNER_WIDTH * (9 / 16); 

const AD_CACHE_KEY_PREMIUM = 'cache_ads_premium';
const AD_CACHE_KEY_STANDARD = 'cache_ads_standard';

const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
  const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
  return urlPattern.test(url) ? url : null;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// Helper: Fetch with timeout to prevent hanging requests
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// ── Weather Chip ───────────────────────────────────────────────────────────
const WeatherChip = ({ locationName, colors, onPress }) => {
  const [temp, setTemp]   = useState(null);
  const [desc, setDesc]   = useState('');
  const [icon, setIcon]   = useState('wb-sunny');

  useEffect(() => {
    (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const res = await fetchWithTimeout(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current_weather=true`,
          {},
          4000
        );
        const data = await res.json();
        if (data?.current_weather) {
          setTemp(Math.round(data.current_weather.temperature));
          const code = data.current_weather.weathercode;
          if (code === 0)            { setDesc('Clear sky');      setIcon('wb-sunny'); }
          else if (code <= 2)        { setDesc('Partly cloudy');  setIcon('wb-cloudy'); }
          else if (code <= 45)       { setDesc('Cloudy');         setIcon('cloud'); }
          else if (code <= 67)       { setDesc('Rainy');          setIcon('grain'); }
          else if (code <= 77)       { setDesc('Snow');           setIcon('ac-unit'); }
          else                       { setDesc('Stormy');         setIcon('thunderstorm'); }
        }
      } catch { setTemp(null); }
    })();
  }, [locationName]);

  return (
    <TouchableOpacity
      style={[styles.weatherChip, { backgroundColor: colors.surface, borderColor: colors.border + '30' }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.chipLeft}>
        <View style={[styles.chipIndicatorDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.chipLoc, { color: colors.textSecondary }]} numberOfLines={1}>
          {locationName}
        </Text>
        <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.chipTemp, { color: colors.text }]}>
          {temp !== null ? `${temp}°C` : '--°C'}
        </Text>
      </View>
      <View style={styles.chipRight}>
        <Text style={[styles.chipDesc, { color: colors.textMuted }]}>{desc}</Text>
        <MaterialIcons name={icon} size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
};

// ── Main Home Module Screen ─────────────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const { t, language } = useLanguage();
  const userName = route?.params?.userName || 'Agri User';

  const [refreshing, setRefreshing]         = useState(false);
  const [locationName, setLocationName]     = useState('Loading...');
  const [premiumAds, setPremiumAds]         = useState([]);
  const [standardAds, setStandardAds]       = useState([]);
  const [currentPremiumIndex, setCurrentPremiumIndex]   = useState(0);
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const [isPremiumTransitioning, setIsPremiumTransitioning] = useState(false);
  const [adTextVisible, setAdTextVisible]   = useState(true);

  const premiumSlideAnim  = useRef(new Animated.Value(0)).current;
  const premiumOpacity    = useRef(new Animated.Value(1)).current;
  const standardSlideAnim = useRef(new Animated.Value(0)).current;
  const standardScaleAnim = useRef(new Animated.Value(1)).current;
  const adTextOpacity     = useRef(new Animated.Value(1)).current;
  const isAdsFetched      = useRef(false);
  const premiumTimer      = useRef(null);
  const standardTimer     = useRef(null);
  const adTextTimer       = useRef(null);

  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);

  const startAdTextTimer = useCallback(() => {
    clearTimeout(adTextTimer.current);
    adTextOpacity.setValue(1);
    setAdTextVisible(true);
    adTextTimer.current = setTimeout(() => {
      Animated.timing(adTextOpacity, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setAdTextVisible(false));
    }, 3000);
  }, []);

  const slideToNext = useCallback(() => {
    if (premiumAds.length < 2 || isPremiumTransitioning) return;
    setIsPremiumTransitioning(true);
    Animated.parallel([
      Animated.timing(premiumSlideAnim, { toValue: -width * 1.1, duration: 380, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      Animated.timing(premiumOpacity,   { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setCurrentPremiumIndex(p => (p + 1) % premiumAds.length);
      premiumSlideAnim.setValue(width * 0.4);
      Animated.parallel([
        Animated.spring(premiumSlideAnim, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
        Animated.timing(premiumOpacity,   { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => { setIsPremiumTransitioning(false); startAdTextTimer(); });
    });
  }, [premiumAds.length, isPremiumTransitioning, startAdTextTimer]);

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
    clearInterval(premiumTimer.current);
    clearInterval(standardTimer.current);
    if (premiumAds.length > 1)  premiumTimer.current  = setInterval(slideToNext, 6000);
    if (standardAds.length > 1) standardTimer.current = setInterval(animateStandard, 5000);
  }, [premiumAds.length, standardAds.length, slideToNext, animateStandard]);

  useEffect(() => {
    startAdTimers();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') startAdTimers();
      else { clearInterval(premiumTimer.current); clearInterval(standardTimer.current); }
    });
    return () => {
      clearInterval(premiumTimer.current);
      clearInterval(standardTimer.current);
      clearTimeout(adTextTimer.current);
      sub?.remove();
    };
  }, [startAdTimers]);

  useEffect(() => { if (premiumAds.length > 0) startAdTextTimer(); }, [premiumAds.length]);

  // Preloads images in background memory for instant rendering
  const preloadAdImages = (ads) => {
    if (!Array.isArray(ads)) return;
    ads.forEach(ad => {
      const url = ad?.media?.imageUrl;
      if (url && typeof url === 'string') {
        Image.prefetch(url).catch(() => {});
      }
    });
  };

  // Load local cached ads immediately
  const loadCachedAds = async () => {
    try {
      const [cachedP, cachedS] = await Promise.all([
        AsyncStorage.getItem(AD_CACHE_KEY_PREMIUM),
        AsyncStorage.getItem(AD_CACHE_KEY_STANDARD),
      ]);
      if (cachedP) setPremiumAds(JSON.parse(cachedP));
      if (cachedS) setStandardAds(JSON.parse(cachedS));
    } catch (e) {
      console.log('Error reading ad cache:', e);
    }
  };

  const fetchAllAds = useCallback(async (force = false) => {
    if (isAdsFetched.current && !force) return;
    try {
      const token = await AsyncStorage.getItem('idToken');
      const headers = { Authorization: token ? `Bearer ${token}` : '' };

      const [pRes, sRes] = await Promise.all([
        fetchWithTimeout(`${API_BASE_URL}/api/ads/active?placement=home_premium&limit=3`, { headers }, 5000).catch(() => null),
        fetchWithTimeout(`${API_BASE_URL}/api/ads/active?placement=home&limit=3`, { headers }, 5000).catch(() => null),
      ]);

      if (pRes && pRes.ok) {
        const pData = await pRes.json();
        if (pData.success && pData.ads) {
          setPremiumAds(pData.ads);
          preloadAdImages(pData.ads);
          AsyncStorage.setItem(AD_CACHE_KEY_PREMIUM, JSON.stringify(pData.ads)).catch(() => {});
        }
      }

      if (sRes && sRes.ok) {
        const sData = await sRes.json();
        if (sData.success && sData.ads) {
          setStandardAds(sData.ads);
          preloadAdImages(sData.ads);
          AsyncStorage.setItem(AD_CACHE_KEY_STANDARD, JSON.stringify(sData.ads)).catch(() => {});
        }
      }

      isAdsFetched.current = true;
    } catch (e) { console.error('Error fetching ads:', e); }
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

  const getLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo?.[0]) setLocationName((geo[0].city || geo[0].district || geo[0].region || 'Telangana'));
    } catch { setLocationName('Telangana'); }
  };

  useEffect(() => {
    // Fire all initial tasks asynchronously in parallel for maximum startup speed
    loadCachedAds();
    requestAllPermissions();
    getLocation();
    fetchAllAds();
  }, []);

  useFocusEffect(useCallback(() => { getLocation(); }, [language]));

  const onRefresh = async () => {
    setRefreshing(true);
    isAdsFetched.current = false;
    await Promise.all([getLocation(), fetchAllAds(true)]);
    setRefreshing(false);
  };

  const currentPremium  = premiumAds[currentPremiumIndex];
  const currentStandard = standardAds[currentStandardIndex];
  const isValidUrl      = (url) => url && typeof url === 'string' && url.length > 0;

  // Fully Image-Free Quick Actions Configuration Matrix
  const QUICK_ACTIONS = [
    { key: 'labour',      title: t('findLabour'),      icon: 'account-search',  pack: 'community', color: '#004D40', bg: '#E0F2F1', screen: 'FarmerDashboard' },
    { key: 'equipment',   title: t('rentEquipment'),   icon: 'tractor',         pack: 'community', color: '#BF360C', bg: '#FBE9E7', screen: 'EquipmentRental' },
    { key: 'landarea',    title: t('measureLand'),     icon: 'layers-outline',  pack: 'community', color: '#3E2723', bg: '#EFEBE9', screen: 'LandAreaCalculator' },
    { key: 'marketplace', title: t('marketplace'),     icon: 'storefront',      pack: 'material',  color: '#1A237E', bg: '#E8EAF6', screen: 'BuyerMarketplace' },
    { key: 'fertilizer',  title: t('fertilizerShops'), icon: 'sprout-outline',  pack: 'community', color: '#1B5E20', bg: '#E8F5E9', screen: 'FertilizerShops' },
    { key: 'revenue',     title: t('revenueCalc'),     icon: 'currency-usd',    pack: 'community', color: '#4A148C', bg: '#F3E5F5', screen: 'RevenueCalculator' },
  ];

  return (
    <Layout
      navigation={navigation}
      placement="home"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[styles.userName,  { color: colors.text }]}>{userName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border + '30' }]}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <MaterialIcons name="settings" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* CAROUSEL PREMIUM CAMPAIGNS IN FULL 16:9 PROPORTION */}
      {currentPremium ? (
        <>
          <View style={[dynamicStyles.premiumWrap, styles.premiumWrapShared, { height: BANNER_HEIGHT }]}>
            <Animated.View style={[styles.premiumSlide, { transform: [{ translateX: premiumSlideAnim }], opacity: premiumOpacity }]}>
              <TouchableOpacity activeOpacity={0.95} onPress={() => handleAdClick(currentPremium)}>
                {isValidUrl(currentPremium.media?.imageUrl) ? (
                  <Image
                    source={{ uri: currentPremium.media.imageUrl }}
                    style={styles.premiumImg}
                    resizeMode="contain"
                  />
                ) : (
                  <LinearGradient
                    colors={['#0F4C35', '#1B6A4F', '#2D8A64']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.premiumImg}
                  />
                )}

                {adTextVisible && (
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
                    style={styles.premiumScrim}
                    pointerEvents="none"
                  />
                )}

                <Animated.View style={[styles.premiumTopRow, { opacity: adTextOpacity }]}>
                  <View style={styles.sponsoredPill}>
                    <MaterialCommunityIcons name="star-four-points" size={8} color="#E8A020" style={{ marginRight: 4 }} />
                    <Text style={styles.sponsoredText}>PARTNER CAMPAIGN</Text>
                  </View>
                  <View style={styles.adBadgeTop}>
                    <Text style={styles.adBadgeTopText}>AD</Text>
                  </View>
                </Animated.View>

                <Animated.View style={[styles.premiumBottom, { opacity: adTextOpacity }]}>
                  <Text style={styles.premiumTitle} numberOfLines={1}>
                    {currentPremium.title || 'Discover More'}
                  </Text>
                  <Text style={styles.premiumSubtitle} numberOfLines={1}>
                    {currentPremium.description || 'Tap to review details'}
                  </Text>
                  <View style={styles.premiumCTARow}>
                    <View style={styles.premiumCTABtn}>
                      <Text style={styles.premiumCTAText}>Learn More</Text>
                      <MaterialIcons name="arrow-forward" size={10} color="#FFF" style={{ marginLeft: 4 }} />
                    </View>
                    {premiumAds.length > 1 && (
                      <View style={styles.dotsRow}>
                        {premiumAds.map((_, i) => (
                          <View key={i} style={[styles.dot, i === currentPremiumIndex && styles.dotActive]} />
                        ))}
                      </View>
                    )}
                  </View>
                </Animated.View>

                {premiumAds.length > 1 && (
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${((currentPremiumIndex + 1) / premiumAds.length) * 100}%` }]} />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          <WeatherChip
            locationName={locationName}
            colors={colors}
            onPress={() => navigation.navigate('WeatherScreen')}
          />
        </>
      ) : (
        <TouchableOpacity
          style={{ marginBottom: 20 }}
          onPress={() => navigation.navigate('WeatherScreen')}
          activeOpacity={0.9}
        >
          <WeatherCard locationName={locationName} />
        </TouchableOpacity>
      )}

      {/* DASHBOARD HUB HEADER */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('Dashboard Hub') || 'Dashboard Hub'}</Text>

      <TouchableOpacity
        style={[styles.solutionsBanner, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Solutions')}
        activeOpacity={0.9}
      >
        <View style={styles.bannerTextLeft}>
          <Text style={styles.bannerEyebrow}>Diagnostic Desk</Text>
          <Text style={styles.bannerTitle}>{t('getSolutions') || 'Resolve Crop Anomalies'}</Text>
        </View>
        <View style={styles.bannerIcon}>
          <MaterialCommunityIcons name="leaf" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* REDESIGNED IMAGE-FREE QUICK ACTIONS GRID */}
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[dynamicStyles.actionCard, styles.actionCardShared, { borderLeftColor: a.color }]}
            onPress={() => navigation.navigate(a.screen)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
              {a.pack === 'community' ? (
                <MaterialCommunityIcons name={a.icon} size={22} color={a.color} />
              ) : (
                <MaterialIcons name={a.icon} size={22} color={a.color} />
              )}
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionText, { color: colors.text }]} numberOfLines={2}>
                {a.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* INLINE CONSOLE STANDARD AD */}
      {currentStandard && (
        <Animated.View style={{ transform: [{ scale: standardScaleAnim }, { translateX: standardSlideAnim }], marginBottom: 20 }}>
          <TouchableOpacity
            style={[dynamicStyles.stdAd, styles.stdAdShared]}
            onPress={() => handleAdClick(currentStandard)}
            activeOpacity={0.9}
          >
            {isValidUrl(currentStandard.media?.imageUrl) ? (
              <Image source={{ uri: currentStandard.media.imageUrl }} style={styles.stdImg} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['#712B13', '#A84324']} style={styles.stdImgFallback}>
                <MaterialIcons name="campaign" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
            <View style={styles.stdContent}>
              <Text style={[styles.stdTitle, { color: colors.text }]} numberOfLines={1}>
                {currentStandard.title || 'Partner Notice'}
              </Text>
              <Text style={[styles.stdSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentStandard.description || 'Tap to learn more'}
              </Text>
            </View>
            <View style={[styles.adBadgeSmall, { backgroundColor: colors.border + '50' }]}><Text style={[styles.adBadgeSmallText, { color: colors.text }]}>AD</Text></View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Layout>
  );
}

// ── Complete Theme Separation Matrix ───────────────────────────────────────
const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  premiumWrap: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.35 : 0.15,
  },
  actionCard: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.15 : 0.08,
  },
  stdAd: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.2 : 0.08,
  },
});

// ── Shared Layout Geometric Metrics ───────────────────────────────────────
const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, marginTop: Platform.OS === 'ios' ? 8 : 12 },
  greeting: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 3 },
  userName:  { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  premiumWrapShared: { borderRadius: 24, overflow: 'hidden', marginBottom: 12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 4 },
  premiumSlide: { width: '100%' },
  premiumImg:   { width: '100%', height: BANNER_HEIGHT },
  premiumScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: BANNER_HEIGHT },
  premiumTopRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sponsoredPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  sponsoredText: { color: '#FFF', fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  adBadgeTop: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  adBadgeTopText: { color: '#FFF', fontSize: 8, fontWeight: '700', letterSpacing: 0.4 },
  premiumBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 12 },
  premiumTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.3, marginBottom: 4 },
  premiumSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18, marginBottom: 14 },
  premiumCTARow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  premiumCTABtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  premiumCTAText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  dotsRow:   { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 16, backgroundColor: '#FFF' },
  progressBar:  { height: 3, position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { height: '100%' },

  weatherChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  chipLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipIndicatorDot: { width: 6, height: 6, borderRadius: 3 },
  chipLoc:     { fontSize: 13, fontWeight: '600' },
  chipDivider: { width: 1, height: 14 },
  chipTemp:    { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  chipRight:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipDesc:    { fontSize: 12, fontWeight: '400' },

  sectionTitle:  { fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: -0.2 },
  seeAll:        { fontSize: 13, fontWeight: '600' },

  solutionsBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16, marginBottom: 14, ...Platform.select({ ios: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, shadowOpacity: 0.15 }, android: { elevation: 2 } }) },
  bannerTextLeft: { flex: 1, paddingRight: 8 },
  bannerEyebrow: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  bannerTitle:   { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: -0.2 },
  bannerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Redesigned Symmetrical Quick Actions Grid Layout Metrics
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 24, justifyContent: 'space-between' },
  actionCardShared: { width: (width - 36) / 2, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionTextContainer: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700', lineHeight: 16, letterSpacing: -0.1 },

  stdAdShared: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  stdImg:         { width: 76, height: 66 },
  stdImgFallback: { width: 76, height: 66, alignItems: 'center', justifyContent: 'center' },
  stdContent:     { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  stdTitle:       { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  stdSub:         { fontSize: 11 },
  adBadgeSmall:   { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, marginRight: 14 },
  adBadgeSmallText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.3 },
});