import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function PrivacyPolicyScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.sectionText}>
          • Personal Information: Name, email address, phone number, profile picture
        </Text>
        <Text style={styles.sectionText}>
          • Location Data: GPS coordinates to find nearby labourers and services
        </Text>
        <Text style={styles.sectionText}>
          • Device Information: Device model, OS version, unique device identifiers
        </Text>
        <Text style={styles.sectionText}>
          • Usage Data: App interactions, features used, time spent
        </Text>
        <Text style={styles.sectionText}>
          • Transaction Data: Listings, bookings, payments, ratings
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.sectionText}>
          • Connect farmers with labourers, equipment owners, and buyers
        </Text>
        <Text style={styles.sectionText}>
          • Verify user identities for trust and safety
        </Text>
        <Text style={styles.sectionText}>
          • Improve and personalize your app experience
        </Text>
        <Text style={styles.sectionText}>
          • Send important notifications about your listings and bookings
        </Text>
        <Text style={styles.sectionText}>
          • Process payments and prevent fraud
        </Text>
        <Text style={styles.sectionText}>
          • Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>3. Data Sharing</Text>
        <Text style={styles.sectionText}>
          We do not sell your personal data. We share information only:
        </Text>
        <Text style={styles.sectionText}>
          • With other users to facilitate transactions (e.g., sharing contact details for rentals)
        </Text>
        <Text style={styles.sectionText}>
          • With service providers who assist our operations
        </Text>
        <Text style={styles.sectionText}>
          • When required by law or to protect legal rights
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.sectionText}>
          • All data encrypted in transit using HTTPS
        </Text>
        <Text style={styles.sectionText}>
          • Passwords hashed and salted
        </Text>
        <Text style={styles.sectionText}>
          • Regular security audits and vulnerability assessments
        </Text>
        <Text style={styles.sectionText}>
          • Access restricted to authorized personnel only
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.sectionText}>
          • Access your personal data
        </Text>
        <Text style={styles.sectionText}>
          • Correct inaccurate data
        </Text>
        <Text style={styles.sectionText}>
          • Delete your account and associated data
        </Text>
        <Text style={styles.sectionText}>
          • Opt out of marketing communications
        </Text>
        <Text style={styles.sectionText}>
          • Data portability (export your data)
        </Text>

        <Text style={styles.sectionTitle}>6. Data Retention</Text>
        <Text style={styles.sectionText}>
          We retain your data as long as your account is active. Upon account deletion, 
          your data is permanently removed within 30 days. Some data may be retained 
          longer to comply with legal obligations.
        </Text>

        <Text style={styles.sectionTitle}>7. Children's Privacy</Text>
        <Text style={styles.sectionText}>
          AgriAgent is not intended for users under 18 years of age. We do not knowingly 
          collect personal information from minors. If you believe a minor has provided 
          us with personal information, please contact us.
        </Text>

        <Text style={styles.sectionTitle}>8. Location Services</Text>
        <Text style={styles.sectionText}>
          We request location access to help you find nearby labourers, equipment, 
          and shops. You can disable location services in your device settings, 
          but this may affect app functionality.
        </Text>

        <Text style={styles.sectionTitle}>9. Camera and Photos</Text>
        <Text style={styles.sectionText}>
          We request camera and photo access to allow you to upload profile pictures, 
          equipment photos, produce images, and problem media. You can deny these 
          permissions and still use other features.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.sectionText}>
          We may update this privacy policy from time to time. We will notify you of 
          any changes by posting the new policy on this page and updating the 
          "Last updated" date.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.sectionText}>
          If you have questions about this Privacy Policy, please contact us:
        </Text>
        <Text style={styles.sectionText}>
          • Email: siddhikreddy440@gmail.com
        </Text>
        <Text style={styles.sectionText}>
          • Phone: +91 8897350151
        </Text>
        <Text style={styles.sectionText}>
          • Address: Hyderabad, Telangana, India
        </Text>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 8,
  },
  bottomSpace: {
    height: 30,
  },
});