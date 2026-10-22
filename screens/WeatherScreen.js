import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../utils/theme';
import { API_BASE_URL } from '../utils/api';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

// --- Helper Functions (Logic Kept Intact) ---
const getWeatherIcon = (weatherCode, isNight = false) => {
  const code = parseInt(weatherCode);
  if (code === 0) return isNight ? 'weather-night' : 'weather-sunny';
  if (code <= 2) return isNight ? 'weather-night-partly-cloudy' : 'weather-partly-cloudy';
  if (code === 3) return 'weather-cloudy';
  if (code >= 45 && code <= 48) return 'weather-fog';
  if (code >= 51 && code <= 55) return 'weather-rainy';
  if (code >= 61 && code <= 65) return 'weather-pouring';
  if (code >= 71 && code <= 75) return 'weather-snowy';
  if (code >= 80 && code <= 82) return 'weather-pouring';
  if (code >= 95) return 'weather-lightning-rainy';
  return 'weather-cloudy';
};

const getWeatherGradient = (weatherCode, isNight = false) => {
  const code = parseInt(weatherCode);
  if (code === 0 || code === 1) {
    return isNight 
      ? ['#090D16', '#111827', '#1E1B4B']  
      : ['#0284C7', '#38BDF8', '#7DD3FC'];  
  }
  if (code <= 3) {
    return isNight
      ? ['#0F172A', '#1E293B', '#334155']  
      : ['#334155', '#475569', '#64748B'];  
  }
  if (code >= 45 && code <= 48) {
    return ['#1E293B', '#334155', '#475569'];
  }
  if (code >= 51 && code <= 65) {
    return ['#0F172A', '#1E3A8A', '#2563EB'];
  }
  if (code >= 80 && code <= 82) {
    return ['#0B132B', '#1C2541', '#3A506B'];
  }
  if (code >= 71 && code <= 77) {
    return ['#1E293B', '#475569', '#94A3B8'];
  }
  if (code >= 95) {
    return ['#18181B', '#27272A', '#581C87'];
  }
  return ['#0F172A', '#1E293B', '#38BDF8'];
};

const getWeatherStatus = (weatherCode) => {
  const code = parseInt(weatherCode);
  if (code === 0) return { text: 'Clear Sky', color: '#38BDF8' };
  if (code <= 2) return { text: 'Partly Cloudy', color: '#CBD5E1' };
  if (code === 3) return { text: 'Overcast', color: '#94A3B8' };
  if (code >= 45 && code <= 48) return { text: 'Foggy', color: '#CBD5E1' };
  if (code >= 51 && code <= 55) return { text: 'Light Rain', color: '#38BDF8' };
  if (code >= 61 && code <= 65) return { text: 'Rain', color: '#60A5FA' };
  if (code >= 71 && code <= 77) return { text: 'Snow', color: '#F1F5F9' };
  if (code >= 80 && code <= 82) return { text: 'Heavy Rain', color: '#3B82F6' };
  if (code >= 95) return { text: 'Thunderstorm', color: '#C084FC' };
  return { text: 'Variable', color: '#C084FC' };
};

// --- Custom Animated Components ---
const AnimatedWeatherIcon = ({ weatherCode, size = 110 }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 40,
      friction: 6,
      useNativeDriver: true,
    }).start();

    const rotate = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    rotate.start();
    float.start();

    return () => { rotate.stop(); float.stop(); };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const weatherIcon = getWeatherIcon(weatherCode);

  return (
    <Animated.View style={[styles.weatherIconContainer, { transform: [{ scale: scaleAnim }, { translateY: floatY }] }]}>
      <Animated.View style={{ transform: [{ rotate: weatherCode <= 1 ? spin : '0deg' }] }}>
        <MaterialCommunityIcons name={weatherIcon} size={size} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
};

const WeatherParticle = ({ type, delay, position, size, color }) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(animValue, {
          toValue: 1,
          duration: type === 'rain' ? 1000 : 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, height * 0.4],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: position.x,
          top: position.y,
          width: size,
          height: type === 'rain' ? size * 6 : size,
          borderRadius: size / 2,
          backgroundColor: color || 'rgba(255,255,255,0.4)',
          transform: [{ translateY }],
        },
      ]}
    />
  );
};

const CelestialBody = ({ type }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  return (
    <View style={styles.celestialBody}>
      <Animated.View
        style={[
          type === 'sun' ? styles.sunGlow : styles.moonGlow,
          { transform: [{ scale: glowScale }] },
        ]}
      />
      {type === 'sun' ? (
        <LinearGradient colors={['#FACE15', '#F97316']} style={styles.sunBody} />
      ) : (
        <View style={styles.moonBody} />
      )}
    </View>
  );
};

