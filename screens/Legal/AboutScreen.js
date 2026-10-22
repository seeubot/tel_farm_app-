import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

// ─── Material You Color System ───
const M3_COLORS = {
  primary: '#2E5D3E',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E8F5E9',
  onPrimaryContainer: '#1B3A2A',
  secondary: '#7D5A3C',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F5F0E8',
  surface: '#F5F9F2',
  surfaceVariant: '#EAEFE5',
  onSurface: '#1E2A20',
  onSurfaceVariant: '#4A5A4E',
  outline: '#BCC8B8',
  outlineVariant: '#D6E0D2',
  background: '#F5F9F2',
  tonal: {
    green: { bg: '#E8F5E9', text: '#2E5D3E' },
    amber: { bg: '#FFF8E1', text: '#7D5A3C' },
    teal: { bg: '#E0F7FA', text: '#00695C' },
  },
};

export default function AboutScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();

  // ─── Features Data ───
  const features = [
    {
      id: 'labour',
      title: 'Labour Marketplace',
      description: 'Find and hire workers nearby',
      icon: 'account-group',
      color: M3_COLORS.tonal.green,
    },
    {
      id: 'equipment',
      title: 'Equipment Rental',
      description: 'Rent tractors and tools',
      icon: 'tractor',
      color: M3_COLORS.tonal.amber,
    },
    {
      id: 'marketplace',
      title: 'Buyer Marketplace',
      description: 'Sell produce directly',
      icon: 'storefront',
      color: M3_COLORS.tonal.teal,
    },
    {
      id: 'calculator',
      title: 'Revenue Calculator',
      description: 'Calculate crop earnings',
      icon: 'calculator',
      color: M3_COLORS.tonal.green,
    },
    {
      id: 'land',
      title: 'Land Measurement',
      description: 'Measure field area',
      icon: 'ruler-square',
      color: M3_COLORS.tonal.amber,
    },
    {
      id: 'community',
      title: 'Community Solutions',
      description: 'Get expert advice',
      icon: 'message-text',
      color: M3_COLORS.tonal.teal,
    },
  ];

  // ─── Quick Stats ───
  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '500+', label: 'Equipment Listed' },
    { value: '2K+', label: 'Problems Solved' },
    { value: '50+', label: 'Fertilizer Shops' },
  ];

  // ─── Contact Methods ───
  const contacts = [
    { icon: 'email', label: 'seeulivee@gmail.com', action: 'mailto:seeulivee@gmail.com' },
    { icon: 'phone', label: '+91 8897350151', action: 'tel:+918897350151' },
    { icon: 'map-pin', label: 'Hyderabad, Telangana, India', action: null },
  ];

  const handleContactPress = (action) => {
    if (action) {
      Linking.openURL(action).catch(() => {});
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: M3_COLORS.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={M3_COLORS.background} />

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: M3_COLORS.primaryContainer + '60' }]}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={M3_COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: M3_COLORS.onSurface }]}>
          About AgriAgent
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
      >
        {/* ─── HERO SECTION ─── */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#2E5D3E', '#1B3A2A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <MaterialCommunityIcons name="leaf" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>AgriAgent</Text>
              <Text style={styles.heroSubtitle}>Empowering Telugu Agriculture</Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Version 1.0.5</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ─── MISSION SECTION ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: M3_COLORS.primaryContainer }]}>
              <Feather name="target" size={20} color={M3_COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: M3_COLORS.onSurface }]}>
              Our Mission
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: M3_COLORS.onSurfaceVariant }]}>
            To empower Telugu-speaking agricultural communities by providing a trusted 
            digital ecosystem that simplifies labour discovery, crop planning, market 
            access, and operational decision-making.
          </Text>
        </View>

        {/* ─── WHAT WE DO ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: M3_COLORS.primaryContainer }]}>
              <Feather name="activity" size={20} color={M3_COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: M3_COLORS.onSurface }]}>
              What We Do
            </Text>
          </View>
          <Text style={[styles.sectionText, { color: M3_COLORS.onSurfaceVariant }]}>
            AgriAgent connects farmers, labourers, contractors, and buyers in one seamless 
            platform. From hiring labour and renting equipment to selling produce and 
            getting expert advice, we're transforming agriculture through technology.
          </Text>
        </View>

        
        {/* ─── FEATURES ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: M3_COLORS.primaryContainer }]}>
              <Feather name="grid" size={20} color={M3_COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: M3_COLORS.onSurface }]}>
              Key Features
            </Text>
          </View>
          <View style={styles.featuresGrid}>
            {features.map((feature) => (
              <View 
                key={feature.id} 
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: M3_COLORS.surface,
                    borderColor: M3_COLORS.outlineVariant,
                  }
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color.bg }]}>
                  <MaterialCommunityIcons 
                    name={feature.icon} 
                    size={24} 
                    color={feature.color.text} 
                  />
                </View>
                <Text style={[styles.featureTitle, { color: M3_COLORS.onSurface }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDesc, { color: M3_COLORS.onSurfaceVariant }]}>
                  {feature.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── CONTACT ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: M3_COLORS.primaryContainer }]}>
              <Feather name="phone" size={20} color={M3_COLORS.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: M3_COLORS.onSurface }]}>
              Contact Us
            </Text>
          </View>
          <View style={styles.contactList}>
            {contacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.contactItem,
                  {
                    backgroundColor: M3_COLORS.surface,
                    borderColor: M3_COLORS.outlineVariant,
                  }
                ]}
                onPress={() => handleContactPress(contact.action)}
                activeOpacity={contact.action ? 0.7 : 1}
                disabled={!contact.action}
              >
                <View style={[styles.contactIcon, { backgroundColor: M3_COLORS.primaryContainer }]}>
                  <Feather name={contact.icon} size={18} color={M3_COLORS.primary} />
                </View>
                <Text style={[styles.contactLabel, { color: M3_COLORS.onSurface }]}>
                  {contact.label}
                </Text>
                {contact.action && (
                  <Feather name="chevron-right" size={16} color={M3_COLORS.onSurfaceVariant} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── COPYRIGHT ─── */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={[styles.copyright, { color: M3_COLORS.onSurfaceVariant }]}>
            © 2026 AgriAgent. All rights reserved.
          </Text>
          <View style={styles.footerBadges}>
            <View style={[styles.footerBadge, { backgroundColor: M3_COLORS.surfaceVariant }]}>
              <Text style={[styles.footerBadgeText, { color: M3_COLORS.onSurfaceVariant }]}>
                Made with ❤️ in India
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ─── HEADER ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },

  // ─── CONTENT ───
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  // ─── HERO SECTION ───
  heroSection: {
    marginBottom: 24,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#2E5D3E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  heroGradient: {
    padding: 32,
    minHeight: 200,
  },
  heroContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  heroIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
    marginBottom: 12,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ─── SECTION ───
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
    paddingLeft: 0,
  },

  // ─── STATS ───
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 16 * 2 - 10 * 3) / 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── FEATURES ───
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    minWidth: (width - 16 * 2 - 10 * 3) / 3,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 16,
  },
  featureDesc: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 13,
  },

  // ─── CONTACT ───
  contactList: {
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  // ─── FOOTER ───
  footer: {
    marginTop: 8,
    alignItems: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: M3_COLORS.outlineVariant,
    marginBottom: 16,
  },
  copyright: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 8,
  },
  footerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  footerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  footerBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
});