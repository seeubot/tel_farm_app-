import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Keyboard,
  AppState,
  Animated,
  Linking,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { useLanguage } from '../../utils/i18n';
import { API_BASE_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const unitOptions = [
  { id: 'acres', label: 'Acres' },
  { id: 'hectares', label: 'Hectares' },
  { id: 'sqm', label: 'Sq.M' },
  { id: 'sqft', label: 'Sq.Ft' },
];

const validateAndFormatUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  url = url.trim();
  if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
  const urlPattern = /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/;
  return urlPattern.test(url) ? url : null;
};

const isValidUrl = (url) => !!validateAndFormatUrl(url);

export default function LandAreaCalculatorScreen({ navigation }) {
  const { colors = {}, isDarkTheme = false } = useTheme();
  
  const activeColors = useMemo(() => ({
    background: colors.background || (isDarkTheme ? '#121212' : '#F4F6F8'),
    surface: colors.surface || (isDarkTheme ? '#1E1E1E' : '#FFFFFF'),
    border: colors.border || (isDarkTheme ? '#2C2C2E' : '#E5E5EA'),
    primary: colors.primary || '#4CAF50',
    text: colors.text || (isDarkTheme ? '#FFFFFF' : '#1C1C1E'),
    textSecondary: colors.textSecondary || (isDarkTheme ? '#8E8E93' : '#4E4E52'),
    textMuted: colors.textMuted || (isDarkTheme ? '#636366' : '#8E8E93'),
  }), [colors, isDarkTheme]);

  const { t } = useLanguage();
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState([]);
  const [area, setArea] = useState(null);
  const [perimeter, setPerimeter] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [areaUnit, setAreaUnit] = useState('acres');
  const [gettingLocation, setGettingLocation] = useState(true);

  // Search and Input States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchTimeout = useRef(null);
  const webViewRef = useRef(null);
  const searchInputRef = useRef(null);

  // Dynamic Ads State
  const [standardAds, setStandardAds] = useState([]);
  const [currentStandardIndex, setCurrentStandardIndex] = useState(0);
  const standardSlideAnim = useRef(new Animated.Value(0)).current;
  const standardScaleAnim = useRef(new Animated.Value(1)).current;
  const standardTimer = useRef(null);

  const styles = useMemo(() => makeStyles(activeColors), [activeColors]);
  const dynamicStyles = useMemo(() => getDynamicStyles(activeColors, isDarkTheme), [activeColors, isDarkTheme]);

  const currentStandard = standardAds.length > 0 ? standardAds[currentStandardIndex] : null;

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

  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    getUserCurrentLocation();
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
      if (locationSubscription) locationSubscription.remove();
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  const getUserCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('locationDenied') || 'Location Permission', t('locationAccess') || 'Please enable location permissions.');
        setGettingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      setGettingLocation(false);
    }
  };

  const searchVillages = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const states = ['Telangana', 'Andhra Pradesh'];
      let allResults = [];
      for (const state of states) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)},${state},India&limit=5&addressdetails=1`;
        const response = await fetch(url, { headers: { 'User-Agent': 'AgriAgent/1.0', 'Accept-Language': 'en' } });
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

      setSearchResults(formatted);
      setShowResults(formatted.length > 0);
    } catch (error) {
      console.warn('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchVillages(text), 500);
  };

  const calculateAreaFromPoints = (coordinates) => {
    if (coordinates.length < 3) return 0;
    const R = 6378137;
    let totalAreaInSqMeters = 0;
    const centerLat = coordinates.reduce((sum, p) => sum + p.lat, 0) / coordinates.length;
    const latToMeters = (Math.PI * R) / 180;
    const lngToMeters = ((Math.PI * R) / 180) * Math.cos(centerLat * Math.PI / 180);
    const planarPoints = coordinates.map(p => ({
      x: p.lng * lngToMeters,
      y: p.lat * latToMeters
    }));
    for (let i = 0; i < planarPoints.length; i++) {
      const j = (i + 1) % planarPoints.length;
      totalAreaInSqMeters += planarPoints[i].x * planarPoints[j].y;
      totalAreaInSqMeters -= planarPoints[j].x * planarPoints[i].y;
    }
    return Math.abs(totalAreaInSqMeters) / 2;
  };

  const calculatePerimeterFromPoints = (coordinates) => {
    if (coordinates.length < 2) return 0;
    let pathPerimeter = 0;
    const R = 6371000;
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      const dLat = (coordinates[j].lat - coordinates[i].lat) * Math.PI / 180;
      const dLng = (coordinates[j].lng - coordinates[i].lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(coordinates[i].lat * Math.PI / 180) * Math.cos(coordinates[j].lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      pathPerimeter += R * c;
    }
    return pathPerimeter;
  };

  const formatArea = (areaInSqM, unit) => {
    if (!areaInSqM) return "0.00";
    switch (unit) {
      case 'acres': return (areaInSqM / 4046.8564).toFixed(2);
      case 'hectares': return (areaInSqM / 10000).toFixed(2);
      case 'sqft': return (areaInSqM * 10.76391).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      default: return areaInSqM.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  };

  const getUnitLabel = (unit) => {
    switch (unit) {
      case 'acres': return t('acres') || 'Acres';
      case 'hectares': return t('hectares') || 'Hec.';
      case 'sqm': return t('squareMeters') || 'Sq.M';
      case 'sqft': return t('squareFeet') || 'Sq.Ft';
      default: return 'Sq.M';
    }
  };

  const formatPerimeter = (perimeterInM) => {
    if (!perimeterInM) return `0 ${t('meters') || 'Meters'}`;
    if (perimeterInM > 1000) return `${(perimeterInM / 1000).toFixed(2)} ${t('km') || 'KM'}`;
    return `${perimeterInM.toFixed(0)} ${t('meters') || 'Meters'}`;
  };

  const startGPSTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    setMeasuring(true);
    setPoints([]);
    setArea(null);
    setPerimeter(null);

    const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    const startPoint = { lat: currentLocation.coords.latitude, lng: currentLocation.coords.longitude };
    setPoints([startPoint]);

    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 1 },
      (newLocation) => {
        const newPoint = { lat: newLocation.coords.latitude, lng: newLocation.coords.longitude };
        setPoints(prev => {
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            if (lastPoint.lat === newPoint.lat && lastPoint.lng === newPoint.lng) return prev;
          }
          return [...prev, newPoint];
        });
      }
    );
    setLocationSubscription(subscription);
  };

  const stopGPSTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setMeasuring(false);
    if (points.length >= 3) {
      const areaInSqM = calculateAreaFromPoints(points);
      const perimeterInM = calculatePerimeterFromPoints(points);
      setArea(areaInSqM);
      setPerimeter(perimeterInM);
    } else {
      Alert.alert(t('error') || 'Error', t('fillRequiredFields') || 'Enclosure configuration failed.');
    }
  };

  const resetMeasurement = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setMeasuring(false);
    setPoints([]);
    setArea(null);
    setPerimeter(null);
  };

  const getLiveLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLocation({ lat: location.coords.latitude, lng: location.coords.longitude });

      const script = `
        if (window.updateCurrentLocation) {
          window.updateCurrentLocation(${location.coords.latitude}, ${location.coords.longitude});
        }
      `;
      webViewRef.current?.injectJavaScript(script);
    } catch (error) {
      console.warn(error);
    }
  };

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'confirm') {
        const formattedPoints = data.points.map(p => ({ lat: p[0], lng: p[1] }));
        const areaInSqM = calculateAreaFromPoints(formattedPoints);
        const perimeterInM = calculatePerimeterFromPoints(formattedPoints);
        setArea(areaInSqM);
        setPerimeter(perimeterInM);
        setPoints(formattedPoints);
        setShowMap(false);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const instructionTopOffset = Platform.OS === 'ios' ? 110 : 80;

  // LEAFLET MAP HTML: Updated with maxNativeZoom: 19 & maxZoom: 22 to prevent tile disappearing when zoomed in
  const leafletHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { height: 100%; width: 100vw; background-color: ${isDarkTheme ? '#121212' : '#F4F6F8'}; }
        .leaflet-control-attribution, .leaflet-bottom { display: none !important; }
        
        ${isDarkTheme ? `
        .leaflet-tile-pane {
          filter: brightness(0.7) contrast(1.1) saturate(0.9);
        }
        ` : ''}

        /* Glassmorphic Floating HUD Layout */
        .instruction-box {
          position: fixed; top: ${instructionTopOffset}px; left: 50%; transform: translateX(-50%);
          background: ${isDarkTheme ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.94)'};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 10px 16px; border-radius: 12px; z-index: 1000; text-align: center;
          border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
          width: 86%;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .instruction-text {
          color: ${isDarkTheme ? '#FFFFFF' : '#1C1C1E'};
          font-size: 13px; font-weight: 600; font-family: system-ui, -apple-system;
        }

        .points-counter {
          position: fixed; top: ${instructionTopOffset + 50}px; right: 16px;
          background: ${isDarkTheme ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.94)'};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 6px 12px; border-radius: 10px; z-index: 1000;
          border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .points-text {
          color: #4CAF50;
          font-size: 12px; font-weight: bold; font-family: system-ui, -apple-system;
        }

        /* Custom Layer Switcher Control */
        .layer-toggle-btn {
          position: fixed; top: ${instructionTopOffset + 50}px; left: 16px;
          background: ${isDarkTheme ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.94)'};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 6px 12px; border-radius: 10px; z-index: 1000;
          border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          color: ${isDarkTheme ? '#FFF' : '#1C1C1E'};
          font-size: 12px; font-weight: 600; font-family: system-ui, -apple-system;
          cursor: pointer;
        }

        /* Styled Leaflet Popups */
        .leaflet-popup-content-wrapper {
          background: ${isDarkTheme ? '#1E1E1E' : '#FFFFFF'};
          color: ${isDarkTheme ? '#FFFFFF' : '#1C1C1E'};
          border-radius: 12px;
          border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
          box-shadow: 0 6px 18px rgba(0,0,0,0.2);
          font-family: system-ui, -apple-system;
        }
        .leaflet-popup-tip {
          background: ${isDarkTheme ? '#1E1E1E' : '#FFFFFF'};
        }
        .map-popup-content {
          font-size: 13px;
          line-height: 1.4;
          padding: 2px 4px;
        }

        /* SVG Dynamic Pulsing Markers */
        .custom-loc-pin {
          width: 16px; height: 16px;
          background: #2196F3;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(33, 150, 243, 0.8);
          position: relative;
        }
        .custom-loc-pin::after {
          content: '';
          position: absolute;
          top: -10px; left: -10px; right: -10px; bottom: -10px;
          border-radius: 50%;
          border: 2px solid rgba(33, 150, 243, 0.4);
          animation: current-pulse 2.2s infinite ease-out;
        }
        @keyframes current-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        .custom-node-pin {
          width: 14px; height: 14px;
          background: #4CAF50;
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(76, 175, 80, 0.8);
          position: relative;
        }

        /* Bottom Controls Row */
        .button-container {
          position: fixed; bottom: 24px; left: 0; right: 0;
          display: flex; justify-content: center; gap: 12px; padding: 0 20px; z-index: 1000;
        }
        .custom-btn {
          flex: 1; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 700; border: none; font-family: system-ui, -apple-system;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.1s ease;
        }
        .custom-btn:active {
          transform: scale(0.97);
        }
        .clear-btn {
          background-color: ${isDarkTheme ? '#2C2C2E' : '#FFFFFF'};
          color: #FF5252;
          border: 1px solid ${isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
        }
        .calculate-btn {
          background-color: #4CAF50;
          color: white;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="instruction-box">
        <div class="instruction-text">📍 Tap corners on the map to mark boundaries</div>
      </div>
      <button class="layer-toggle-btn" id="layerToggleBtn" onclick="toggleMapLayer()">🛰️ Satellite</button>
      <div class="points-counter"><div class="points-text" id="pointsCount">Points: 0</div></div>
      <div class="button-container">
        <button class="custom-btn clear-btn" onclick="clearAllPoints()">Clear Canvas</button>
        <button class="custom-btn calculate-btn" onclick="calculateArea()">Confirm Boundary</button>
      </div>
      <script>
        var initialPoints = ${JSON.stringify(points || [])};
        var map = L.map('map', { zoomControl: false, attributionControl: false });

        // High resolution up-scalable imagery configuration (prevents data not available on deep zoom)
        var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxNativeZoom: 19,
          maxZoom: 22
        });

        var streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxNativeZoom: 19,
          maxZoom: 22
        });

        var currentMode = 'satellite';
        satelliteLayer.addTo(map);

        function toggleMapLayer() {
          if (currentMode === 'satellite') {
            map.removeLayer(satelliteLayer);
            streetLayer.addTo(map);
            currentMode = 'street';
            document.getElementById('layerToggleBtn').innerText = '🗺️ Map View';
          } else {
            map.removeLayer(streetLayer);
            satelliteLayer.addTo(map);
            currentMode = 'satellite';
            document.getElementById('layerToggleBtn').innerText = '🛰️ Satellite';
          }
        }

        var markers = [];
        var boundaryPoints = [];
        var boundaryPolygon = null;
        var currentLocationMarker = null;

        var customIcon = L.divIcon({
          className: 'custom-map-node',
          html: '<div class="custom-node-pin"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        function drawBoundary() {
          if (boundaryPolygon) { map.removeLayer(boundaryPolygon); }
          if (boundaryPoints.length >= 3) {
            boundaryPolygon = L.polygon(boundaryPoints, {
              color: '#4CAF50', weight: 3, fillColor: '#4CAF50', fillOpacity: 0.28, dashArray: '5, 5'
            }).addTo(map);
          }
        }

        function createMarker(latlng) {
          var marker = L.marker(latlng, { draggable: true, icon: customIcon }).addTo(map);
          markers.push(marker);
          boundaryPoints.push([latlng.lat, latlng.lng]);
          document.getElementById('pointsCount').innerHTML = 'Points: ' + boundaryPoints.length;
          drawBoundary();

          marker.on('dragend', function() {
            var pos = marker.getLatLng();
            var idx = markers.indexOf(marker);
            boundaryPoints[idx] = [pos.lat, pos.lng];
            drawBoundary();
          });
        }

        map.on('click', function(e) {
          createMarker(e.latlng);
        });

        function clearAllPoints() {
          markers.forEach(m => map.removeLayer(m));
          markers = []; boundaryPoints = [];
          if (boundaryPolygon) { map.removeLayer(boundaryPolygon); boundaryPolygon = null; }
          document.getElementById('pointsCount').innerHTML = 'Points: 0';
        }

        function calculateArea() {
          if (boundaryPoints.length >= 3) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'confirm', points: boundaryPoints }));
          } else {
            alert('A minimum of 3 boundary markers is required to calculate land area.');
          }
        }

        // Restore points if there is pre-existing state
        if (initialPoints && initialPoints.length > 0) {
          initialPoints.forEach(p => {
            createMarker(L.latLng(p.lat, p.lng));
          });
          var group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.12));
        } else {
          map.setView([${userLocation?.lat || 17.3850}, ${userLocation?.lng || 78.4867}], 17);
        }

        window.updateCurrentLocation = function(lat, lng) {
          var latlng = L.latLng(lat, lng);
          map.setView(latlng, 18);
          if (currentLocationMarker) {
            currentLocationMarker.setLatLng(latlng);
          } else {
            currentLocationMarker = L.marker(latlng, {
              icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div class="custom-loc-pin"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })
            }).addTo(map);
          }
        };
      </script>
    </body>
    </html>
  `, [isDarkTheme, points, userLocation]);

  return (
    <View style={[styles.container, { backgroundColor: activeColors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={activeColors.background} />

      {/* HEADER FRAME */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={18} color={activeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: activeColors.text }]}>{t('landAreaCalculator') || 'Land Area Calculator'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[dynamicStyles.infoCard, styles.infoCardShared]}>
          <Text style={[styles.infoText, { color: isDarkTheme ? '#BBB' : activeColors.primary }]}>
            {t('walkCompletely') || 'Map out custom perimeter structural nodes to execute exact coordinates calculations.'}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: activeColors.textMuted }]}>{t('measurementMethods') || 'SURVEY SYSTEMS'}</Text>

        {/* Walk Around Method */}
        <TouchableOpacity
          style={[dynamicStyles.methodCard, styles.methodCardShared, { borderLeftColor: '#4CAF50' }]}
          onPress={startGPSTracking}
          disabled={measuring}
          activeOpacity={0.85}
        >
          <View style={[styles.methodIcon, { backgroundColor: 'rgba(76, 175, 80, 0.12)' }]}>
            <MaterialIcons name="directions-walk" size={20} color="#4CAF50" />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodTitle, { color: activeColors.text }]}>{t('walkAroundMethod') || 'Real-Time Perimeter Walk'}</Text>
            <Text style={[styles.methodDesc, { color: activeColors.textSecondary }]}>{t('walkAroundDesc') || 'Log coordinate nodes dynamically via built-in satellite chips'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={activeColors.textMuted} />
        </TouchableOpacity>

        {/* Draw on Map Method */}
        <TouchableOpacity
          style={[dynamicStyles.methodCard, styles.methodCardShared, { borderLeftColor: activeColors.primary }]}
          onPress={() => setShowMap(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.methodIcon, { backgroundColor: activeColors.primary + '15' }]}>
            <MaterialIcons name="layers" size={20} color={activeColors.primary} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={[styles.methodTitle, { color: activeColors.text }]}>{t('drawOnMapMethod') || 'Manual Grid Plot'}</Text>
            <Text style={[styles.methodDesc, { color: activeColors.textSecondary }]}>{t('drawOnMapMethodDesc') || 'Anchor property limits manually across continuous map imagery'}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={activeColors.textMuted} />
        </TouchableOpacity>

        {/* Live GPS Tracking Indicator */}
        {measuring && (
          <View style={[dynamicStyles.trackingCard, styles.trackingCardShared]}>
            <ActivityIndicator size="small" color="#E53935" style={{ marginBottom: 12 }} />
            <Text style={[styles.trackingTitle, { color: activeColors.text }]}>{t('gpsTrackingActive') || 'GPS Telemetry Active Stream'}</Text>
            <Text style={styles.trackingPoints}>{points.length} {t('pointsRecorded') || 'Nodes'}</Text>
            <TouchableOpacity style={styles.stopButton} onPress={stopGPSTracking} activeOpacity={0.85}>
              <Text style={styles.stopButtonText}>{t('stopTracking') || 'Close Shape & Compile'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: activeColors.textMuted }]}>{t('displayUnits') || 'METRIC CONFIGURATIONS'}</Text>
        <View style={styles.unitGrid}>
          {unitOptions.map(unit => (
            <TouchableOpacity
              key={unit.id}
              style={[
                dynamicStyles.unitChip,
                styles.unitChipShared,
                areaUnit === unit.id && { backgroundColor: '#4CAF50', borderColor: 'transparent' }
              ]}
              onPress={() => setAreaUnit(unit.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.unitText, { color: areaUnit === unit.id ? '#FFFFFF' : activeColors.textSecondary }]}>
                {unit.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calculation Result Layout Card */}
        {area !== null && (
          <View style={[dynamicStyles.resultCard, styles.resultCardShared]}>
            <Text style={[styles.resultTitle, { color: activeColors.textMuted }]}>{t('measurementResults') || 'CALCULATED MATRIX OUTPUTS'}</Text>

            <View style={styles.resultRow}>
              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: activeColors.textSecondary }]}>{t('totalArea') || 'Resolved Field Area'}</Text>
                <Text style={[styles.resultValue, { color: '#4CAF50' }]}>{formatArea(area, areaUnit)}</Text>
                <Text style={[styles.resultUnit, { color: activeColors.textMuted }]}>{getUnitLabel(areaUnit)}</Text>
              </View>

              <View style={styles.resultDivider} />

              <View style={styles.resultItem}>
                <Text style={[styles.resultLabel, { color: activeColors.textSecondary }]}>{t('boundaryLength') || 'Total Linear Edge'}</Text>
                <Text style={[styles.resultValue, { color: activeColors.text }]}>{formatPerimeter(perimeter)}</Text>
                <Text style={[styles.resultUnit, { color: activeColors.textMuted }]}>{t('totalPerimeter') || 'Enclosed Bounds'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.resetButton} onPress={resetMeasurement} activeOpacity={0.85}>
              <Text style={[styles.resetButtonText, { color: activeColors.text }]}>{t('clearAll') || 'Clear Engine State'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {measuring && (
          <TouchableOpacity style={styles.cancelButton} onPress={resetMeasurement} activeOpacity={0.85}>
            <Text style={styles.cancelButtonText}>{t('cancelMeasurement') || 'Terminate Stream'}</Text>
          </TouchableOpacity>
        )}

        {/* Ads Section */}
        {currentStandard && (
          <Animated.View style={{ transform: [{ scale: standardScaleAnim }, { translateX: standardSlideAnim }], marginTop: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[dynamicStyles.stdAd, styles.stdAdShared]}
              onPress={() => handleAdClick(currentStandard)}
              activeOpacity={0.9}
            >
              {isValidUrl(currentStandard.media?.imageUrl) ? (
                <Image source={{ uri: currentStandard.media.imageUrl }} style={styles.stdImg} resizeMode="cover" />
              ) : (
                <LinearGradient colors={[activeColors.primary, activeColors.primary + 'cc']} style={styles.stdImgFallback}>
                  <Ionicons name="megaphone-outline" size={18} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              )}
              <View style={styles.stdContent}>
                <Text style={[styles.stdTitle, { color: activeColors.text }]} numberOfLines={1}>
                  {currentStandard.title || t('partnerNotice')}
                </Text>
                <Text style={[styles.stdSub, { color: activeColors.textSecondary }]} numberOfLines={1}>
                  {currentStandard.description || t('exploreNow')}
                </Text>
              </View>
              <View style={[styles.adBadgeSmall, { backgroundColor: isDarkTheme ? activeColors.border + '40' : 'rgba(0,0,0,0.06)' }]}>
                <Text style={[styles.adBadgeSmallText, { color: activeColors.textSecondary }]}>AD</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Map Modal */}
      <Modal animationType="slide" transparent={false} visible={showMap} onRequestClose={() => setShowMap(false)}>
        <View style={{ flex: 1, backgroundColor: isDarkTheme ? '#121212' : '#F4F6F8' }}>

          {/* Close Button */}
          <TouchableOpacity 
            onPress={() => {
              setShowMap(false);
              setSearchQuery('');
              setSearchResults([]);
              setShowResults(false);
              setShowSearchInput(false);
              Keyboard.dismiss();
            }} 
            style={[styles.modalCloseButton, { backgroundColor: isDarkTheme ? 'rgba(28, 28, 30, 0.94)' : 'rgba(255, 255, 255, 0.94)', borderColor: activeColors.border + '30' }]}
          >
            <MaterialIcons name="close" size={20} color={activeColors.text} />
          </TouchableOpacity>

          <WebView
            ref={webViewRef}
            source={{ html: leafletHTML }}
            onMessage={handleMapMessage}
            style={{ flex: 1 }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={false}
          />

          {/* Search Panel Container */}
          <View style={[mapStyles.bottomRightContainer, { bottom: keyboardHeight > 0 ? keyboardHeight + 20 : 100 }]} pointerEvents="box-none">
            {showResults && searchResults.length > 0 && (
              <View style={[mapStyles.resultsContainerBottom, { backgroundColor: isDarkTheme ? 'rgba(28, 28, 30, 0.96)' : 'rgba(255, 255, 255, 0.96)', borderColor: activeColors.border + '40' }]}>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id.toString()}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 180 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[mapStyles.resultItem, { borderBottomColor: activeColors.border + '20' }]}
                      onPress={() => {
                        const script = `
                          map.setView([${item.lat}, ${item.lon}], 17);
                          L.popup()
                            .setLatLng([${item.lat}, ${item.lon}])
                            .setContent('<div class="map-popup-content"><b>${item.name}</b><br/>${item.district}, ${item.state}</div>')
                            .openOn(map);
                        `;
                        webViewRef.current?.injectJavaScript(script);
                        setShowResults(false);
                        setSearchQuery(item.name);
                        setShowSearchInput(false);
                        Keyboard.dismiss();
                      }}
                    >
                      <MaterialIcons name={item.type === 'village' ? 'nature-people' : 'location-city'} size={15} color="#4CAF50" />
                      <View style={mapStyles.resultTextContainer}>
                        <Text style={[mapStyles.resultName, { color: activeColors.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[mapStyles.resultDetails, { color: activeColors.textSecondary }]} numberOfLines={1}>{item.district}, {item.state}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {showSearchInput && (
              <View style={[mapStyles.searchInputBottom, { backgroundColor: isDarkTheme ? 'rgba(28, 28, 30, 0.96)' : 'rgba(255, 255, 255, 0.96)', borderColor: activeColors.border + '40' }]}>
                <MaterialIcons name="search" size={16} color={activeColors.textSecondary} />
                <TextInput
                  ref={searchInputRef}
                  style={[mapStyles.searchInputField, { color: activeColors.text }]}
                  placeholder="Search village..."
                  placeholderTextColor={activeColors.textMuted}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                  returnKeyType="search"
                  autoFocus
                />
                {searching && <ActivityIndicator size="small" color="#4CAF50" />}
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowResults(false);
                  setShowSearchInput(false);
                  Keyboard.dismiss();
                }}>
                  <MaterialIcons name="close" size={16} color={activeColors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            <View style={mapStyles.actionButtonsRow}>
              <TouchableOpacity
                style={[mapStyles.actionBtn, { backgroundColor: isDarkTheme ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)', borderColor: activeColors.border + '30' }]}
                onPress={() => {
                  setShowSearchInput(!showSearchInput);
                  setShowResults(false);
                  if (!showSearchInput) setTimeout(() => searchInputRef.current?.focus(), 100);
                  else Keyboard.dismiss();
                }}
              >
                <MaterialIcons name="search" size={18} color={activeColors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[mapStyles.actionBtn, { backgroundColor: isDarkTheme ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)', borderColor: activeColors.border + '30' }]}
                onPress={getLiveLocation}
              >
                <MaterialIcons name="my-location" size={18} color="#4CAF50" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  headerIconBtn: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '40' : '#EAF0F6',
  },
  infoCard: {
    backgroundColor: isDarkTheme ? colors.surface : colors.primary + '09',
    borderColor: isDarkTheme ? colors.border + '20' : 'transparent',
  },
  methodCard: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
  },
  trackingCard: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: 'rgba(229, 57, 53, 0.25)',
  },
  unitChip: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
  },
  resultCard: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
  },
  stdAd: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.25 : 0.08,
  }
});

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 16 },
  headerIconBtnShared: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },

  infoCardShared: { padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1 },
  infoText: { fontSize: 13, lineHeight: 19, textAlign: 'center', fontWeight: '500' },
  sectionTitle: { fontSize: 11, fontWeight: '700', marginBottom: 14, marginTop: 6, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.5 },

  methodCardShared: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  methodIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  methodInfo: { flex: 1, marginLeft: 14, paddingRight: 4 },
  methodTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  methodDesc: { fontSize: 12, lineHeight: 16 },

  trackingCardShared: { borderRadius: 18, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 1 },
  trackingTitle: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
  trackingPoints: { fontSize: 32, fontWeight: '800', marginVertical: 6, color: '#E53935', letterSpacing: -0.5 },
  stopButton: { backgroundColor: '#E53935', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginTop: 4 },
  stopButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  unitChipShared: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  unitText: { fontSize: 12, fontWeight: '600' },

  resultCardShared: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  resultTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center', marginBottom: 20, opacity: 0.4, letterSpacing: 0.8 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  resultItem: { alignItems: 'center', flex: 1 },
  resultLabel: { fontSize: 12, marginBottom: 6, fontWeight: '600' },
  resultValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  resultUnit: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  resultDivider: { width: 1, height: 44 },
  resetButton: { alignItems: 'center', paddingVertical: 14, borderWidth: 1.5, borderColor: '#4CAF50', borderRadius: 12, marginTop: 8 },
  resetButtonText: { fontSize: 13, fontWeight: '700' },
  cancelButton: { marginTop: 4, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E53935' },
  cancelButtonText: { color: '#E53935', fontSize: 13, fontWeight: '700' },
  
  modalCloseButton: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 50 : 20, 
    left: 16, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 10, 
    zIndex: 2000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4
  },
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