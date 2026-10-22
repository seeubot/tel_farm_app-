import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Linking,
  Modal,
  TextInput,
  RefreshControl,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  AppState,
  Animated,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';
import { API_BASE_URL } from '../utils/api';
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

// ✅ FIXED: Added the missing helper function to prevent the ReferenceError
const isValidUrl = (url) => url && typeof url === 'string' && url.length > 0;

export default function FertilizerShopsScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // Map picker states
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [gettingAddress, setGettingAddress] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [mapSearching, setMapSearching] = useState(false);
  const [showMapResults, setShowMapResults] = useState(false);
  const [showMapSearchInput, setShowMapSearchInput] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const webViewRef = useRef(null);
  const mapSearchInputRef = useRef(null);
  const searchTimeout = useRef(null);

  // Embedded Standard Ad Banner Engine State Setup
  const [standardAds, setStandardAds] = useState([]);
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const standardSlideAnim = useRef(new Animated.Value(0)).current;
  const standardScaleAnim = useRef(new Animated.Value(1)).current;
  const standardTimer = useRef(null);

  const currentStandard = standardAds[currentStandardIndex];

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);

  const [formData, setFormData] = useState({
    name: '',
    teluguName: '',
    ownerName: '',
    phone: '',
    alternatePhone: '',
    location: {
      lat: '',
      lng: '',
      address: '',
      village: '',
      district: '',
    },
    timings: {
      opening: '09:00 AM',
      closing: '08:00 PM',
    },
  });

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

  useEffect(() => {
    getUserLocation();
    fetchAllAds();
    
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('locationDenied') || 'Permission Denied', t('locationAccess') || 'Location permission is required to find nearby shops');
        setGettingLocation(false);
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      
      fetchNearbyShops(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.error('Location error:', error);
      setGettingLocation(false);
      setLoading(false);
    }
  };

  const fetchNearbyShops = async (lat, lng, search = '') => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/fertilizer-shops/nearby?lat=${lat}&lng=${lng}&radius=20`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const token = await AsyncStorage.getItem('idToken');
      const response = await fetch(url, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      });
      const data = await response.json();
      setShops(data.shops || []);
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert(t('error') || 'Error', 'Failed to fetch nearby shops');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setGettingLocation(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userLocation) {
      await fetchNearbyShops(userLocation.lat, userLocation.lng, searchQuery);
    }
  };

  const handleSearch = () => {
    if (userLocation) {
      fetchNearbyShops(userLocation.lat, userLocation.lng, searchQuery);
    }
  };

  const searchVillages = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setMapSearchResults([]);
      setShowMapResults(false);
      return;
    }

    setMapSearching(true);
    try {
      const states = ['Telangana', 'Andhra Pradesh'];
      let allResults = [];

      for (const state of states) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)},${state},India&limit=5&addressdetails=1`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'AgriAgent/1.0',
            'Accept-Language': 'en',
          },
        });
        const data = await response.json();
        allResults = [...allResults, ...data];
      }

      const formatted = allResults
        .filter(item => {
          const type = item.type;
          return type === 'village' || type === 'town' || type === 'city' || 
                 type === 'hamlet' || type === 'suburb' || type === 'administrative';
        })
        .map(item => ({
          id: item.place_id,
          name: item.display_name.split(',')[0],
          fullName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type,
          state: item.address?.state || '',
          district: item.address?.county || item.address?.state_district || '',
        }))
        .slice(0, 8);

      setMapSearchResults(formatted);
      setShowMapResults(formatted.length > 0);
    } catch (error) {
      console.warn('Search error:', error);
    } finally {
      setMapSearching(false);
    }
  }, []);

  const handleMapSearchChange = (text) => {
    setMapSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchVillages(text);
    }, 500);
  };

  const openMapPicker = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setSelectedMapLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      setSelectedMapLocation({ lat: 17.3850, lng: 78.4867 });
    }
    setShowMapPicker(true);
  };

  const getLiveLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setSelectedMapLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      const script = `
        map.setView([${location.coords.latitude}, ${location.coords.longitude}], 18);
        if (window.shopMarker) { map.removeLayer(window.shopMarker); }
        window.shopMarker = L.marker([${location.coords.latitude}, ${location.coords.longitude}], {
          icon: L.divIcon({
            className: 'shop-marker',
            html: '<div style="width: 36px; height: 36px; background: #0F7B68; border: 3px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          })
        }).addTo(map).bindPopup('<b>Shop Location</b><br/>Drag the marker to adjust').openPopup();
        window.shopMarker.on('dragend', function() {
          var pos = window.shopMarker.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerMoved', lat: pos.lat, lng: pos.lng }));
        });
      `;
      webViewRef.current?.injectJavaScript(script);

      const geo = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geo?.[0]) {
        const locationName = [geo[0].name, geo[0].district, geo[0].city, geo[0].region]
          .filter(Boolean).join(', ');
        setMapSearchQuery(locationName || `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.warn('Live location error:', error);
    }
  };

  const handleMapMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerMoved') {
        setSelectedMapLocation({ lat: data.lat, lng: data.lng });
      }
      if (data.type === 'mapClick') {
        setSelectedMapLocation({ lat: data.lat, lng: data.lng });
        const script = `
          if (window.shopMarker) { map.removeLayer(window.shopMarker); }
          window.shopMarker = L.marker([${data.lat}, ${data.lng}], {
            icon: L.divIcon({
              className: 'shop-marker',
              html: '<div style="width: 36px; height: 36px; background: #0F7B68; border: 3px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
              iconSize: [36, 36],
              iconAnchor: [18, 36]
            }),
            draggable: true
          }).addTo(map).bindPopup('<b>Shop Location</b>').openPopup();
          window.shopMarker.on('dragend', function() {
            var pos = window.shopMarker.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerMoved', lat: pos.lat, lng: pos.lng }));
          });
        `;
        webViewRef.current?.injectJavaScript(script);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const confirmMapLocation = async () => {
    if (!selectedMapLocation) {
      Alert.alert(t('error') || 'Error', 'Please select a location on the map');
      return;
    }

    setGettingAddress(true);
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: selectedMapLocation.lat,
        longitude: selectedMapLocation.lng,
      });

      const address = reverseGeocode[0];
      
      setFormData({
        ...formData,
        location: {
          lat: selectedMapLocation.lat.toString(),
          lng: selectedMapLocation.lng.toString(),
          address: [
            address?.name,
            address?.street,
            address?.city,
            address?.district,
            address?.region,
          ].filter(Boolean).join(', '),
          village: address?.city || address?.name || address?.subregion || '',
          district: address?.district || address?.region || '',
        },
      });

      setShowMapPicker(false);
      Alert.alert(t('success') || 'Success', t('locationSet') || 'Shop location has been placed on the map');
    } catch (error) {
      setFormData({
        ...formData,
        location: {
          lat: selectedMapLocation.lat.toString(),
          lng: selectedMapLocation.lng.toString(),
          address: `${selectedMapLocation.lat.toFixed(6)}, ${selectedMapLocation.lng.toFixed(6)}`,
          village: '',
          district: '',
        },
      });
      setShowMapPicker(false);
      Alert.alert(t('success') || 'Success', 'Coordinates saved. Please fill address manually.');
    } finally {
      setGettingAddress(false);
    }
  };

  const handleAddShop = async () => {
    if (!formData.name || !formData.ownerName || !formData.phone || !formData.location.address) {
      Alert.alert(t('error') || 'Error', t('fillRequiredFields') || 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('idToken');
      const response = await fetch(`${API_BASE_URL}/api/fertilizer-shops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          name: formData.name,
          teluguName: formData.teluguName,
          ownerName: formData.ownerName,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          location: {
            lat: parseFloat(formData.location.lat),
            lng: parseFloat(formData.location.lng),
            address: formData.location.address,
            village: formData.location.village,
            district: formData.location.district,
          },
          timings: formData.timings,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(t('success') || 'Success', 'Shop added successfully! It will appear after admin verification.');
        setShowAddModal(false);
        resetForm();
        if (userLocation) {
          fetchNearbyShops(userLocation.lat, userLocation.lng, searchQuery);
        }
      } else {
        Alert.alert(t('failed') || 'Error', data.error || 'Failed to add shop');
      }
    } catch (error) {
      Alert.alert(t('error') || 'Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      teluguName: '',
      ownerName: '',
      phone: '',
      alternatePhone: '',
      location: { lat: '', lng: '', address: '', village: '', district: '' },
      timings: { opening: '09:00 AM', closing: '08:00 PM' },
    });
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
    } else {
      Alert.alert('Info', t('contactUnavailable') || 'Phone number not available');
    }
  };

  const handleDirections = (shop) => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${shop.location.lat},${shop.location.lng}`,
      android: `http://maps.google.com/?daddr=${shop.location.lat},${shop.location.lng}`,
    });
    Linking.openURL(url);
  };

  const tileUrl = isDarkTheme 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { height: 100%; width: 100vw; background-color: ${isDarkTheme ? '#121212' : '#F4F6F8'}; }
        .leaflet-control-attribution { display: none !important; }
        .instruction-box {
          position: fixed; top: 54px; left: 50%; transform: translateX(-50%);
          background: rgba(15, 15, 15, 0.9); backdrop-filter: blur(8px);
          padding: 10px 20px; border-radius: 12px; z-index: 1000; text-align: center;
          border: 1px solid rgba(255,255,255,0.1); width: 85%;
        }
        .instruction-text { color: white; font-size: 12px; font-weight: 600; font-family: system-ui; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="instruction-box">
        <div class="instruction-text">Tap anywhere to place shop location. Drag marker to adjust.</div>
      </div>
      <script>
        var map = L.map('map', { zoomControl: true, attributionControl: false })
                   .setView([${selectedMapLocation?.lat || userLocation?.lat || 17.3850}, ${selectedMapLocation?.lng || userLocation?.lng || 78.4867}], 17);
        
        L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);
        
        var shopMarker = L.marker([${selectedMapLocation?.lat || userLocation?.lat || 17.3850}, ${selectedMapLocation?.lng || userLocation?.lng || 78.4867}], {
          icon: L.divIcon({
            className: 'shop-marker',
            html: '<div style="width: 36px; height: 36px; background: #0F7B68; border: 3px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          }),
          draggable: true
        }).addTo(map).bindPopup('<b>Shop Location</b><br/>Drag to adjust').openPopup();
        
        window.shopMarker = shopMarker;
        
        shopMarker.on('dragend', function() {
          var pos = shopMarker.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerMoved', lat: pos.lat, lng: pos.lng }));
        });
        
        map.on('click', function(e) {
          if (window.shopMarker) { map.removeLayer(window.shopMarker); }
          window.shopMarker = L.marker(e.latlng, {
            icon: L.divIcon({
              className: 'shop-marker',
              html: '<div style="width: 36px; height: 36px; background: #0F7B68; border: 3px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
              iconSize: [36, 36],
              iconAnchor: [18, 36]
            }),
            draggable: true
          }).addTo(map).bindPopup('<b>Shop Location</b>').openPopup();
          
          window.shopMarker.on('dragend', function() {
            var pos = window.shopMarker.getLatLng();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerMoved', lat: pos.lat, lng: pos.lng }));
          });
          
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick', lat: e.latlng.lat, lng: e.latlng.lng }));
        });
      </script>
    </body>
    </html>
  `;

  if (gettingLocation && loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text, marginTop: 16 }]}>
          {t('loading') || 'Finding nearby shops...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{t('fertilizerShopsTitle') || 'Fertilizer Shops'}</Text>
        <TouchableOpacity 
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]} 
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR PANEL */}
      <View style={[dynamicStyles.searchContainer, styles.searchContainerShared]}>
        <MaterialIcons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('searchShopsPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); if (userLocation) fetchNearbyShops(userLocation.lat, userLocation.lng); }}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* SHOPS FEED LIST */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {shops.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="store" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{t('noShopsFound')}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('beFirstToAddShop')}</Text>
            <TouchableOpacity style={[styles.addShopBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
              <Text style={styles.addShopBtnText}>{t('addShop') || 'Add a Shop'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          shops.map((shop) => (
            <View key={shop._id} style={[dynamicStyles.shopCard, styles.shopCardShared]}>
              <View style={styles.shopHeader}>
                <View style={styles.shopInfo}>
                  <View style={[styles.shopIcon, { backgroundColor: colors.primary + '15' }]}>
                    <MaterialIcons name="store" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.shopName, { color: colors.text }]} numberOfLines={1}>{shop.name}</Text>
                    {shop.teluguName ? (
                      <Text style={[styles.shopTeluguName, { color: colors.textMuted }]} numberOfLines={1}>{shop.teluguName}</Text>
                    ) : null}
                    <Text style={[styles.ownerName, { color: colors.textSecondary }]} numberOfLines={1}>{t('ownerName') || 'Owner'}: {shop.ownerName}</Text>
                  </View>
                </View>
                {shop.isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
                    <MaterialIcons name="verified" size={10} color="#FFF" />
                    <Text style={styles.verifiedText}>{t('verified') || 'Verified'}</Text>
                  </View>
                )}
              </View>

              <View style={styles.shopDetails}>
                <View style={styles.detailRow}>
                  <MaterialIcons name="location-on" size={14} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{shop.location?.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="near-me" size={14} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                    {shop.distance ? `${shop.distance} ${t('kmAway') || 'km away'}` : shop.location?.village || t('locationSet')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialIcons name="access-time" size={14} color={colors.textMuted} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{shop.timings?.opening} - {shop.timings?.closing}</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                {shop.phone ? (
                  <TouchableOpacity style={[styles.actionBtn, styles.callBtn, { borderColor: colors.primary }]} onPress={() => handleCall(shop.phone)} activeOpacity={0.8}>
                    <MaterialIcons name="call" size={16} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t('callLabourer')?.split(' ')[0] || 'Call'}</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[styles.actionBtn, styles.directionBtn, { backgroundColor: colors.primary }]} onPress={() => handleDirections(shop)} activeOpacity={0.85}>
                  <MaterialIcons name="directions" size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>{t('exploreNow')?.split(' ')[0] || 'Directions'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* INJECTED TARGETED BOTTOM BANNER AD CONSOLE */}
        {currentStandard && (
          <Animated.View style={{ transform: [{ scale: standardScaleAnim }, { translateX: standardSlideAnim }], marginTop: 6, marginBottom: 12 }}>
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
                  {currentStandard.title || t('partnerNotice')}
                </Text>
                <Text style={[styles.stdSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {currentStandard.description || t('exploreNow')}
                </Text>
              </View>
              <View style={[styles.adBadgeSmall, { backgroundColor: isDarkTheme ? colors.border + '20' : 'rgba(0,0,0,0.06)' }]}><Text style={[styles.adBadgeSmallText, { color: colors.textSecondary }]}>AD</Text></View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* ADD SHOP MODAL FORM COMPONENT */}
      <Modal animationType="slide" transparent={false} visible={showAddModal} onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={[styles.modalContainer, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border + '30' }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.modalCloseButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('addFertilizerShop') || 'Add Fertilizer Shop'}</Text>
            <View style={{ width: 38 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.text }]}>{t('shopName') || 'Shop Name'} *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Enter shop name" placeholderTextColor={colors.textMuted} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />

            <Text style={[styles.label, { color: colors.text }]}>{t('shopNameTelugu') || 'Shop Name (Telugu)'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Enter shop name in Telugu" placeholderTextColor={colors.textMuted} value={formData.teluguName} onChangeText={(text) => setFormData({ ...formData, teluguName: text })} />

            <Text style={[styles.label, { color: colors.text }]}>{t('ownerName') || 'Owner Name'} *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Enter owner name" placeholderTextColor={colors.textMuted} value={formData.ownerName} onChangeText={(text) => setFormData({ ...formData, ownerName: text })} />

            <Text style={[styles.label, { color: colors.text }]}>{t('phoneNumber') || 'Phone Number'} *</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Enter phone number" placeholderTextColor={colors.textMuted} value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} keyboardType="phone-pad" />

            <Text style={[styles.label, { color: colors.text }]}>{t('alternatePhone') || 'Alternate Phone'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Alternate phone number" placeholderTextColor={colors.textMuted} value={formData.alternatePhone} onChangeText={(text) => setFormData({ ...formData, alternatePhone: text })} keyboardType="phone-pad" />

            <Text style={[styles.label, { color: colors.text }]}>{t('openingTime') || 'Opening Time'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="e.g., 09:00 AM" placeholderTextColor={colors.textMuted} value={formData.timings.opening} onChangeText={(text) => setFormData({ ...formData, timings: { ...formData.timings, opening: text } })} />

            <Text style={[styles.label, { color: colors.text }]}>{t('closingTime') || 'Closing Time'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="e.g., 08:00 PM" placeholderTextColor={colors.textMuted} value={formData.timings.closing} onChangeText={(text) => setFormData({ ...formData, timings: { ...formData.timings, closing: text } })} />

            <View style={styles.locationSectionHeader}>
              <Text style={[styles.label, { color: colors.text, marginTop: 0 }]}>{t('setLocation') || 'Shop Location'} *</Text>
              {formData.location.lat ? (
                <View style={[styles.locationSetBadge, { backgroundColor: colors.primary + '15' }]}>
                  <MaterialIcons name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.locationSetText, { color: colors.primary }]}>{t('locationSet') || 'Location Set'}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={[styles.mapPickerButton, { backgroundColor: colors.primary + '12', borderColor: colors.primary }]} onPress={openMapPicker} activeOpacity={0.85}>
              <MaterialIcons name="map" size={24} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.mapPickerTitle, { color: colors.primary }]}>
                  {formData.location.lat ? t('changeLocationMap') || 'Change Location on Map' : t('selectLocationMap') || 'Select Location on Map'}
                </Text>
                <Text style={[styles.mapPickerSubtitle, { color: colors.textSecondary }]}>
                  {formData.location.lat ? `Lat: ${parseFloat(formData.location.lat).toFixed(4)}, Lng: ${parseFloat(formData.location.lng).toFixed(4)}` : 'Tap to open map canvas and position a marker pin'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 14, color: colors.text }]}>{t('address') || 'Address'} *</Text>
            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Auto-filled from map anchor node or enter manually" placeholderTextColor={colors.textMuted} value={formData.location.address} onChangeText={(text) => setFormData({ ...formData, location: { ...formData.location, address: text } })} multiline numberOfLines={3} />

            <Text style={[styles.label, { color: colors.text }]}>{t('village') || 'Village / Town'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="Village or town name" placeholderTextColor={colors.textMuted} value={formData.location.village} onChangeText={(text) => setFormData({ ...formData, location: { ...formData.location, village: text } })} />

            <Text style={[styles.label, { color: colors.text }]}>{t('district') || 'District'}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]} placeholder="District name" placeholderTextColor={colors.textMuted} value={formData.location.district} onChangeText={(text) => setFormData({ ...formData, location: { ...formData.location, district: text } })} />

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && styles.submitButtonDisabled]} onPress={handleAddShop} disabled={submitting} activeOpacity={0.9}>
              {submitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.submitButtonText}>{t('addShop') || 'Add Shop'}</Text>}
            </TouchableOpacity>

            <Text style={[styles.noteText, { color: colors.textMuted }]}>{t('shopVerificationNote')}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* MAP PICKER OVERLAY LAYER CANVAS */}
      <Modal animationType="slide" transparent={false} visible={showMapPicker} onRequestClose={() => setShowMapPicker(false)}>
        <View style={{ flex: 1, backgroundColor: isDarkTheme ? '#141414' : '#F4F6F8' }}>
          
          <TouchableOpacity onPress={() => { setShowMapPicker(false); setMapSearchQuery(''); setMapSearchResults([]); setShowMapResults(false); setShowMapSearchInput(false); Keyboard.dismiss(); }} style={styles.modalMapCloseButton}>
            <MaterialIcons name="close" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={confirmMapLocation} style={styles.modalConfirmButton} disabled={gettingAddress} activeOpacity={0.85}>
            {gettingAddress ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.modalConfirmText}>{t('confirm') || 'Confirm'}</Text>
            )}
          </TouchableOpacity>

          <WebView ref={webViewRef} source={{ html: leafletHTML }} onMessage={handleMapMessage} style={{ flex: 1 }} javaScriptEnabled={true} domStorageEnabled={true} scrollEnabled={false} />

          {/* Search Location Controls overlay */}
          <View style={[mapStyles.bottomRightContainer, { bottom: keyboardHeight > 0 ? keyboardHeight + 20 : 100 }]} pointerEvents="box-none">
            
            {showMapResults && mapSearchResults.length > 0 && (
              <View style={[mapStyles.resultsContainerBottom, { backgroundColor: isDarkTheme ? 'rgba(26,26,26,0.96)' : 'rgba(255,255,255,0.96)', borderColor: colors.border + '30' }]}>
                <FlatList
                  data={mapSearchResults}
                  keyExtractor={(item) => item.id.toString()}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 180 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[mapStyles.resultItem, { borderBottomColor: colors.border + '20' }]} onPress={() => {
                      const script = `map.setView([${item.lat}, ${item.lon}], 17); if (window.shopMarker) { map.removeLayer(window.shopMarker); } window.shopMarker = L.marker([${item.lat}, ${item.lon}], { icon: L.divIcon({ className: 'shop-marker', html: '<div style="width: 36px; height: 36px; background: #0F7B68; border: 3px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>', iconSize: [36, 36], iconAnchor: [18, 36] }), draggable: true }).addTo(map).bindPopup('<b>${item.name}</b>').openPopup(); window.shopMarker.on('dragend', function() { var pos = window.shopMarker.getLatLng(); window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerMoved', lat: pos.lat, lng: pos.lng })); }); window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerMoved', lat: ${item.lat}, lng: ${item.lon} }));`;
                      webViewRef.current?.injectJavaScript(script);
                      setShowMapResults(false);
                      setMapSearchQuery(item.name);
                      setShowMapSearchInput(false);
                      Keyboard.dismiss();
                    }}>
                      <MaterialIcons name={item.type === 'village' ? 'nature-people' : 'location-city'} size={15} color="#2E7D32" />
                      <View style={mapStyles.resultTextContainer}>
                        <Text style={[mapStyles.resultName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[mapStyles.resultDetails, { color: colors.textSecondary }]} numberOfLines={1}>{item.district}, {item.state}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {showMapSearchInput && (
              <View style={[mapStyles.searchInputBottom, { backgroundColor: isDarkTheme ? 'rgba(26,26,26,0.96)' : 'rgba(255,255,255,0.96)', borderColor: colors.border + '30' }]}>
                <MaterialIcons name="search" size={16} color={colors.textSecondary} />
                <TextInput ref={mapSearchInputRef} style={[mapStyles.searchInputField, { color: colors.text }]} placeholder="Search village TG/AP..." placeholderTextColor={colors.textMuted} value={mapSearchQuery} onChangeText={handleMapSearchChange} onFocus={() => mapSearchResults.length > 0 && setShowMapResults(true)} returnKeyType="search" autoFocus />
                {mapSearching && <ActivityIndicator size="small" color="#2E7D32" />}
                <TouchableOpacity onPress={() => { setMapSearchQuery(''); setMapSearchResults([]); setShowMapResults(false); setShowMapSearchInput(false); Keyboard.dismiss(); }}>
                  <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={mapStyles.actionButtonsRow}>
              <TouchableOpacity style={[mapStyles.actionBtn, { backgroundColor: isDarkTheme ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)', borderColor: colors.border + '30' }]} onPress={() => { setShowMapSearchInput(!showMapSearchInput); setShowMapResults(false); if (!showMapSearchInput) { setTimeout(() => mapSearchInputRef.current?.focus(), 100); } else { Keyboard.dismiss(); } }} activeOpacity={0.7}>
                <MaterialIcons name="search" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={[mapStyles.actionBtn, { backgroundColor: isDarkTheme ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)', borderColor: colors.border + '30' }]} onPress={getLiveLocation} activeOpacity={0.7}>
                <MaterialIcons name="my-location" size={20} color="#2E7D32" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  shopCard: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.2 : 0.06,
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
  
  loadingText: { fontSize: 14, fontWeight: '600' },
  searchContainerShared: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, padding: 0, fontWeight: '500' },
  
  shopCardShared: { borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  shopInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  shopIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  shopName: { fontSize: 15, fontWeight: '700' },
  shopTeluguName: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  ownerName: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 3 },
  verifiedText: { fontSize: 9, color: '#FFF', fontWeight: '700' },
  
  shopDetails: { marginBottom: 14, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, flex: 1, fontWeight: '500' },
  
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
  callBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
  directionBtn: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginTop: 4 },
  emptyText: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  addShopBtn: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2 },
  addShopBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 16, borderBottomWidth: 1 },
  modalCloseButton: { padding: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12, letterSpacing: 0.1 },
  input: { borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 14, marginBottom: 10, fontWeight: '500' },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  locationSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  locationSetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  locationSetText: { fontSize: 11, fontWeight: '700' },
  mapPickerButton: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 6 },
  mapPickerTitle: { fontSize: 14, fontWeight: '700' },
  mapPickerSubtitle: { fontSize: 11, marginTop: 2 },
  
  submitButton: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  noteText: { fontSize: 11, textAlign: 'center', marginTop: 16, marginBottom: 32, fontWeight: '500' },
  
  modalMapCloseButton: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 32, left: 16, backgroundColor: 'rgba(15,15,15,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, zIndex: 2000 },
  modalConfirmButton: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 32, right: 16, backgroundColor: '#0F7B68', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, zIndex: 2000 },
  modalConfirmText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
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

const mapStyles = StyleSheet.create({
  bottomRightContainer: { position: 'absolute', right: 16, alignItems: 'flex-end', zIndex: 2100, maxWidth: 300 },
  searchInputBottom: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8, gap: 8, borderWidth: 1, marginBottom: 8, width: 260, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 4 } }) },
  searchInputField: { flex: 1, fontSize: 14, padding: 0, fontWeight: '500' },
  resultsContainerBottom: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 8, width: 260, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 4 } }) },
  actionButtonsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }, android: { elevation: 3 } }) },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8, borderBottomWidth: 1 },
  resultTextContainer: { flex: 1 },
  resultName: { fontSize: 13, fontWeight: '600' },
  resultDetails: { fontSize: 11, marginTop: 1 },
});