import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/api';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function RoleSelectionScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const isFromSettings = route.params?.fromSettings === true;

  const handleRoleSelect = async (role) => {
    if (loading) return;
    
    setSelectedRole(role);
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken') || 
                    await AsyncStorage.getItem('idToken') ||
                    await AsyncStorage.getItem('authToken');

      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/role`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: role.toLowerCase() }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Role updated on server:', data.role);
          }
        } catch (error) {
          console.log('Server role update failed, continuing with local update');
        }
      }

      const userDataString = await AsyncStorage.getItem('user');
      let userData = {};
      
      if (userDataString) {
        try {
          userData = JSON.parse(userDataString);
        } catch (e) {
          console.log('Error parsing user data');
        }
      }

      userData.role = role.toLowerCase();
      
      if (!userData.roles) {
        userData.roles = ['farmer'];
      }
      
      if (!userData.roles.includes(role.toLowerCase())) {
        userData.roles.push(role.toLowerCase());
      }

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('userRole', role.toLowerCase());
      await AsyncStorage.setItem('selectedRole', role.toLowerCase());

      const authDataString = await AsyncStorage.getItem('authData');
      if (authDataString) {
        try {
          const authData = JSON.parse(authDataString);
          authData.role = role.toLowerCase();
          if (!authData.roles) authData.roles = [];
          if (!authData.roles.includes(role.toLowerCase())) {
            authData.roles.push(role.toLowerCase());
          }
          await AsyncStorage.setItem('authData', JSON.stringify(authData));
        } catch (e) {
          console.log('Error updating authData');
        }
      }

      const roleScreenMap = {
        'farmer': 'Home',
        'labourer': 'LabourerDashboard',
        'contractor': 'ContractorDashboard',
        'buyer': 'BuyerMarketplace',
      };

      const targetScreen = roleScreenMap[role.toLowerCase()] || 'Home';

      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen }],
      });

    } catch (error) {
      console.error('Role selection error:', error);
      Alert.alert(
        'Error',
        'Failed to update role. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={isDarkTheme ? '#0F0F12' : '#F8FAFC'} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brandingHeader}>
          <View style={[styles.brandingIconCircle, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '20' }]}>
            <MaterialIcons name="agriculture" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.appTitle, { color: colors.text }]}>{t('appName')}</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Farm Labour Made Simple</Text>
        </View>

        <Text style={[styles.selectRoleText, { color: colors.text }]}>
          {isFromSettings ? 'Switch Your Role' : t('selectRole')}
        </Text>

        {isFromSettings && (
          <View style={[styles.infoBanner, { backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9', borderColor: colors.border + '15' }]}>
            <MaterialIcons name="info-outline" size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Your existing data and listings will be preserved after switching.
            </Text>
          </View>
        )}

        {/* Farmer Card Option */}
        <TouchableOpacity 
          style={[
            styles.roleCard, 
            { backgroundColor: colors.surface, borderColor: colors.border + '15' },
            selectedRole === 'Farmer' && [styles.selectedCard, { borderColor: colors.primary, backgroundColor: colors.primary + '06' }],
            loading && styles.disabledCard
          ]} 
          onPress={() => handleRoleSelect('Farmer')}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '12' }]}>
            <MaterialIcons name="agriculture" size={26} color={colors.primary} />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={[styles.roleTitle, { color: colors.text }]}>{t('farmer')}</Text>
            <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
              {t('farmerDesc') || 'Grow crops and manage your farm'}
            </Text>
          </View>
          {loading && selectedRole === 'Farmer' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons 
              name="chevron-right" 
              size={20} 
              color={selectedRole === 'Farmer' ? colors.primary : colors.textMuted} 
            />
          )}
        </TouchableOpacity>

        {/* Labourer Card Option */}
        <TouchableOpacity 
          style={[
            styles.roleCard, 
            { backgroundColor: colors.surface, borderColor: colors.border + '15' },
            selectedRole === 'Labourer' && [styles.selectedCard, { borderColor: '#F57C00', backgroundColor: '#FFF3E0' + '15' }],
            loading && styles.disabledCard
          ]} 
          onPress={() => handleRoleSelect('Labourer')}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
            <MaterialIcons name="work" size={24} color="#F57C00" />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={[styles.roleTitle, { color: colors.text }]}>{t('labourer')}</Text>
            <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
              {t('labourerDesc') || 'Find work in agricultural fields'}
            </Text>
          </View>
          {loading && selectedRole === 'Labourer' ? (
            <ActivityIndicator size="small" color="#F57C00" />
          ) : (
            <MaterialIcons 
              name="chevron-right" 
              size={20} 
              color={selectedRole === 'Labourer' ? '#F57C00' : colors.textMuted} 
            />
          )}
        </TouchableOpacity>

        {/* Contractor Card Option */}
        <TouchableOpacity 
          style={[
            styles.roleCard, 
            { backgroundColor: colors.surface, borderColor: colors.border + '15' },
            selectedRole === 'Contractor' && [styles.selectedCard, { borderColor: colors.primary, backgroundColor: colors.primary + '06' }],
            loading && styles.disabledCard
          ]} 
          onPress={() => handleRoleSelect('Contractor')}
          disabled={loading}
          activeOpacity={0.85}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '12' }]}>
            <MaterialIcons name="groups" size={26} color={colors.primary} />
          </View>
          <View style={styles.roleTextContainer}>
            <Text style={[styles.roleTitle, { color: colors.text }]}>{t('contractor')}</Text>
            <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
              {t('contractorDesc') || 'Provide bulk workforce services'}
            </Text>
          </View>
          {loading && selectedRole === 'Contractor' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons 
              name="chevron-right" 
              size={20} 
              color={selectedRole === 'Contractor' ? colors.primary : colors.textMuted} 
            />
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkTheme ? '#0F0F12' : '#F8FAFC' 
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: STATUS_BAR_HEIGHT + 16, 
    paddingBottom: 30, 
    flexGrow: 1 
  },
  brandingHeader: { 
    alignItems: 'center', 
    marginTop: 16, 
    marginBottom: 36 
  },
  brandingIconCircle: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1,
  },
  appTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginTop: 14,
    letterSpacing: -0.5,
  },
  tagline: { 
    fontSize: 13, 
    fontWeight: '500',
    marginTop: 2 
  },
  selectRoleText: { 
    fontSize: 16, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12 
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  roleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 16, 
    marginBottom: 14, 
    borderWidth: 1,
  },
  selectedCard: {
    borderWidth: 1.5,
  },
  disabledCard: {
    opacity: 0.6,
  },
  iconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  roleTextContainer: { 
    flex: 1, 
    marginLeft: 14 
  },
  roleTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 2 
  },
  roleSubtitle: { 
    fontSize: 12, 
    lineHeight: 16,
    fontWeight: '400'
  },
});