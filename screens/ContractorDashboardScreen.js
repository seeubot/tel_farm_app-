import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert,
  Platform, StatusBar, Animated, Easing, Text, Dimensions, Switch, 
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTheme } from '../utils/theme';
import { authAPI } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const CROP_OPTIONS = [
  'Paddy', 'Cotton', 'Sugarcane', 'Chilli', 'Maize',
  'Groundnut', 'Tobacco', 'Turmeric', 'Mango', 'Banana',
  'Red Gram', 'Black Gram', 'Vegetables'
];

const TEAM_SIZE_OPTIONS = ['1-5', '6-10', '11-20', '21-50', '50+'];

// ==================== STATS CARD ====================
const StatsCard = ({ value, label, iconText, color, theme, index }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      tension: 40,
      delay: 150 + index * 100,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.statsCardContainer, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.iconWrapper, { backgroundColor: color + '15' }]}>
          <Text style={[styles.statsIcon, { color }]}>{iconText}</Text>
        </View>
        <Text style={[styles.statsValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
    </Animated.View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function ContractorDashboardScreen({ navigation }) {
  const { isDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [user, setUser] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    location: '',
    gstNumber: '',
  });
  const [teamSize, setTeamSize] = useState('');
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [stats, setStats] = useState({ teamSize: '', completedJobs: 0, rating: 0 });

  const theme = {
    bg: isDarkTheme ? '#0B0F19' : '#F8FAFC',
    surface: isDarkTheme ? '#1E293B' : '#FFFFFF',
    surfaceSecondary: isDarkTheme ? '#131C2E' : '#F1F5F9',
    text: isDarkTheme ? '#F8FAFC' : '#0F172A',
    textSecondary: isDarkTheme ? '#94A3B8' : '#64748B',
    border: isDarkTheme ? '#334155' : '#E2E8F0',
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    inputBg: isDarkTheme ? '#0F172A' : '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
  };

  useEffect(() => {
    checkProfileFromBackend();
  }, []);

  const handleBackNavigation = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  const checkProfileFromBackend = async () => {
    setInitialLoading(true);
    try {
      const response = await authAPI.getMe();
      if (response.success && response.user) {
        const backendUser = response.user;
        setUser(backendUser);
        
        const hasContractorRole = backendUser.roles?.includes('contractor');
        const hasCompany = backendUser.contractorDetails?.companyName;
        const hasCrops = backendUser.contractorDetails?.crops?.length > 0;
        
        if (hasContractorRole && hasCompany && hasCrops) {
          setProfileComplete(true);
          setFormData({
            companyName: backendUser.contractorDetails?.companyName || '',
            contactPerson: backendUser.profile?.name || '',
            phone: backendUser.profile?.phone || '',
            location: backendUser.profile?.location?.address || '',
            gstNumber: backendUser.contractorDetails?.gstNumber || '',
          });
          setTeamSize(backendUser.contractorDetails?.teamSize || '');
          setSelectedCrops(backendUser.contractorDetails?.crops || []);
          setIsActive(backendUser.contractorDetails?.isActive ?? true);
          setProfileImage(backendUser.profile?.profileImage);
          
          if (backendUser.profile?.location?.lat) {
            setGpsCoords({ lat: backendUser.profile.location.lat, lng: backendUser.profile.location.lng });
          }
          
          await AsyncStorage.setItem('user', JSON.stringify(backendUser));
          setStats({
            teamSize: backendUser.contractorDetails?.teamSize || 'N/A',
            completedJobs: 0,
            rating: backendUser.ratings?.average || 0,
          });
        } else {
          setProfileComplete(false);
          setFormData(prev => ({
            ...prev,
            phone: backendUser.profile?.phone || '',
          }));
        }
      }
    } catch (error) {
      await loadLocalData();
    } finally {
      setInitialLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
  };

  const loadLocalData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        if (userData.contractorDetails?.companyName && userData.roles?.includes('contractor')) {
          setProfileComplete(true);
          setFormData({
            companyName: userData.contractorDetails?.companyName || '',
            contactPerson: userData.profile?.name || '',
            phone: userData.profile?.phone || '',
            location: userData.profile?.location?.address || '',
            gstNumber: userData.contractorDetails?.gstNumber || '',
          });
          setTeamSize(userData.contractorDetails?.teamSize || '');
          setSelectedCrops(userData.contractorDetails?.crops || []);
          setIsActive(userData.contractorDetails?.isActive ?? true);
          setProfileImage(userData.profile?.profileImage);
          if (userData.profile?.location?.lat) {
            setGpsCoords({ lat: userData.profile.location.lat, lng: userData.profile.location.lng });
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkProfileFromBackend();
    setRefreshing(false);
  };

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
      if (status !== 'granted') { Alert.alert('Permission Denied'); return; }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };
      setGpsCoords(coords);
      const geocode = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
      if (geocode[0]) {
        const addr = geocode[0];
        setFormData(prev => ({ ...prev, location: `${addr.city || addr.name || ''}, ${addr.region || ''}` }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get GPS location');
    } finally {
      setGettingLocation(false);
    }
  };

  const toggleCrop = (crop) => {
    setSelectedCrops(prev => prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]);
  };

  const saveProfile = async () => {
    if (!formData.companyName || !formData.phone) { Alert.alert('Error', 'Please fill company name and phone number'); return; }
    if (!teamSize || selectedCrops.length === 0) { Alert.alert('Error', 'Please select team size and at least one crop'); return; }
    if (!gpsCoords) { Alert.alert('GPS Required', 'Please set your GPS location.'); return; }

    setLoading(true);
    try {
      await authAPI.updateRole('contractor');
      const profileData = {
        name: formData.contactPerson,
        phone: formData.phone,
        profileImage: profileImage,
        location: { lat: gpsCoords.lat, lng: gpsCoords.lng, address: formData.location, village: formData.location },
        contractorDetails: { companyName: formData.companyName, gstNumber: formData.gstNumber, teamSize: teamSize, crops: selectedCrops, isActive: isActive },
      };
      await authAPI.updateProfile(profileData);
      setProfileComplete(true);
      await checkProfileFromBackend();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    const nextState = !isActive;
    setIsActive(nextState);
    try {
      await authAPI.updateProfile({ contractorDetails: { ...user?.contractorDetails, isActive: nextState, crops: selectedCrops, teamSize } });
      await checkProfileFromBackend();
    } catch (error) {
      setIsActive(!nextState);
      Alert.alert('Error', 'Failed to update availability status');
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Setting up your desk...</Text>
      </View>
    );
  }

  // ==================== PROFILE SETUP VIEW ====================
  if (!profileComplete) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        
        <View style={[styles.appBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleBackNavigation} style={styles.backBtn} hitSlop={{top: 10, left: 10, right: 10, bottom: 10}}>
            <Text style={[styles.backText, { color: theme.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: theme.text }]}>Business Registration</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={styles.avatarWrapper}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
                    <Text style={[styles.avatarText, { color: theme.primary }]}>
                      {formData.companyName?.charAt(0)?.toUpperCase() || 'C'}
                    </Text>
                  </View>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.cameraBadgeText}>+</Text>
                </View>
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Register Your Enterprise</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>Connect with fields and receive bulk farming contracts</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.formSectionHeader}>
                <Text style={[styles.formSectionTitle, { color: theme.textSecondary }]}>IDENTITY VERIFICATION</Text>
              </View>
              
              <TextInput mode="outlined" label="Company / Group Name *" value={formData.companyName} onChangeText={t => setFormData({...formData, companyName: t})} style={styles.input} outlineColor={theme.border} activeOutlineColor={theme.primary} placeholderTextColor={theme.textSecondary} theme={{ colors: { text: theme.text, onSurfaceVariant: theme.textSecondary, background: theme.inputBg } }} textColor={theme.text} />
              <TextInput mode="outlined" label="Contact Person Name *" value={formData.contactPerson} onChangeText={t => setFormData({...formData, contactPerson: t})} style={styles.input} outlineColor={theme.border} activeOutlineColor={theme.primary} theme={{ colors: { text: theme.text, onSurfaceVariant: theme.textSecondary, background: theme.inputBg } }} textColor={theme.text} />
              <TextInput mode="outlined" label="Phone Number *" value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} keyboardType="phone-pad" style={styles.input} outlineColor={theme.border} activeOutlineColor={theme.primary} theme={{ colors: { text: theme.text, onSurfaceVariant: theme.textSecondary, background: theme.inputBg } }} textColor={theme.text} />
              <TextInput mode="outlined" label="GST Number (Optional)" value={formData.gstNumber} onChangeText={t => setFormData({...formData, gstNumber: t})} autoCapitalize="characters" style={styles.input} outlineColor={theme.border} activeOutlineColor={theme.primary} theme={{ colors: { text: theme.text, onSurfaceVariant: theme.textSecondary, background: theme.inputBg } }} textColor={theme.text} />

              <View style={styles.formSectionHeader}>
                <Text style={[styles.formSectionTitle, { color: theme.textSecondary }]}>METRICS & REGIONAL COVERAGE</Text>
              </View>

              <TouchableOpacity 
                style={[
                  styles.gpsBtn, 
                  { 
                    backgroundColor: gpsCoords ? theme.success + '10' : theme.warning + '10', 
                    borderColor: gpsCoords ? theme.success : theme.warning 
                  }
                ]} 
                onPress={getCurrentLocation} 
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 6 }} />
                ) : (
                  <View style={[styles.badgeDot, { backgroundColor: gpsCoords ? theme.success : theme.warning, marginRight: 6 }]} />
                )}
                <Text style={[styles.gpsBtnText, { color: gpsCoords ? theme.success : theme.warning }]}>
                  {gpsCoords ? 'GPS Hardware Position Locked [ READY ]' : 'Secure GPS Location Coordinates [ UNSET ]'}
                </Text>
              </TouchableOpacity>

              <TextInput mode="outlined" label="Service Location Area" value={formData.location} onChangeText={t => setFormData({...formData, location: t})} style={styles.input} outlineColor={theme.border} activeOutlineColor={theme.primary} theme={{ colors: { text: theme.text, onSurfaceVariant: theme.textSecondary, background: theme.inputBg } }} textColor={theme.text} />

              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Workforce Capacity *</Text>
              <View style={styles.teamSizeRow}>
                {TEAM_SIZE_OPTIONS.map(size => {
                  const isSelected = teamSize === size;
                  return (
                    <TouchableOpacity 
                      key={size} 
                      style={[
                        styles.sizeBtn, 
                        { 
                          backgroundColor: isSelected ? theme.primary : theme.surfaceSecondary, 
                          borderColor: isSelected ? theme.primary : theme.border 
                        }
                      ]} 
                      onPress={() => setTeamSize(size)}
                    >
                      <Text style={[styles.sizeBtnText, { color: isSelected ? '#FFFFFF' : theme.textSecondary }]}>{size} members</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Crop Domains *</Text>
              <View style={styles.chipGrid}>
                {CROP_OPTIONS.map(crop => {
                  const selected = selectedCrops.includes(crop);
                  return (
                    <TouchableOpacity 
                      key={crop} 
                      style={[
                        styles.chip, 
                        { 
                          backgroundColor: selected ? theme.primary + '15' : theme.surfaceSecondary, 
                          borderColor: selected ? theme.primary : theme.border 
                        }
                      ]} 
                      onPress={() => toggleCrop(crop)}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.primary : theme.textSecondary, fontWeight: selected ? '700' : '500' }]}>
                        {crop}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }]} onPress={saveProfile} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Initialize System Dashboard</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ==================== MAIN DASHBOARD ====================
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <View style={[styles.appBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBackNavigation} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.primary }]}>Leave</Text>
        </TouchableOpacity>
        <Text style={[styles.appBarTitle, { color: theme.text }]}>Management Terminal</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.profileRow}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImg} />
              ) : (
                <View style={[styles.profileImgPlaceholder, { backgroundColor: theme.primary + '10' }]}>
                  <Text style={{ color: theme.primary, fontSize: 24, fontWeight: '800' }}>C</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: theme.text }]}>{formData.companyName || 'Enterprise Partner'}</Text>
                <Text style={[styles.profileLocation, { color: theme.textSecondary }]}>Location: {formData.location || 'Terminal GPS Unset'}</Text>
                <View style={[styles.badge, { backgroundColor: theme.success + '15' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: theme.success }]} />
                  <Text style={[styles.badgeText, { color: theme.success }]}>Verified Contractor Core</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.toggleCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: theme.text }]}>Operational Status</Text>
              <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>
                {isActive ? 'Visible to public marketplace contracts' : 'Terminal hidden from incoming offers'}
              </Text>
            </View>
            <Switch 
              value={isActive} 
              onValueChange={handleToggleActive} 
              trackColor={{ false: theme.border, true: theme.primary + '50' }} 
              thumbColor={isActive ? theme.primary : '#9CA3AF'} 
            />
          </View>

          <View style={styles.statsRow}>
            <StatsCard value={teamSize || 'N/A'} label="Total Force" iconText="TEAM" color={theme.primary} theme={theme} index={0} />
            <StatsCard value={stats.completedJobs} label="Closed Deals" iconText="DONE" color={theme.success} theme={theme} index={1} />
            <StatsCard value={stats.rating ? stats.rating.toFixed(1) : '5.0'} label="Platform Merit" iconText="RATE" color={theme.warning} theme={theme} index={2} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.dashTitle, { color: theme.text }]}>Assigned Specializations</Text>
            <TouchableOpacity onPress={() => setProfileComplete(false)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={[styles.editLink, { color: theme.primary }]}>Configure</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.skillsGrid}>
            {selectedCrops.map(crop => (
              <View key={crop} style={[styles.skillTag, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.skillText, { color: theme.text }]}>{crop}</Text>
              </View>
            ))}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ==================== DESIGN SYSTEM STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, fontSize: 14, fontWeight: '600', letterSpacing: 0.2 },
  appBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: STATUS_BAR_HEIGHT + 10, 
    paddingBottom: 16, 
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 2 }
    })
  },
  backBtn: { minWidth: 60, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: '700' },
  appBarTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarWrapper: { position: 'relative', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#FFFFFF' },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  avatarText: { fontSize: 32, fontWeight: '800' },
  cameraBadge: { position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  cameraBadgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginTop: 16, letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
  card: { borderRadius: 24, padding: 20, borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16 }, android: { elevation: 3 } }) },
  formSectionHeader: { width: '100%', marginTop: 10, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.15)', paddingBottom: 6 },
  formSectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  input: { marginBottom: 16, height: 54, fontSize: 14 },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16, paddingHorizontal: 10 },
  gpsBtnText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  label: { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
  teamSizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  sizeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  sizeBtnText: { fontSize: 13, fontWeight: '700' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 13 },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  profileCard: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12 }, android: { elevation: 2 } }) },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileImg: { width: 64, height: 64, borderRadius: 32 },
  profileImgPlaceholder: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  profileLocation: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start', marginTop: 10, gap: 6 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  toggleCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 14 },
  toggleTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  toggleSubtitle: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statsCardContainer: { flex: 1 },
  statsCard: { borderRadius: 20, padding: 14, alignItems: 'center', borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10 }, android: { elevation: 2 } }) },
  iconWrapper: { width: 44, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statsIcon: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  statsValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  statsLabel: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  dashTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  editLink: { fontSize: 14, fontWeight: '800' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  skillTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  skillText: { fontSize: 13, fontWeight: '700' },
});