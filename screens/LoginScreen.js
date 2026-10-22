import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Dimensions, Platform, StatusBar, ScrollView, Modal,
  Animated, Easing,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../utils/theme';
import { storeUserData, getUserData } from '../utils/auth';
import { ENV } from '../config/env';

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const GOOGLE_CLIENT_ID = ENV.GOOGLE_CLIENT_ID;
const API_BASE_URL = ENV.API_BASE_URL;
const VERCEl_AUTH_URL = ENV.OAUTH_CALLBACK_URL;

WebBrowser.maybeCompleteAuthSession();

function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const maxWord = Math.pow(2, 32);
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;
  const hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

function hexToBase64Url(hexString) {
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16));
  }
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1] || 0, b2 = bytes[i + 2] || 0;
    base64 += base64Chars[b0 >> 2];
    base64 += base64Chars[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += i + 1 < bytes.length ? base64Chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    base64 += i + 2 < bytes.length ? base64Chars[b2 & 63] : '=';
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const generateVerifier = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateChallenge = (verifier) => {
  const hex = sha256(verifier);
  return hexToBase64Url(hex);
};

const FeatureItem = ({ text, index, colors }) => {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 300 + index * 100, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: 300 + index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.featureRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '12' }]}>
        <View style={[styles.indicatorDot, { backgroundColor: colors.primary }]} />
      </View>
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </Animated.View>
  );
};

