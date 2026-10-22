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

export default function TermsScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.sectionText}>
          By accessing or using AgriAgent, you agree to be bound by these Terms of Service. 
          If you disagree with any part of these terms, you may not access the Service.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.sectionText}>
          AgriAgent is a mobile platform that connects farmers, labourers, contractors, 
          and buyers for agricultural services including labour hiring, equipment rental, 
          produce marketplace, and community support.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.sectionText}>
          3.1. You must be 18 years or older to use this Service.
        </Text>
        <Text style={styles.sectionText}>
          3.2. You are responsible for maintaining the confidentiality of your account.
        </Text>
        <Text style={styles.sectionText}>
          3.3. You are responsible for all activities that occur under your account.
        </Text>
        <Text style={styles.sectionText}>
          3.4. You must provide accurate and complete registration information.
        </Text>

        <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
        <Text style={styles.sectionText}>
          4.1. Farmers: Provide accurate information about land, crop requirements, and labour needs.
        </Text>
        <Text style={styles.sectionText}>
          4.2. Labourers: Provide accurate skills, experience, and availability information.
        </Text>
        <Text style={styles.sectionText}>
          4.3. Contractors: Provide accurate team size, expertise, and service information.
        </Text>
        <Text style={styles.sectionText}>
          4.4. Buyers: Provide accurate order information and complete payments.
        </Text>

        <Text style={styles.sectionTitle}>5. Equipment Rental Terms</Text>
        <Text style={styles.sectionText}>
          5.1. For self-drive rentals, the renter assumes FULL responsibility for any damage or theft.
        </Text>
        <Text style={styles.sectionText}>
          5.2. Security deposit is mandatory and refundable upon equipment return in good condition.
        </Text>
        <Text style={styles.sectionText}>
          5.3. Equipment must be returned by the agreed date and time.
        </Text>
        <Text style={styles.sectionText}>
          5.4. Late returns may incur additional charges.
        </Text>

        <Text style={styles.sectionTitle}>6. Produce Marketplace Terms</Text>
        <Text style={styles.sectionText}>
          6.1. Farmers must provide accurate information about produce quality, quantity, and price.
        </Text>
        <Text style={styles.sectionText}>
          6.2. Buyers should verify produce quality before purchase.
        </Text>
        <Text style={styles.sectionText}>
          6.3. AgriAgent is not responsible for transaction disputes.
        </Text>

        <Text style={styles.sectionTitle}>7. Prohibited Activities</Text>
        <Text style={styles.sectionText}>
          • Posting fraudulent or misleading listings
        </Text>
        <Text style={styles.sectionText}>
          • Harassing or threatening other users
        </Text>
        <Text style={styles.sectionText}>
          • Using the platform for illegal activities
        </Text>
        <Text style={styles.sectionText}>
          • Attempting to bypass verification or safety measures
        </Text>
        <Text style={styles.sectionText}>
          • Sub-leasing equipment without owner permission
        </Text>

        <Text style={styles.sectionTitle}>8. Verification and Trust Badges</Text>
        <Text style={styles.sectionText}>
          Users may receive verification badges after completing identity verification. 
          Verified badges indicate that the user has provided valid identification but 
          do not guarantee the quality of services.
        </Text>

        <Text style={styles.sectionTitle}>9. Payments and Fees</Text>
        <Text style={styles.sectionText}>
          9.1. AgriAgent may charge fees for certain services.
        </Text>
        <Text style={styles.sectionText}>
          9.2. All fees are clearly displayed before purchase.
        </Text>
        <Text style={styles.sectionText}>
          9.3. Payments are processed through secure third-party providers.
        </Text>

        <Text style={styles.sectionTitle}>10. Cancellation and Refunds</Text>
        <Text style={styles.sectionText}>
          10.1. Users may cancel bookings according to individual listing policies.
        </Text>
        <Text style={styles.sectionText}>
          10.2. Refunds are processed based on the cancellation policy.
        </Text>
        <Text style={styles.sectionText}>
          10.3. Promotion fees are non-refundable once promotion starts.
        </Text>

        <Text style={styles.sectionTitle}>11. Ratings and Reviews</Text>
        <Text style={styles.sectionText}>
          Users may rate and review each other after transactions. Reviews must be genuine 
          and based on actual experience. False or malicious reviews may result in account 
          suspension.
        </Text>

        <Text style={styles.sectionTitle}>12. Termination</Text>
        <Text style={styles.sectionText}>
          We reserve the right to suspend or terminate accounts that violate these terms, 
          engage in fraudulent activity, or pose a risk to other users.
        </Text>

        <Text style={styles.sectionTitle}>13. Limitation of Liability</Text>
        <Text style={styles.sectionText}>
          AgriAgent is an intermediary platform. We are not liable for:
        </Text>
        <Text style={styles.sectionText}>
          • Direct transactions between users
        </Text>
        <Text style={styles.sectionText}>
          • Quality of goods or services provided
        </Text>
        <Text style={styles.sectionText}>
          • Losses resulting from user disputes
        </Text>
        <Text style={styles.sectionText}>
          • Equipment damage or theft during rentals
        </Text>

        <Text style={styles.sectionTitle}>14. Disclaimer of Warranties</Text>
        <Text style={styles.sectionText}>
          The Service is provided "as is" without warranties of any kind. We do not 
          guarantee that the Service will be uninterrupted or error-free.
        </Text>

        <Text style={styles.sectionTitle}>15. Governing Law</Text>
        <Text style={styles.sectionText}>
          These terms shall be governed by the laws of India. Any disputes shall be 
          subject to the exclusive jurisdiction of courts in Hyderabad, Telangana.
        </Text>

        <Text style={styles.sectionTitle}>16. Changes to Terms</Text>
        <Text style={styles.sectionText}>
          We may modify these terms at any time. Continued use of the Service constitutes 
          acceptance of the modified terms.
        </Text>

        <Text style={styles.sectionTitle}>17. Contact Information</Text>
        <Text style={styles.sectionText}>
          For questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.sectionText}>
          Email: siddhikreddy440@gmail.com
        </Text>
        <Text style={styles.sectionText}>
          Phone: +91 8897350151
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