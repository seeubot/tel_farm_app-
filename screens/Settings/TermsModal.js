import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function TermsModal({ visible, onClose, type, isDarkTheme }) {
  const getContent = () => {
    if (type === 'terms') {
      return {
        title: 'Terms and Conditions',
        content: `1. Platform connects farmers with labourers directly.
2. Verification badges indicate manual verification by admin.
3. Users are responsible for direct negotiations.
4. AgriAgent is not liable for disputes between parties.
5. Misuse of platform leads to account suspension.
6. Masked calling protects privacy of both parties.
7. Ratings must be genuine and fair.
8. Platform reserves right to modify terms.

Last updated: January 2024`
      };
    } else if (type === 'privacy') {
      return {
        title: 'Privacy Policy',
        content: `Information We Collect:
• Location data used only for matching
• Phone numbers masked for privacy
• Profile information you provide

How We Use Data:
• Connect farmers with labourers
• Improve matching algorithms
• Platform analytics

Your Rights:
• Request data deletion
• Opt out of notifications
• Update profile information

Data Security:
• Encrypted storage
• No third-party sharing
• Regular security audits`
      };
    } else {
      return {
        title: 'About AgriAgent',
        content: `Version: 1.0.0

AgriAgent is a mobile-first agricultural labour discovery platform connecting farmers, labourers, and contractors locally in Telugu-speaking regions.

Developed for efficient farm labour management with features like GPS matching, manual verification, ratings, and direct communication.

Key Features:
• GPS-based labour discovery
• Manual verification badges
• Ratings and reviews
• Direct contact with masked calling
• Multi-language support

Contact: siddhikreddy440@gmail.com
Website: agriagent.vercel.app`
      };
    }
  };

  const { title, content } = getContent();
  const styles = getStyles(isDarkTheme);

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
            <MaterialIcons name="arrow-back" size={24} color={isDarkTheme ? "white" : "#333"} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.text}>{content}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const getStyles = (isDarkTheme) => ({
  container: {
    flex: 1,
    backgroundColor: isDarkTheme ? '#121212' : '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: isDarkTheme ? '#2C2C2C' : '#E0E0E0',
  },
  closeButton: {
    padding: 4,
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: isDarkTheme ? '#E0E0E0' : '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: isDarkTheme ? '#B0B0B0' : '#444',
  },
});