export default function LoginScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(40)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const checkboxScaleAnim = useRef(new Animated.Value(0.8)).current;

  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);

  const navigateToHome = (userData) => {
    const role = userData?.user?.role || userData?.role || 'Farmer';
    const name = userData?.user?.profile?.name || userData?.user?.name || 'Agri User';
    navigation.replace('Home', {
      userRole: role.charAt(0).toUpperCase() + role.slice(1),
      userName: name,
    });
  };

  useEffect(() => {
    const checkExistingLogin = async () => {
      try {
        const userData = await getUserData();
        if (userData && userData.isLoggedIn) {
          navigateToHome(userData);
          return;
        }
      } catch (error) {
        console.log('âŒ [LOGIN] Check login error:', error);
      }
      setCheckingLogin(false);
    };
    checkExistingLogin();
  }, []);

  useEffect(() => {
    if (!checkingLogin) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(slideUpAnim, { toValue: 0, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [checkingLogin]);

  useEffect(() => {
    Animated.spring(checkboxScaleAnim, {
      toValue: termsAccepted ? 1 : 0.8,
      friction: 5,
      useNativeDriver: true
    }).start();
  }, [termsAccepted]);

  const handlePressIn = () => {
    Animated.spring(buttonScaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();
  };

  // ==================== DEBUG-INSTRUMENTED ====================
  const handleAuthResult = async (url) => {
    console.log('========== [AUTH DEBUG] handleAuthResult ==========');
    console.log('[AUTH DEBUG] Raw deep link URL:', url);
    try {
      const parsed = Linking.parse(url);
      console.log('[AUTH DEBUG] Linking.parse() output:', JSON.stringify(parsed, null, 2));
      const params = parsed.queryParams || {};
      console.log('[AUTH DEBUG] queryParams:', JSON.stringify(params, null, 2));
      const { token, userId, email, role, error } = params;

      if (error) {
        console.log('[AUTH DEBUG] error param (raw):', error);
        console.log('[AUTH DEBUG] error param (typeof):', typeof error);
        Alert.alert('Sign In Failed', decodeURIComponent(String(error)));
        return;
      }
      if (!token || !userId) {
        console.log('[AUTH DEBUG] Missing token or userId. token:', token, 'userId:', userId);
        Alert.alert('Sign In Failed', 'No token received. Please try again.');
        return;
      }

      console.log('[AUTH DEBUG] Fetching profile from:', `${API_BASE_URL}/api/auth/me`);
      const profileRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[AUTH DEBUG] profileRes.status:', profileRes.status);
      const profileData = await profileRes.json();
      console.log('[AUTH DEBUG] profileData:', JSON.stringify(profileData, null, 2));

      if (profileRes.ok && profileData.user) {
        await storeUserData(profileData.user, token);
      } else {
        await storeUserData({ _id: userId, email, role }, token);
      }
      navigation.replace('LanguageSelection');
    } catch (err) {
      console.error('[AUTH DEBUG] handleAuthResult exception:', err);
      Alert.alert('Error', 'Failed to complete sign in. Please try again.');
    }
  };

  // ==================== DEBUG-INSTRUMENTED ====================
  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      Alert.alert('Accept Terms', 'Please accept Terms and Conditions to continue.');
      return;
    }
    setLoading(true);
    try {
      const codeVerifier = generateVerifier();
      const codeChallenge = generateChallenge(codeVerifier);
      const appRedirectUri = Linking.createURL('auth');

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(VERCEl_AUTH_URL)}` +
        `&response_type=code` +
        `&scope=profile%20email` +
        `&code_challenge=${codeChallenge}` +
        `&code_challenge_method=S256` +
        `&state=${codeVerifier}` +
        `&app_redirect_uri=${encodeURIComponent(appRedirectUri)}`;

      console.log('========== [AUTH DEBUG] START ==========');
      console.log('[AUTH DEBUG] appRedirectUri:', appRedirectUri);
      console.log('[AUTH DEBUG] VERCEl_AUTH_URL:', VERCEl_AUTH_URL);
      console.log('[AUTH DEBUG] codeVerifier:', codeVerifier);
      console.log('[AUTH DEBUG] codeChallenge:', codeChallenge);
      console.log('[AUTH DEBUG] Full authUrl:', authUrl);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, appRedirectUri);

      console.log('========== [AUTH DEBUG] RESULT ==========');
      console.log('[AUTH DEBUG] result.type:', result.type);
      console.log('[AUTH DEBUG] result.url:', result.url);
      console.log('[AUTH DEBUG] Full result object:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && result.url) {
        await handleAuthResult(result.url);
      } else {
        console.log('[AUTH DEBUG] Did NOT reach success branch. result.type was:', result.type);
      }
    } catch (error) {
      console.error('[AUTH DEBUG] Caught exception in handleGoogleSignIn:', error);
      Alert.alert('Error', error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const acceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
  };

  if (checkingLogin) {
    return (
      <View style={[dynamicStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Setting up layout environment...</Text>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <View style={[styles.backgroundBlobTop, { backgroundColor: colors.primary + '09' }]} />
      <View style={[styles.backgroundBlobBottom, { backgroundColor: colors.primary + '05' }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>

          <View style={styles.headerSection}>
            <Text style={[styles.appName, { color: colors.text }]}>
              Agri<Text style={{ color: colors.primary }}>Agent</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Farm Labour Made Simple</Text>
          </View>

          <View style={[dynamicStyles.featuresCard, styles.featuresCardShared]}>
            <Text style={[styles.featuresTitle, { color: colors.textSecondary }]}>PLATFORM ENVIRONMENT</Text>
            {[
              'Connect with skilled farm workers',
              'Trade agricultural produce directly',
              'Calculate crop revenue with market prices',
              'Access real-time weather forecasts'
            ].map((feature, index) => (
              <FeatureItem key={index} text={feature} index={index} colors={colors} />
            ))}
          </View>

          <TouchableOpacity
            onPress={() => setTermsAccepted(!termsAccepted)}
            style={styles.termsTouchable}
            activeOpacity={0.8}
          >
            <View style={[
              styles.checkbox,
              { borderColor: termsAccepted ? colors.primary : colors.border },
              termsAccepted && { backgroundColor: colors.primary }
            ]}>
              {termsAccepted && (
                <Animated.View style={[styles.checkmarkInner, { transform: [{ scale: checkboxScaleAnim }] }]} />
              )}
            </View>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I confirm and agree to the general{' '}
              <Text onPress={() => setShowTermsModal(true)} style={[styles.termsLink, { color: colors.primary }]}>
                Terms and Conditions
              </Text>
            </Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
            <TouchableOpacity
              style={[
                dynamicStyles.signInButton,
                styles.signInButtonShared,
                (!termsAccepted || loading) && styles.signInButtonDisabled
              ]}
              onPress={handleGoogleSignIn}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={loading || !termsAccepted}
              activeOpacity={0.95}
            >
              {loading ? (
                <ActivityIndicator color={isDarkTheme ? '#1A1A1A' : '#FFFFFF'} size="small" />
              ) : (
                <Text style={[dynamicStyles.signInButtonText, styles.signInButtonTextShared]}>
                  Sign in with Google
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Secure identity verification powered via Google Services
          </Text>
        </Animated.View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={showTermsModal} onRequestClose={() => setShowTermsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setShowTermsModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.closeButtonText, { color: colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Platform Framework</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={[styles.termsTitle, { color: colors.text }]}>Terms of Service</Text>
              <Text style={[styles.termsDate, { color: colors.textMuted }]}>Last updated: May 2026</Text>

              {[
                { title: '1. Acceptance of Terms', content: 'By accessing or using AgriAgent, you agree to be bound by these terms.' },
                { title: '2. User Roles', content: 'Users can register as Farmers, Labourers, Contractors, or Buyers.' },
                { title: '3. Account Verification', content: 'Users must complete verification to access certain features.' },
                { title: '4. Equipment Rental', content: 'For self-drive rentals, the renter assumes FULL responsibility.' },
                { title: '5. Privacy Protection', content: 'Your personal data is protected. Location data is used only for matching.' },
              ].map((section, index) => (
                <View key={index} style={styles.termsSection}>
                  <Text style={[styles.termsSectionTitle, { color: colors.text }]}>{section.title}</Text>
                  <Text style={[styles.termsSectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
                </View>
              ))}

              <TouchableOpacity style={[styles.acceptButton, { backgroundColor: colors.primary }]} onPress={acceptTerms} activeOpacity={0.9}>
                <Text style={styles.acceptButtonText}>Accept & Continue</Text>
              </TouchableOpacity>
              <View style={styles.modalBottomSpace} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  featuresCard: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderWidth: isDarkTheme ? 0 : 1,
    borderColor: '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.35 : 0.16,
  },
  signInButton: {
    backgroundColor: isDarkTheme ? '#FFFFFF' : '#141414',
    shadowColor: isDarkTheme ? '#000000' : colors.primary,
    shadowOpacity: isDarkTheme ? 0.25 : 0.15,
  },
  signInButtonText: {
    color: isDarkTheme ? '#141414' : '#FFFFFF',
  }
});

const styles = StyleSheet.create({
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 13, fontWeight: '500', marginTop: 14, letterSpacing: 0.2 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },

  backgroundBlobTop: { position: 'absolute', top: -70, right: -40, width: 260, height: 260, borderRadius: 130 },
  backgroundBlobBottom: { position: 'absolute', bottom: 40, left: -90, width: 220, height: 220, borderRadius: 110 },

  contentWrapper: { flex: 1, paddingHorizontal: 32, paddingTop: STATUS_BAR_HEIGHT + 36 },
  headerSection: { alignItems: 'center', marginBottom: 40, marginTop: 12 },
  appName: { fontSize: 40, fontWeight: '800', letterSpacing: -1.2, marginBottom: 6 },
  tagline: { fontSize: 15, fontWeight: '500', letterSpacing: 0.3 },
  featuresCardShared: { borderRadius: 28, padding: 26, marginBottom: 32, shadowOffset: { width: 0, height: 10 }, shadowRadius: 30, elevation: 4 },
  featuresTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  indicatorDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 14, fontWeight: '500', lineHeight: 22, flex: 1 },
  termsTouchable: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingHorizontal: 4 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 7, marginRight: 14, justifyContent: 'center', alignItems: 'center' },
  checkmarkInner: { width: 10, height: 10, borderRadius: 2.5, backgroundColor: '#FFFFFF' },
  termsText: { fontSize: 13, flex: 1, lineHeight: 18, fontWeight: '400' },
  termsLink: { fontWeight: '600', textDecorationLine: 'underline' },

  // Clean, symmetric production button system
  signInButtonShared: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4 },
  signInButtonDisabled: { opacity: 0.35, shadowOpacity: 0, elevation: 0 },
  signInButtonTextShared: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  footerText: { fontSize: 11, textAlign: 'center', marginTop: 10, letterSpacing: 0.2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContainer: { height: '84%', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 26, paddingBottom: 18, borderBottomWidth: 1 },
  closeButtonText: { fontSize: 15, fontWeight: '600' },
  modalTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  modalContent: { flex: 1, paddingHorizontal: 30, paddingTop: 26 },
  termsTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  termsDate: { fontSize: 13, marginBottom: 26 },
  termsSection: { marginBottom: 22 },
  termsSectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  termsSectionContent: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  acceptButton: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 16 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  modalBottomSpace: { height: 56 },
});
