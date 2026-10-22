import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  TouchableOpacity,
  ImageBackground,
  Linking,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { API_BASE_URL } from '../utils/api';

// ─── Weather icon with per-condition animations ───────────────────────────────

function WeatherIcon({ weatherMain, isNight, size = 80 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0.5)).current;
  const rainAnim  = useRef(new Animated.Value(-8)).current;

  const condition = weatherMain?.toLowerCase() || '';
  const isRain      = condition.includes('rain') || condition.includes('drizzle');
  const isThunder   = condition.includes('thunder');
  const isClear     = condition.includes('clear') || condition.includes('sun') || condition.includes('mainly clear');
  const isCloud     = condition.includes('cloud') || condition.includes('overcast') || condition.includes('partly');
  const isSnow      = condition.includes('snow');
  const isFog       = condition.includes('fog') || condition.includes('mist');

  // Floating loop (icon body)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Lightning flash loop
  useEffect(() => {
    if (!isThunder) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0.3, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
        Animated.delay(1600),
      ])
    ).start();
  }, [isThunder]);

  // Rain drop loop
  useEffect(() => {
    if (!isRain) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(rainAnim, { toValue: 14,  duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(rainAnim, { toValue: -8,  duration: 0,   useNativeDriver: true }),
      ])
    ).start();
  }, [isRain]);

  const iconName = (() => {
    if (isThunder) return 'weather-lightning';
    if (isRain)    return 'weather-rainy';
    if (isSnow)    return 'weather-snowy';
    if (isFog)     return 'weather-fog';
    if (isCloud)   return isNight ? 'weather-night-partly-cloudy' : 'weather-partly-cloudy';
    return isNight ? 'weather-night' : 'weather-sunny';
  })();

  const iconColor = (() => {
    if (isThunder) return '#A78BFA';
    if (isRain)    return '#60A5FA';
    if (isSnow)    return '#BAE6FD';
    if (isFog)     return '#9CA3AF';
    if (isCloud)   return '#93C5FD';
    return '#FBBF24';
  })();

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      {isThunder ? (
        <Animated.View style={{ opacity: flashAnim }}>
          <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
        </Animated.View>
      ) : isRain ? (
        <View>
          <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
        </View>
      ) : (
        <MaterialCommunityIcons name={iconName} size={size} color={iconColor} />
      )}
    </Animated.View>
  );
}

// ─── Main WeatherCard ─────────────────────────────────────────────────────────

