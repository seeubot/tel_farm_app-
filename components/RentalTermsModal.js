import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

export default function RentalTermsModal({ visible, onClose, rentalType }) {
  const { colors } = useTheme();

  const getTerms = () => {
    if (rentalType === 'self') {
      return {
        title: 'Self-Drive / Self-Operate Terms',
        sections: [
          {
            title: 'Eligibility Requirements',
            content: [
              '• Valid driving license required for vehicles',
              '• Minimum 21 years of age',
              '• Security deposit mandatory (refundable)',
              '• ID proof (Aadhar/PAN) verification completed',
              '• Address verification completed',
            ],
          },
          {
            title: 'User Responsibilities',
            content: [
              '• Operator assumes FULL responsibility for equipment',
              '• Any damage or loss is user\'s liability',
              '• Fuel/electricity costs borne by user',
              '• Maintenance during rental period is user\'s responsibility',
              '• Equipment must be returned in same condition',
            ],
          },
          {
            title: 'Prohibited Uses',
            content: [
              '• No overloading beyond capacity',
              '• No modification or tampering',
              '• No sub-leasing to third parties',
              '• No use for illegal activities',
              '• No operation under alcohol/drugs',
            ],
          },
          {
            title: 'Damage & Liability',
            content: [
              '• Full replacement cost for theft/loss',
              '• Repair costs deducted from deposit',
              '• Third-party damage is user\'s liability',
              '• Accidents must be reported immediately',
              '• Insurance claim process requires police report',
            ],
          },
          {
            title: 'Consequences of Violation',
            content: [
              '• Permanent account suspension',
              '• Legal action including FIR registration',
              '• Blacklisting from platform',
              '• Recovery of damages through legal process',
              '• Reporting to credit bureaus',
            ],
          },
        ],
      };
    } else {
      return {
        title: 'With Operator / Driver Terms',
        sections: [
          {
            title: 'Operator Requirements',
            content: [
              '• Operator must be verified by platform',
              '• Valid license and experience certificate',
              '• Background verification completed',
              '• Operator will be provided by owner',
            ],
          },
          {
            title: 'Owner Responsibilities',
            content: [
              '• Equipment in working condition',
              '• Operator is owner\'s employee/representative',
              '• Owner responsible for operator\'s actions',
              '• Maintenance and fuel by owner',
            ],
          },
          {
            title: 'Renter Responsibilities',
            content: [
              '• Provide clear work instructions',
              '• Ensure safe working environment',
              '• Pay agreed amount on time',
              '• Report any issues immediately',
            ],
          },
          {
            title: 'Liability',
            content: [
              '• Owner responsible for equipment damage during operation',
              '• Renter responsible for providing access to farm',
              '• Accidents covered by owner\'s insurance',
              '• Disputes resolved through platform mediation',
            ],
          },
          {
            title: 'Payment Terms',
            content: [
              '• Payment as per agreed rate',
              '• Security deposit may be collected',
              '• Overtime charges applicable',
              '• Cancellation policy applies',
            ],
          },
        ],
      };
    }
  };

  const terms = getTerms();
  const styles = getStyles(colors);

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{terms.title}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {terms.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.content.map((line, lineIndex) => (
                <Text key={lineIndex} style={styles.sectionText}>
                  {line}
                </Text>
              ))}
              <View style={styles.divider} />
            </View>
          ))}

          <View style={styles.warningBox}>
            <MaterialIcons name="warning" size={24} color="#F44336" />
            <Text style={styles.warningTitle}>Legal Disclaimer</Text>
            <Text style={styles.warningText}>
              By proceeding with rental, you agree to:
            </Text>
            <Text style={styles.warningBullet}>
              • Provide accurate information
            </Text>
            <Text style={styles.warningBullet}>
              • Comply with all applicable laws
            </Text>
            <Text style={styles.warningBullet}>
              • Accept full liability as per terms
            </Text>
            <Text style={styles.warningBullet}>
              • AgriAgent is an intermediary platform
            </Text>
            <Text style={styles.warningBullet}>
              • Direct agreement between owner and renter
            </Text>
          </View>

          <TouchableOpacity style={styles.acceptButton} onPress={onClose}>
            <Text style={styles.acceptButtonText}>I Understand & Agree</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 12,
  },
  warningBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 8,
    marginBottom: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  warningBullet: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 30,
  },
});