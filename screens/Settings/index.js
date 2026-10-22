import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SettingsSection from './SettingsSection';
import TermsModal from './TermsModal';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function SettingsModal({ 
  visible, 
  onClose, 
  selectedRadius,
  onRadiusChange,
  onIncrement,
  onDecrement,
  onUpdateLocation,
  onSwitchRole,
  isDarkTheme,
  onThemeToggle,  // Receive toggle function from parent
}) {
  const [termsType, setTermsType] = useState(null);

  const themeColors = isDarkTheme ? {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#E0E0E0',
    textSecondary: '#B0B0B0',
    textMuted: '#888888',
    border: '#2C2C2C',
    primary: '#4CAF50',
    primaryLight: '#2C2C2C',
  } : {
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#333333',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#E0E0E0',
    primary: '#2E7D32',
    primaryLight: '#E8F5E9',
  };

  const styles = {
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: STATUS_BAR_HEIGHT + 10,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    closeButton: {
      padding: 4,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: themeColors.text,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    switchRoleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F44336',
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: 16,
      marginBottom: 8,
    },
    switchRoleText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 10,
    },
    footerSpace: {
      height: 30,
    },
  };

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: 'dark-mode',
          label: 'Dark Theme',
          type: 'switch',
          iconColor: themeColors.primary
        }
      ]
    },
    {
      title: 'Location',
      items: [
        {
          icon: 'my-location',
          label: 'Update Farm Location',
          type: 'link',
          onPress: () => {
            onUpdateLocation();
            onClose();
          },
          iconColor: themeColors.primary
        },
        {
          icon: 'radius',
          label: 'Search Radius',
          type: 'radius',
          iconColor: themeColors.primary
        }
      ]
    },
    // Add this to settingsSections array
{
  title: 'Language / భాష',
  items: [
    {
      icon: 'language',
      label: 'English',
      type: 'language',
      onPress: () => changeLanguage('en'),
    },
    {
      icon: 'language',
      label: 'తెలుగు',
      type: 'language',
      onPress: () => changeLanguage('te'),
    },
  ]
},
    {
      title: 'About App',
      items: [
        {
          icon: 'description',
          label: 'Terms and Conditions',
          type: 'link',
          onPress: () => setTermsType('terms'),
          iconColor: themeColors.primary
        },
        {
          icon: 'security',
          label: 'Privacy Policy',
          type: 'link',
          onPress: () => setTermsType('privacy'),
          iconColor: themeColors.primary
        },
        {
          icon: 'info',
          label: 'About AgriAgent',
          type: 'link',
          onPress: () => setTermsType('about'),
          iconColor: themeColors.primary
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'support-agent',
          label: 'Contact Support',
          type: 'link',
          onPress: () => alert('siddhikreddy440@gmail.com'),
          iconColor: themeColors.primary
        },
        {
          icon: 'feedback',
          label: 'Send Feedback',
          type: 'link',
          onPress: () => alert('Feedback feature coming soon'),
          iconColor: themeColors.primary
        }
      ]
    }
  ];

  return (
    <>
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {settingsSections.map((section, idx) => (
              <SettingsSection
                key={idx}
                title={section.title}
                items={section.items}
                isDarkTheme={isDarkTheme}
                radiusValue={selectedRadius}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onThemeToggle={onThemeToggle}
                themeValue={isDarkTheme}
              />
            ))}

            <TouchableOpacity style={styles.switchRoleButton} onPress={onSwitchRole}>
              <MaterialIcons name="swap-horiz" size={24} color="white" />
              <Text style={styles.switchRoleText}>Switch Role</Text>
            </TouchableOpacity>

            <View style={styles.footerSpace} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <TermsModal
        visible={!!termsType}
        onClose={() => setTermsType(null)}
        type={termsType}
        isDarkTheme={isDarkTheme}
      />
    </>
  );
}