// --- Main Weather Screen ---
export default function WeatherScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [error, setError] = useState(null);
  const [isCelsius, setIsCelsius] = useState(true);
  
  const containerFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(20)).current;

  const currentHour = new Date().getHours();
  const isNight = currentHour >= 19 || currentHour < 6;

  const fetchWeather = async (lat, lng) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/weather?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      
      if (data.success) {
        setWeatherData(data);
        setError(null);
        
        Animated.parallel([
          Animated.timing(containerFade, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(contentSlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      } else {
        setError('Failed to fetch weather metrics');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getLocationAndWeather = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: location.coords.latitude, longitude: location.coords.longitude });

      if (geo?.[0]) {
        setLocationName(geo[0].city || geo[0].district || geo[0].region || 'Your Location');
      }
      fetchWeather(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      setError('Could not retrieve location.');
      setLoading(false);
    }
  };

  useEffect(() => { getLocationAndWeather(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await getLocationAndWeather();
  };

  const currentWeather = weatherData?.current;
  const dailyForecast = weatherData?.daily;
  const weatherCode = currentWeather?.weatherCode || 0;
  const gradientColors = getWeatherGradient(weatherCode, isNight);
  const weatherStatus = getWeatherStatus(weatherCode);

  const stableRainParticles = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      id: `rain-${i}`,
      delay: Math.random() * 1000,
      position: { x: Math.random() * width, y: Math.random() * (height * 0.2) },
      size: Math.random() * 1.5 + 1.2,
    }));
  }, [weatherCode]);

  const displayTemp = (celsiusVal) => {
    if (celsiusVal === undefined || celsiusVal === null) return '--';
    if (!isCelsius) {
      return Math.round((celsiusVal * 9) / 5 + 32);
    }
    return Math.round(celsiusVal);
  };

  const hourlyData = useMemo(() => {
    const hours = [];
    const currentHourNum = new Date().getHours();
    for (let i = 0; i < 6; i++) {
      const hr = (currentHourNum + i) % 24;
      const period = hr >= 12 ? 'PM' : 'AM';
      const displayHr = hr % 12 === 0 ? 12 : hr % 12;
      hours.push({
        time: i === 0 ? 'Now' : `${displayHr} ${period}`,
        temp: (currentWeather?.temperature || 25) + Math.round(Math.sin(i) * 2),
        icon: getWeatherIcon(weatherCode, hr >= 19 || hr < 6),
      });
    }
    return hours;
  }, [currentWeather, weatherCode]);

  if (loading) {
    return (
      <View style={styles.centerMode}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Fetching Weather...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerMode}>
        <MaterialCommunityIcons name="cloud-alert-outline" size={56} color="#F87171" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryAction} onPress={getLocationAndWeather}>
          <Text style={styles.retryActionText}>TRY AGAIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Atmospheric Particles */}
      {weatherCode <= 2 && (
        <View style={styles.celestialWrapper}>
          <CelestialBody type={isNight ? 'moon' : 'sun'} />
        </View>
      )}
      {weatherCode >= 51 && weatherCode <= 65 && stableRainParticles.map(p => (
        <WeatherParticle key={p.id} type="rain" delay={p.delay} position={p.position} size={p.size} color="rgba(255,255,255,0.3)" />
      ))}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: containerFade, transform: [{ translateY: contentSlide }] }}>
          
          {/* Header Navigation */}
          <View style={styles.navbar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navAction}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.locationHeader}>
              <Text style={styles.locationCity}>{locationName}</Text>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: weatherStatus.color }]} />
                <Text style={styles.statusPillText}>{weatherStatus.text}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={() => setIsCelsius(!isCelsius)} style={styles.unitToggle}>
              <Text style={styles.unitToggleText}>{isCelsius ? '°F' : '°C'}</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Temperature View */}
          <View style={styles.heroCore}>
            <AnimatedWeatherIcon weatherCode={weatherCode} size={100} />
            <Text style={styles.mainTemp}>{displayTemp(currentWeather?.temperature)}°</Text>
            <Text style={styles.conditionText}>{currentWeather?.weather?.description}</Text>
            
            <View style={styles.rangeRow}>
              <Text style={styles.rangeText}>H: {displayTemp(dailyForecast?.[0]?.temperatureMax)}°</Text>
              <Text style={styles.rangeDivider}>•</Text>
              <Text style={styles.rangeText}>L: {displayTemp(dailyForecast?.[0]?.temperatureMin)}°</Text>
            </View>
          </View>

          {/* Glass Metrics Grid */}
          <View style={styles.glassCard}>
            <View style={styles.metricNode}>
              <MaterialCommunityIcons name="water-outline" size={22} color="#7DD3FC" />
              <Text style={styles.metricValue}>{currentWeather?.humidity}%</Text>
              <Text style={styles.metricLabel}>Humidity</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.metricNode}>
              <MaterialCommunityIcons name="weather-windy" size={22} color="#4ADE80" />
              <Text style={styles.metricValue}>{currentWeather?.windSpeed} <Text style={styles.unitText}>km/h</Text></Text>
              <Text style={styles.metricLabel}>Wind</Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.metricNode}>
              <MaterialCommunityIcons name="white-balance-sunny" size={22} color="#FACC15" />
              <Text style={styles.metricValue}>{dailyForecast?.[0]?.uvIndex || 0}</Text>
              <Text style={styles.metricLabel}>UV Index</Text>
            </View>
          </View>

          {/* Hourly Forecast */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Hourly Forecast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyList}>
              {hourlyData.map((hour, idx) => (
                <View key={`hr-${idx}`} style={[styles.hourlyCard, idx === 0 && styles.activeHourlyCard]}>
                  <Text style={styles.hourlyTime}>{hour.time}</Text>
                  <MaterialCommunityIcons name={hour.icon} size={24} color="#FFFFFF" style={{ marginVertical: 8 }} />
                  <Text style={styles.hourlyTemp}>{displayTemp(hour.temp)}°</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Sun Tracker */}
          <View style={styles.sectionBlock}>
            <View style={styles.glassCard}>
              <View style={styles.sunEndpoint}>
                <MaterialCommunityIcons name="weather-sunset-up" size={22} color="#FB923C" />
                <Text style={styles.sunTime}>{dailyForecast?.[0]?.sunrise || '--:--'}</Text>
                <Text style={styles.sunLabel}>Sunrise</Text>
              </View>
              <View style={styles.sunTrack}>
                <View style={styles.sunLine} />
                <View style={styles.sunPoint} />
              </View>
              <View style={styles.sunEndpoint}>
                <MaterialCommunityIcons name="weather-sunset-down" size={22} color="#F87171" />
                <Text style={styles.sunTime}>{dailyForecast?.[0]?.sunset || '--:--'}</Text>
                <Text style={styles.sunLabel}>Sunset</Text>
              </View>
            </View>
          </View>

          {/* 5-Day Forecast */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>5-Day Forecast</Text>
            <View style={styles.glassCardColumn}>
              {dailyForecast?.slice(1, 6).map((day, index) => {
                const dayStatus = getWeatherStatus(day.weatherCode);
                return (
                  <View key={day.date} style={styles.forecastRow}>
                    <Text style={styles.forecastDay}>{index === 0 ? 'Tomorrow' : day.dayName}</Text>
                    <View style={styles.forecastIconWrapper}>
                      <MaterialCommunityIcons name={getWeatherIcon(day.weatherCode)} size={22} color="#FFFFFF" />
                      <Text style={styles.forecastCondition}>{day.weather?.description}</Text>
                    </View>
                    <View style={styles.forecastTemps}>
                      <Text style={styles.highTemp}>{displayTemp(day.temperatureMax)}°</Text>
                      <Text style={styles.lowTemp}>{displayTemp(day.temperatureMin)}°</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Smart Insights */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Advisory</Text>
            <View style={styles.glassCardColumn}>
              <View style={styles.advisoryRow}>
                <MaterialCommunityIcons name="information-outline" size={20} color="#38BDF8" style={{ marginRight: 8 }} />
                <Text style={styles.advisoryTitle}>
                  {currentWeather?.rain > 0 ? 'Hydration Alert' : currentWeather?.temperature > 35 ? 'Thermal Advisory' : 'Conditions Optimal'}
                </Text>
              </View>
              <Text style={styles.advisoryBody}>
                {currentWeather?.rain > 0 
                  ? 'Rain detected. Pause open-field soil applications and safeguard open yields.'
                  : currentWeather?.temperature > 35 
                  ? 'High temperatures recorded. Ensure regular irrigation cycles during non-peak hours.' 
                  : 'Favorable atmospheric conditions present. Good window for standard operations.'}
              </Text>
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// --- Visual Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  centerMode: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#F87171',
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
  retryAction: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  retryActionText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
  },

  // Navbar
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitToggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  locationHeader: {
    alignItems: 'center',
  },
  locationCity: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusPillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },

  // Hero Area
  heroCore: {
    alignItems: 'center',
    marginVertical: 10,
  },
  weatherIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 110,
  },
  mainTemp: {
    fontSize: 88,
    fontWeight: '200',
    color: '#FFFFFF',
    marginVertical: -8,
  },
  conditionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#F1F5F9',
    textTransform: 'capitalize',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  rangeText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  rangeDivider: {
    color: '#E2E8F0',
    marginHorizontal: 8,
  },

  // Glassmorphic Cards
  glassCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  glassCardColumn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  metricNode: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '400',
  },
  metricLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  cardDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Sections
  sectionBlock: {
    marginTop: 12,
  },
  sectionHeader: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Hourly List
  hourlyList: {
    paddingVertical: 4,
  },
  hourlyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 68,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeHourlyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hourlyTime: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
  },
  hourlyTemp: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Sun Track
  sunEndpoint: {
    alignItems: 'center',
    width: 70,
  },
  sunTime: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  sunLabel: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  sunTrack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  sunLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  sunPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  // Forecast Rows
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  forecastDay: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    width: 80,
  },
  forecastIconWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forecastCondition: {
    color: '#CBD5E1',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  forecastTemps: {
    flexDirection: 'row',
    gap: 12,
  },
  highTemp: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },
  lowTemp: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '400',
    width: 28,
    textAlign: 'right',
  },

  // Advisories
  advisoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  advisoryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  advisoryBody: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },

  // Particles & Celestials
  celestialWrapper: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 40,
    right: 20,
  },
  celestialBody: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunBody: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sunGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(250, 206, 21, 0.25)',
  },
  moonBody: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  moonGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(241, 245, 249, 0.2)',
  },
  particle: {
    position: 'absolute',
  },
});