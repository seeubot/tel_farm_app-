import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
  Animated,
  Easing,
  Text,
  Dimensions,
  Switch,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme } from '../utils/theme';
import { authAPI, bookingAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const CROP_OPTIONS = [
  'Paddy', 'Cotton', 'Sugarcane', 'Chilli', 'Maize',
  'Groundnut', 'Tobacco', 'Turmeric', 'Mango', 'Banana',
  'Red Gram', 'Black Gram', 'Vegetables'
];

const RADIUS_PRESETS = [
  { value: 5, label: '5 km', desc: 'Local Village' },
  { value: 10, label: '10 km', desc: 'Sub-District' },
  { value: 25, label: '25 km', desc: 'District Wide' },
  { value: 50, label: '50 km', desc: 'Regional' }
];

const getLeafletHTML = (lat, lng, radius, isDarkTheme) => {
  const tileUrl = isDarkTheme
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const accentColor = '#10B981'; // Cyber Mint

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { height: 100%; width: 100vw; background-color: ${isDarkTheme ? '#0B0F19' : '#F3F7FA'}; }
        .leaflet-control-attribution { display: none !important; }
        
        .pulse-marker {
          position: relative;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${accentColor};
          border: 3px solid #FFFFFF;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.8);
        }
        .pulse-marker::after {
          content: '';
          position: absolute;
          width: 48px;
          height: 48px;
          left: -15px;
          top: -15px;
          border-radius: 50%;
          border: 2px solid ${accentColor};
          opacity: 0;
          animation: mapRipple 1.6s ease-out infinite;
        }
        @keyframes mapRipple {
          0% { transform: scale(0.3); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: scale(1.1); opacity: 0; }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
          center: [${lat}, ${lng}],
          zoom: 12,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);

        const liveIcon = L.divIcon({
          className: 'custom-live-marker',
          html: '<div class="pulse-marker"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        L.marker([${lat}, ${lng}], { icon: liveIcon }).addTo(map);

        const circle = L.circle([${lat}, ${lng}], {
          radius: ${radius * 1000},
          color: '${accentColor}',
          fillColor: '${accentColor}',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '6, 6'
        }).addTo(map);

        map.fitBounds(circle.getBounds().pad(0.15));

        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.radius !== undefined) {
              circle.setRadius(data.radius * 1000);
              map.fitBounds(circle.getBounds().pad(0.15));
            }
          } catch(e) {}
        });
      </script>
    </body>
    </html>
  `;
};

const StatsCard = ({ value, label, iconName, color, index, theme }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1, friction: 6, tension: 45,
      delay: 150 + index * 100, useNativeDriver: true
    }).start();
  }, []);
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: scaleAnim }] }}>
      <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.statsIconCircle, { backgroundColor: color + '12' }]}>
          <MaterialIcons name={iconName} size={18} color={color} />
        </View>
        <Text style={[styles.statsValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
    </Animated.View>
  );
};

const JobCard = ({ job, index, theme }) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 60, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const statusConfig = {
    completed: { bg: '#E6F4EA', color: '#10B981', label: 'COMPLETED' },
    confirmed: { bg: '#E0F2FE', color: '#0EA5E9', label: 'CONFIRMED' },
    pending: { bg: '#FEF3C7', color: '#D97706', label: 'PENDING' },
    cancelled: { bg: '#FEE2E2', color: '#EF4444', label: 'CANCELLED' },
  };
  const status = statusConfig[job.status] || statusConfig.pending;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={[styles.jobCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.jobRow}>
          <View style={[styles.jobIconBox, { backgroundColor: status.bg }]}>
            <FontAwesome5 name={job.type === 'labour' ? 'user-friends' : 'tools'} size={14} color={status.color} />
          </View>
          <View style={styles.jobInfo}>
            <Text style={[styles.jobTitle, { color: theme.text }]}>
              {job.type === 'labour' ? 'Farm Labour Service' : 'Equipment Operations'}
            </Text>
            <View style={styles.jobDateRow}>
              <MaterialIcons name="calendar-today" size={11} color={theme.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.jobDate, { color: theme.textSecondary }]}>
                {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <View style={[styles.jobStatusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.jobStatusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export default function LabourerDashboardScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [user, setUser] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [showMap, setShowMap] = useState(false);
  const [radiusInput, setRadiusInput] = useState('10');
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const webViewRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [formData, setFormData] = useState({
    name: '', teluguName: '', phone: '', age: '', experience: '', location: '',
  });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [myJobs, setMyJobs] = useState([]);
  const [stats, setStats] = useState({ activeJobs: 0, completedJobs: 0, rating: 0 });

  const isDark = isDarkTheme;
  const theme = {
    bg: isDark ? '#080C14' : '#F3F7FA',
    surface: isDark ? '#0F172A' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textMuted: isDark ? '#475569' : '#94A3B8',
    border: isDark ? '#1E293B' : '#E2E8F0',
    primary: '#10B981', // Cyber Mint
    primaryDark: '#059669',
    inputBg: isDark ? '#1E293B' : '#F8FAFC',
  };

  useEffect(() => {
    checkProfileFromBackend();
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboardOffset(e.endCoordinates.height - 30));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOffset(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleBackNavigation = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const updateMapRadius = (newRadius) => {
    setServiceRadius(newRadius);
    setRadiusInput(String(newRadius));
    if (webViewRef.current) webViewRef.current.postMessage(JSON.stringify({ radius: newRadius }));
  };

  const checkProfileFromBackend = async () => {
    setInitialLoading(true);
    try {
      const response = await authAPI.getMe();
      if (response.success && response.user) {
        const backendUser = response.user;
        setUser(backendUser);
        const hasLabourerRole = backendUser.roles?.includes('labourer');
        const hasSkills = backendUser.labourerDetails?.skills?.length > 0;
        if (hasLabourerRole && hasSkills) {
          setProfileComplete(true);
          setFormData({
            name: backendUser.profile?.name || '',
            teluguName: backendUser.profile?.teluguName || '',
            phone: backendUser.profile?.phone || '',
            age: backendUser.labourerDetails?.age?.toString() || '',
            experience: backendUser.labourerDetails?.experience?.toString() || '',
            location: backendUser.profile?.location?.address || '',
          });
          setSelectedSkills(backendUser.labourerDetails?.skills || []);
          setIsAvailable(backendUser.labourerDetails?.isAvailable ?? true);
          setServiceRadius(backendUser.labourerDetails?.serviceRadius || 10);
          setRadiusInput(String(backendUser.labourerDetails?.serviceRadius || 10));
          setProfileImage(backendUser.profile?.profileImage);
          if (backendUser.profile?.location?.lat) setGpsCoords({ lat: backendUser.profile.location.lat, lng: backendUser.profile.location.lng });
          await AsyncStorage.setItem('user', JSON.stringify(backendUser));
          fetchMyJobs();
        } else {
          setProfileComplete(false);
          setFormData(prev => ({ ...prev, name: '', phone: backendUser.profile?.phone || '' }));
        }
      }
    } catch (error) { await loadLocalData(); }
    finally {
      setInitialLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  };

  const loadLocalData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        if (userData.labourerDetails?.skills?.length > 0 && userData.roles?.includes('labourer')) {
          setProfileComplete(true);
          setFormData({
            name: userData.profile?.name || '', teluguName: userData.profile?.teluguName || '',
            phone: userData.profile?.phone || '', age: userData.labourerDetails?.age?.toString() || '',
            experience: userData.labourerDetails?.experience?.toString() || '', location: userData.profile?.location?.address || '',
          });
          setSelectedSkills(userData.labourerDetails?.skills || []);
          setIsAvailable(userData.labourerDetails?.isAvailable ?? true);
          setServiceRadius(userData.labourerDetails?.serviceRadius || 10);
          setRadiusInput(String(userData.labourerDetails?.serviceRadius || 10));
          setProfileImage(userData.profile?.profileImage);
          if (userData.profile?.location?.lat) setGpsCoords({ lat: userData.profile.location.lat, lng: userData.profile.location.lng });
        }
      }
    } catch (error) { console.error('Local storage fetch error:', error); }
  };

  const fetchMyJobs = async () => {
    try {
      const response = await bookingAPI.getMyBookings();
      const jobs = response.bookings?.filter(b => b.type === 'labour') || [];
      setMyJobs(jobs);
      setStats({
        activeJobs: jobs.filter(j => j.status === 'pending' || j.status === 'confirmed').length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        rating: user?.ratings?.average || 0,
      });
    } catch (error) { console.error('Error fetching jobs:', error); }
  };

  const onRefresh = async () => { setRefreshing(true); await checkProfileFromBackend(); setRefreshing(false); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission Denied', 'Please enable Location services to register.'); setGettingLocation(false); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
      setGpsCoords(coords);
      const geocode = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
      if (geocode[0]) {
        const addr = geocode[0];
        setFormData(prev => ({ ...prev, location: `${addr.city || addr.name || ''}, ${addr.region || ''}` }));
      }
      setShowMap(true);
    } catch (error) { Alert.alert('Error', 'Failed to acquire location telemetry'); }
    finally { setGettingLocation(false); }
  };

  const toggleSkill = (crop) => setSelectedSkills(prev => prev.includes(crop) ? prev.filter(s => s !== crop) : [...prev, crop]);

  const saveProfile = async () => {
    if (!formData.name || !formData.phone) { Alert.alert('Error', 'Please fill name and phone number'); return; }
    if (selectedSkills.length === 0) { Alert.alert('Error', 'Please select at least one crop specialty'); return; }
    if (!gpsCoords) { Alert.alert('GPS Required', 'Please set your service coordinates.'); return; }
    setLoading(true);
    try {
      await authAPI.updateRole('labourer');
      await authAPI.updateProfile({
        name: formData.name, teluguName: formData.teluguName, phone: formData.phone, profileImage,
        location: { lat: gpsCoords.lat, lng: gpsCoords.lng, address: formData.location, village: formData.location },
        labourerDetails: { age: parseInt(formData.age) || 0, experience: parseInt(formData.experience) || 0, skills: selectedSkills, isAvailable, serviceRadius },
      });
      Alert.alert('Success!', 'Registration details verified!');
      setProfileComplete(true);
      await checkProfileFromBackend();
    } catch (error) { Alert.alert('Error', error.message || 'Failed to sync partner profile'); }
    finally { setLoading(false); }
  };

  const handleToggleAvailability = async () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);
    try {
      await authAPI.updateProfile({ labourerDetails: { ...user?.labourerDetails, isAvailable: nextState, skills: selectedSkills } });
      await checkProfileFromBackend();
    } catch (error) { setIsAvailable(!nextState); }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 16, fontSize: 14, fontWeight: '700', letterSpacing: 0.2 }}>Initializing partner console...</Text>
      </View>
    );
  }

  if (showMap && gpsCoords) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: theme.bg }]}>
        <StatusBar hidden />
        <WebView
          ref={webViewRef}
          source={{ html: getLeafletHTML(gpsCoords.lat, gpsCoords.lng, serviceRadius, isDarkTheme) }}
          style={styles.fullScreenMap}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={[styles.mapLoading, { backgroundColor: theme.bg }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
        />
        <View style={styles.mapFloatingHeader}>
          <TouchableOpacity style={[styles.mapCloseButton, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => setShowMap(false)}>
            <MaterialIcons name="chevron-left" size={24} color={theme.text} />
            <Text style={[styles.mapCloseText, { color: theme.text }]}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Service Radius Console Selector */}
        <View style={[styles.radiusPanel, { backgroundColor: theme.surface }]}>
          <Text style={[styles.radiusPanelLabel, { color: theme.textSecondary }]}>Coverage Area Radius Limit</Text>
          <View style={styles.radiusInputRow}>
            <TextInput
              style={[styles.radiusTextInput, { color: theme.primary, borderBottomColor: theme.border }]}
              value={radiusInput}
              onChangeText={(text) => {
                setRadiusInput(text);
                const num = parseInt(text);
                if (!isNaN(num) && num >= 1 && num <= 100) updateMapRadius(num);
              }}
              keyboardType="numeric"
              maxLength={3}
              selectTextOnFocus
            />
            <Text style={[styles.radiusUnitLabel, { color: theme.textMuted }]}>km</Text>
          </View>

          {/* Symmetrical Preset Pills */}
          <View style={styles.presetContainer}>
            {RADIUS_PRESETS.map((p) => {
              const active = serviceRadius === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.presetPill, { backgroundColor: active ? theme.primary : theme.inputBg, borderColor: active ? theme.primary : theme.border }]}
                  onPress={() => updateMapRadius(p.value)}
                >
                  <Text style={[styles.presetLabel, { color: active ? '#FFFFFF' : theme.text }]}>{p.label}</Text>
                  <Text style={[styles.presetDesc, { color: active ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>{p.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={() => setShowMap(false)}>
            <Text style={styles.confirmBtnText}>Save Coverage Limit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!profileComplete) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.appBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBackNavigation} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: theme.text }]}>Labourer Account</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardOffset + 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              
              {/* Profile Image & Headers */}
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                  <View style={styles.avatarWrapper}>
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                    ) : (
                      <LinearGradient colors={[theme.primary, '#10B981']} style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{formData.name?.charAt(0)?.toUpperCase() || 'L'}</Text>
                      </LinearGradient>
                    )}
                    <LinearGradient colors={['#10B981', theme.primary]} style={styles.cameraBadge}>
                      <Ionicons name="camera" size={14} color="#FFF" />
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Labourer Account Setup</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Register your skillset to receive immediate field jobs</Text>
              </View>

              {/* Form Input fields */}
              <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Full Name *</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="Enter legal identity name" placeholderTextColor={theme.textMuted} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Name in Telugu</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="మీ పేరు తెలుగులో వ్రాయండి" placeholderTextColor={theme.textMuted} value={formData.teluguName} onChangeText={t => setFormData({...formData, teluguName: t})} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Contact Number *</Text>
                  <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="10-digit mobile number" placeholderTextColor={theme.textMuted} value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad" />
                </View>
                <View style={styles.row}>
                  <View style={[styles.halfInput, styles.inputGroup]}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Age</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="e.g. 28" placeholderTextColor={theme.textMuted} value={formData.age} onChangeText={t => setFormData({...formData, age: t})} keyboardType="numeric" />
                  </View>
                  <View style={[styles.halfInput, styles.inputGroup]}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Experience (Yrs)</Text>
                    <TextInput style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]} placeholder="e.g. 5" placeholderTextColor={theme.textMuted} value={formData.experience} onChangeText={t => setFormData({...formData, experience: t})} keyboardType="numeric" />
                  </View>
                </View>

                {/* Geo Coordinates settings */}
                <Text style={[styles.label, { color: theme.text, marginTop: 14 }]}>Coverage & GPS Telemetry *</Text>
                {gpsCoords ? (
                  <View style={[styles.locationSetContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                    <View style={styles.locationInfo}>
                      <Text style={[styles.locationSetText, { color: theme.text }]} numberOfLines={1}>{formData.location}</Text>
                      <Text style={[styles.locationSetRadius, { color: theme.primary }]}>Radius: {serviceRadius} km coverage</Text>
                    </View>
                    <TouchableOpacity style={[styles.viewMapBtn, { backgroundColor: theme.primary + '1C' }]} onPress={() => setShowMap(true)}>
                      <Text style={[styles.viewMapBtnText, { color: theme.primary }]}>Edit Area</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]} onPress={getCurrentLocation} disabled={gettingLocation}>
                    {gettingLocation ? <ActivityIndicator size="small" color={theme.primary} /> : (
                      <><MaterialIcons name="my-location" size={18} color={theme.primary} /><Text style={[styles.gpsBtnText, { color: theme.primary }]}>Map Coordinates & Coverage</Text></>
                    )}
                  </TouchableOpacity>
                )}

                {/* Skills tags selection */}
                <Text style={[styles.label, { color: theme.text, marginTop: 18 }]}>Crop Expertise Specialization *</Text>
                <Text style={[styles.hint, { color: theme.textSecondary }]}>Select crops you specialize in</Text>
                <View style={styles.chipGrid}>
                  {CROP_OPTIONS.map(crop => {
                    const selected = selectedSkills.includes(crop);
                    return (
                      <TouchableOpacity key={crop} style={[styles.chip, { backgroundColor: selected ? theme.primary + '18' : theme.inputBg, borderColor: selected ? theme.primary : theme.border }]} onPress={() => toggleSkill(crop)}>
                        <Text style={[styles.chipText, { color: selected ? theme.primary : theme.textSecondary }]}>{crop}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {/* Submit button */}
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={saveProfile} disabled={loading} activeOpacity={0.9}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Verify Partner Profile</Text>}
                </TouchableOpacity>
              </View>
              <View style={{ height: 40 }} />
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.appBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBackNavigation} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.appBarTitle, { color: theme.text }]}>Partner Console</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* Profile details card */}
          <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.profileRow}>
              {profileImage ? <Image source={{ uri: profileImage }} style={styles.profileImg} /> : (
                <LinearGradient colors={[theme.primary, '#10B981']} style={styles.profileImgPlaceholder}>
                  <Text style={{ color: '#FFF', fontSize: 24, fontWeight: '700' }}>{user?.profile?.name?.charAt(0)?.toUpperCase() || 'L'}</Text>
                </LinearGradient>
              )}
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>{user?.profile?.name || 'Agri Partner'}</Text>
                <Text style={[styles.profileLocation, { color: theme.textSecondary }]}>{formData.location || 'Location Not Set'} • {serviceRadius} km coverage</Text>
                <View style={[styles.badge, { backgroundColor: theme.primary + '14' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.badgeText, { color: theme.primary }]}>VERIFIED LABOUR PARTNER</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Toggle Availability */}
          <View style={[styles.toggleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: theme.text }]}>Accepting Opportunities</Text>
              <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>{isAvailable ? 'Visible to hiring farmers' : 'Currently off-duty'}</Text>
            </View>
            <Switch value={isAvailable} onValueChange={handleToggleAvailability} trackColor={{ false: theme.border, true: theme.primary + '40' }} thumbColor={isAvailable ? theme.primary : '#94A3B8'} />
          </View>

          {/* Core Analytics metric cards */}
          <View style={styles.statsRow}>
            <StatsCard value={stats.activeJobs} label="Active" iconName="pending-actions" color={theme.primary} index={0} theme={theme} />
            <StatsCard value={stats.completedJobs} label="Done" iconName="check-circle" color="#10B981" index={1} theme={theme} />
            <StatsCard value={stats.rating ? stats.rating.toFixed(1) : '5.0'} label="Rating" iconName="star" color="#F59E0B" index={2} theme={theme} />
          </View>

          {/* Skill Tag groups */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.dashTitle, { color: theme.text }]}>Selected Crop Specialties</Text>
            <TouchableOpacity onPress={() => setProfileComplete(false)}>
              <Text style={[styles.editLink, { color: theme.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.skillsGrid}>
            {selectedSkills.map(skill => (
              <View key={skill} style={[styles.skillTag, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.skillText, { color: theme.text }]}>{skill}</Text>
              </View>
            ))}
          </View>

          {/* Recent contracts bookings list */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.dashTitle, { color: theme.text }]}>Recent Field Bookings</Text>
          </View>
          {myJobs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.primary + '0B' }]}>
                <Ionicons name="documents-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Bookings Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Assigned bookings and dispatch records will be displayed here.</Text>
            </View>
          ) : (myJobs.slice(0, 5).map((job, i) => <JobCard key={job._id} job={job} index={i} theme={theme} />))}
          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullScreenContainer: { flex: 1 },
  fullScreenMap: { flex: 1 },
  mapLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  mapFloatingHeader: { position: 'absolute', top: 16, left: 16, zIndex: 2000 },
  mapCloseButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingRight: 16, paddingLeft: 8, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  mapCloseText: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  
  /* Upgraded Radius Panel Styling */
  radiusPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 34, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  radiusPanelLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  radiusInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  radiusTextInput: { fontSize: 44, fontWeight: '800', textAlign: 'center', borderBottomWidth: 2, paddingVertical: 2, paddingHorizontal: 16, minWidth: 90 },
  radiusUnitLabel: { fontSize: 20, fontWeight: '700', marginLeft: 6, alignSelf: 'flex-end', marginBottom: 8 },
  
  /* Presets Matrix */
  presetContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8, marginVertical: 16 },
  presetPill: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  presetLabel: { fontSize: 13, fontWeight: '800' },
  presetDesc: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  confirmBtn: { paddingVertical: 15, borderRadius: 16, width: '100%', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: STATUS_BAR_HEIGHT + 6, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  appBarTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  avatarSection: { alignItems: 'center', marginVertical: 16 },
  avatarWrapper: { position: 'relative' },
  avatarImage: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#FFF' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#FFF' },
  cameraBadge: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 14, letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  formCard: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 24 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 46, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  locationSetContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 12 },
  locationInfo: { flex: 1, paddingRight: 8 },
  locationSetText: { fontSize: 13, fontWeight: '700' },
  locationSetRadius: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  viewMapBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  viewMapBtnText: { fontSize: 12, fontWeight: '800' },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginBottom: 12 },
  gpsBtnText: { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  hint: { fontSize: 12, marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '700' },
  submitBtn: { borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  profileCard: { borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileImg: { width: 56, height: 56, borderRadius: 28 },
  profileImgPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { marginLeft: 14, flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  profileLocation: { fontSize: 12, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  toggleCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  toggleTitle: { fontSize: 14, fontWeight: '800' },
  toggleSubtitle: { fontSize: 11, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statsCard: { flex: 1, borderRadius: 20, padding: 14, alignItems: 'center', borderWidth: 1 },
  statsIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statsValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statsLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dashTitle: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  editLink: { fontSize: 13, fontWeight: '700' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  skillTag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  skillText: { fontSize: 12, fontWeight: '700' },
  emptyCard: { borderRadius: 24, paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  emptySubtitle: { fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 16, lineHeight: 16 },
  jobCard: { borderRadius: 20, padding: 12, marginBottom: 10, borderWidth: 1 },
  jobRow: { flexDirection: 'row', alignItems: 'center' },
  jobIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  jobInfo: { flex: 1, marginLeft: 10 },
  jobTitle: { fontSize: 13, fontWeight: '800' },
  jobDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  jobDate: { fontSize: 11 },
  jobStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  jobStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
});