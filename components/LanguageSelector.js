import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/theme';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

export default function LanguageSelector({ style }) {
  const { language, changeLanguage, t } = useLanguage();
  const { colors, isDarkTheme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === language);

  const styles = getStyles(colors);

  return (
    <>
      <TouchableOpacity 
        style={[styles.selectorButton, style]} 
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="language" size={20} color={colors.text} />
        <Text style={styles.selectorText}>{currentLanguage?.nativeName}</Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={colors.text} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('language')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    language === item.code && styles.languageItemActive,
                  ]}
                  onPress={() => {
                    changeLanguage(item.code);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.languageName,
                    language === item.code && styles.languageNameActive,
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.languageNative,
                    language === item.code && styles.languageNativeActive,
                  ]}>
                    {item.nativeName}
                  </Text>
                  {language === item.code && (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const getStyles = (colors) => StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.inputBg,
  },
  selectorText: {
    fontSize: 14,
    color: colors.text,
    marginHorizontal: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  languageItemActive: {
    backgroundColor: colors.primaryLight,
  },
  languageName: {
    fontSize: 16,
    color: colors.text,
  },
  languageNameActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  languageNative: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 10,
  },
  languageNativeActive: {
    color: colors.primary,
  },
});