export default function WeatherCard({ locationName = 'TELANGANA', activePremiumAd = null }) {
  const { colors, isDarkTheme } = useTheme();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  const [weatherData, setWeatherData]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);
  const [coordinates, setCoordinates]   = useState({ lat: 17.385, lon: 78.4867 });
  const [locationInfo, setLocationInfo] = useState({ city: locationName, country: 'IN' });

  // ── entrance animation whenever data arrives ──
  useEffect(() => {
    if (!weatherData) return;
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.96);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 9, tension: 45, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [weatherData]);

  // ── IP geolocation ──
  const getLocationByIP = async () => {
    try {
      const res  = await fetch('http://ip-api.com/json/?fields=city,countryCode,lat,lon');
      const data = await res.json();
      if (data.lat && data.lon) {
        setCoordinates({ lat: data.lat, lon: data.lon });
        setLocationInfo({ city: data.city || locationName, country: data.countryCode || 'IN' });
        return { lat: data.lat, lon: data.lon };
      }
      throw new Error('no coords');
    } catch {
      return { lat: 17.385, lon: 78.4867 };
    }
  };

  // ── WMO code → description ──
  const getWeatherInfoFromCode = (code) => {
    const map = {
      0:  { main: 'Clear',         description: 'clear sky'             },
      1:  { main: 'Mainly Clear',  description: 'mainly clear'          },
      2:  { main: 'Partly Cloudy', description: 'partly cloudy'         },
      3:  { main: 'Overcast',      description: 'overcast'              },
      45: { main: 'Fog',           description: 'foggy'                 },
      48: { main: 'Fog',           description: 'rime fog'              },
      51: { main: 'Drizzle',       description: 'light drizzle'         },
      53: { main: 'Drizzle',       description: 'moderate drizzle'      },
      55: { main: 'Drizzle',       description: 'dense drizzle'         },
      61: { main: 'Rain',          description: 'slight rain'           },
      63: { main: 'Rain',          description: 'moderate rain'         },
      65: { main: 'Rain',          description: 'heavy rain'            },
      71: { main: 'Snow',          description: 'light snow'            },
      73: { main: 'Snow',          description: 'moderate snow'         },
      75: { main: 'Snow',          description: 'heavy snow'            },
      80: { main: 'Rain Showers',  description: 'rain showers'          },
      81: { main: 'Rain Showers',  description: 'moderate rain showers' },
      82: { main: 'Rain Showers',  description: 'violent rain showers'  },
      95: { main: 'Thunderstorm',  description: 'thunderstorm'          },
      96: { main: 'Thunderstorm',  description: 'thunderstorm + hail'   },
      99: { main: 'Thunderstorm',  description: 'heavy thunderstorm'    },
    };
    return map[code] || { main: 'Cloudy', description: 'cloudy' };
  };

  // ── fetch weather ──
  const fetchWeatherData = async (lat, lon) => {
    try {
      const res  = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`
      );
      if (!res.ok) throw new Error('meteo fail');
      const data        = await res.json();
      const weatherInfo = getWeatherInfoFromCode(data.current.weather_code);

      // reverse geocode
      let cityName = locationInfo.city;
      try {
        const geo     = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`);
        const geoData = await geo.json();
        if (geoData.address) {
          cityName = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.county || locationName;
          setLocationInfo(prev => ({ ...prev, city: cityName }));
        }
      } catch { /* keep previous city */ }

      setWeatherData({
        temp:        Math.round(data.current.temperature_2m),
        feelsLike:   Math.round(data.current.apparent_temperature),
        weatherMain: weatherInfo.main,
        weatherDesc: weatherInfo.description,
        city:        cityName,
        country:     locationInfo.country,
        lat, lon,
      });
      setError(null);
    } catch {
      // OWM fallback
      try {
        const owm = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=9de243494c0b295cca9337e1e96b00e2`
        );
        if (owm.ok) {
          const d = await owm.json();
          setWeatherData({
            temp:        Math.round(d.main.temp),
            feelsLike:   Math.round(d.main.feels_like),
            weatherMain: d.weather[0].main,
            weatherDesc: d.weather[0].description,
            city:        d.name || locationInfo.city,
            country:     d.sys.country || locationInfo.country,
            lat, lon,
          });
          setError(null);
          return;
        }
      } catch { /* fall through */ }

      setError('Could not fetch weather');
      setWeatherData({
        temp: 28, feelsLike: 30,
        weatherMain: 'Clear', weatherDesc: 'clear sky',
        city: locationInfo.city, country: locationInfo.country,
        lat, lon,
      });
    }
  };

  const initWeather = async () => {
    setLoading(true);
    const coords = await getLocationByIP();
    await fetchWeatherData(coords.lat, coords.lon);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const coords = weatherData ? { lat: weatherData.lat, lon: weatherData.lon } : await getLocationByIP();
    await fetchWeatherData(coords.lat, coords.lon);
    setRefreshing(false);
  };

  useEffect(() => {
    initWeather();
    const id = setInterval(() => {
      if (weatherData) fetchWeatherData(weatherData.lat, weatherData.lon);
    }, 600_000);
    return () => clearInterval(id);
  }, []);

  // ── ad click ──
  const handleAdPress = async () => {
    if (!activePremiumAd?._id || !activePremiumAd?.media?.redirectUrl) return;
    try {
      fetch(`${API_BASE_URL}/api/ads/${activePremiumAd._id}/click`, { method: 'POST' });
      const url = activePremiumAd.media.redirectUrl;
      if (await Linking.canOpenURL(url)) Linking.openURL(url);
    } catch { /* silent */ }
  };

  const isNight = new Date().getHours() >= 19 || new Date().getHours() < 6;
  const now     = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ── SPONSORED AD ──────────────────────────────────────────────────────────
  if (activePremiumAd) {
    return (
      <View style={[s.card, s.adCard]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleAdPress} style={{ flex: 1 }}>
          <ImageBackground
            source={{ uri: activePremiumAd.media?.imageUrl || 'https://via.placeholder.com/600x300' }}
            style={{ flex: 1 }}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={s.adScrim}>
              <View style={s.adBadge}>
                <MaterialCommunityIcons name="star-circle" size={11} color="#FFD700" />
                <Text style={s.adBadgeText}>SPONSORED</Text>
              </View>
              <View>
                <Text style={s.adTitle} numberOfLines={1}>{activePremiumAd.title}</Text>
                {activePremiumAd.teluguTitle
                  ? <Text style={s.adSubtitle} numberOfLines={1}>{activePremiumAd.teluguTitle}</Text>
                  : null}
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (loading && !weatherData) {
    return (
      <View style={[s.card, s.loadCard, { backgroundColor: colors.surface, borderColor: colors.border + '30' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadText, { color: colors.textSecondary }]}>Detecting location…</Text>
      </View>
    );
  }

  // ── WEATHER CARD ──────────────────────────────────────────────────────────
  return (
    <Animated.View
      style={[
        s.card,
        {
          backgroundColor: colors.surface,
          borderColor:     colors.border + '30',
          opacity:         fadeAnim,
          transform:       [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Location row */}
      <View style={s.topRow}>
        <View style={s.locRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.textSecondary} />
          <View>
            <Text style={[s.city, { color: colors.text }]}>{weatherData?.city || locationName}</Text>
            {weatherData?.country
              ? <Text style={[s.country, { color: colors.textSecondary }]}>{weatherData.country}</Text>
              : null}
          </View>
        </View>

        <TouchableOpacity
          style={[s.refreshBtn, { backgroundColor: colors.background, borderColor: colors.border + '40' }]}
          onPress={onRefresh}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          {refreshing
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <MaterialCommunityIcons name="refresh" size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
      </View>

      {/* Hero */}
      <View style={s.hero}>
        {/* Temperature */}
        <View>
          <View style={s.tempRow}>
            <Text style={[s.temp, { color: colors.text }]}>{weatherData?.temp ?? '--'}</Text>
            <Text style={[s.unit, { color: colors.textSecondary }]}>°C</Text>
          </View>
          <Text style={[s.condText, { color: colors.textSecondary }]}>
            {weatherData?.weatherDesc || 'clear sky'}
          </Text>
        </View>

        {/* Animated icon */}
        <WeatherIcon
          weatherMain={weatherData?.weatherMain}
          isNight={isNight}
          size={84}
        />
      </View>

      {/* Footer */}
      <View style={[s.footer, { borderTopColor: colors.border + '30' }]}>
        <View style={s.liveRow}>
          <View style={s.dot} />
          <Text style={[s.footerText, { color: colors.textSecondary }]}>Live</Text>
        </View>
        <Text style={[s.footerText, { color: colors.textSecondary }]}>Updated {now}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 14 },
      android: { elevation: 3 },
    }),
  },

  // ── ad ──
  adCard:     { height: 180, padding: 0, borderColor: 'transparent' },
  adScrim:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)', borderRadius: 20, padding: 16, justifyContent: 'space-between' },
  adBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  adBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  adTitle:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  adSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },

  // ── loading ──
  loadCard:  { alignItems: 'center', justifyContent: 'center', minHeight: 180, gap: 14 },
  loadText:  { fontSize: 14, fontWeight: '500' },

  // ── top row ──
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  locRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  city:       { fontSize: 16, fontWeight: '600' },
  country:    { fontSize: 12, marginTop: 2 },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // ── hero ──
  hero:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  tempRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  temp:       { fontSize: 72, fontWeight: '500', lineHeight: 72, letterSpacing: -3 },
  unit:       { fontSize: 26, fontWeight: '400', marginTop: 10, marginLeft: 2 },
  condText:   { fontSize: 14, marginTop: 6, textTransform: 'capitalize' },

  // ── footer ──
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 14 },
  liveRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  footerText: { fontSize: 12 },
});