import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function RoleSelectionScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();

  // Smooth layout entry animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUpAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRoleSelect = (role) => {
    navigation.replace('Home', { 
      userRole: role,
      userName: 'Agri User' 
    });
  };

  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);

  return (
    <View style={dynamicStyles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      {/* Decorative background shape to break standard layout monotony */}
      <View style={[styles.backgroundBlob, { backgroundColor: colors.primary + '06' }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }}>
          
          <View style={styles.logoContainer}>
            <View style={[styles.logoCircle, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="agriculture" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.appTitle, { color: colors.text }]}>
              Agri<Text style={{ color: colors.primary }}>Agent</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Farm Labour Made Simple</Text>
          </View>

          <Text style={[styles.selectRoleText, { color: colors.text }]}>
            {t('selectRole') || 'Select your profile'}
          </Text>

          {/* Farmer Card */}
          <TouchableOpacity 
            style={[dynamicStyles.roleCard, styles.roleCardShared]} 
            onPress={() => handleRoleSelect('Farmer')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '12' }]}>
              <MaterialIcons name="agriculture" size={28} color={colors.primary} />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={[styles.roleTitle, { color: colors.text }]}>{t('farmer') || 'Farmer'}</Text>
              <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                {t('farmerDesc') || 'Grow crops and manage your farm'}
              </Text>
            </View>
            <View style={[styles.arrowContainer, { backgroundColor: colors.border + '20' }]}>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Labourer Card */}
          <TouchableOpacity 
            style={[dynamicStyles.roleCard, styles.roleCardShared]} 
            onPress={() => handleRoleSelect('Labourer')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#FF980015' }]}>
              <MaterialIcons name="work" size={26} color="#FF9800" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={[styles.roleTitle, { color: colors.text }]}>{t('labourer') || 'Labourer'}</Text>
              <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                {t('labourerDesc') || 'Find work in agricultural fields'}
              </Text>
            </View>
            <View style={[styles.arrowContainer, { backgroundColor: colors.border + '20' }]}>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Contractor Card */}
          <TouchableOpacity 
            style={[dynamicStyles.roleCard, styles.roleCardShared]} 
            onPress={() => handleRoleSelect('Contractor')}
            activeOpacity={0.9}
          >
            <View style={[styles.iconWrapper, { backgroundColor: '#00BCD415' }]}>
              <MaterialIcons name="groups" size={28} color="#00BCD4" />
            </View>
            <View style={styles.roleTextContainer}>
              <Text style={[styles.roleTitle, { color: colors.text }]}>{t('contractor') || 'Contractor'}</Text>
              <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                {t('contractorDesc') || 'Provide bulk workforce services'}
              </Text>
            </View>
            <View style={[styles.arrowContainer, { backgroundColor: colors.border + '20' }]}>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// Adaptive Dynamic Theme Tokens Map
const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  roleCard: { 
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderWidth: isDarkTheme ? 0 : 1,
    borderColor: '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.3 : 0.12,
  },
});

// Shared Layout Metrics
const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 28, paddingTop: STATUS_BAR_HEIGHT + 24, paddingBottom: 40, flexGrow: 1 },
  backgroundBlob: { position: 'absolute', top: -50, right: -30, width: 220, height: 220, borderRadius: 110 },
  
  logoContainer: { alignItems: 'center', marginTop: 12, marginBottom: 36 },
  logoCircle: { width: 76, height: 76, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 2 },
  appTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 14 },
  tagline: { fontSize: 14, fontWeight: '500', marginTop: 4, letterSpacing: 0.2 },
  
  selectRoleText: { fontSize: 18, fontWeight: '700', marginBottom: 20, letterSpacing: 0.1 },
  
  // High-performance image-less card system
  roleCardShared: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 16, shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 3 },
  iconWrapper: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  roleTextContainer: { flex: 1, marginLeft: 16, paddingRight: 8 },
  roleTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3, letterSpacing: 0.1 },
  roleSubtitle: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  
  // Polished interactive indicator frame
  arrowContainer: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }
});