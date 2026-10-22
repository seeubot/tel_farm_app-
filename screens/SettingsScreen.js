import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableNativeFeedback,
  Switch,
  Alert,
  Platform,
  StatusBar,
  Linking,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserData, getUserData } from '../utils/auth';
import { API_BASE_URL } from '../utils/api';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const PRIVACY_POLICY_URL = 'https://policy-agri.vercel.app/';
const SUPPORT_EMAIL = 'support@agriagent.com';
const FEEDBACK_EMAIL = 'feedback@agriagent.com';

const SettingsButton = ({ children, onPress, disabled, innerStyle }) => {
  if (Platform.OS === 'android') {
    return (
      <View style={stylesStatic.androidClipWrapper}>
        <TouchableNativeFeedback 
          onPress={onPress} 
          disabled={disabled}
          background={TouchableNativeFeedback.Ripple('rgba(150,150,150,0.08)', false)}
        >
          <View style={[stylesStatic.buttonInnerLayout, innerStyle]}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled} 
      activeOpacity={0.65} 
      style={[stylesStatic.buttonInnerLayout, innerStyle]}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function SettingsScreen({ navigation }) {
  const { colors, isDarkTheme, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [roleSwitchLoading, setRoleSwitchLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  // Modal Dialog UI States
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  const styles = useMemo(() => makeStyles(colors, isDarkTheme), [colors, isDarkTheme]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const userData = await getUserData();
      if (userData && userData.user) {
        setUser(userData.user);
        setUserRole(userData.user.role);
        setSelectedRole(userData.user.role);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 8, useNativeDriver: true })
      ]).start();
    }
  };

  const getAuthToken = async () => {
    return await AsyncStorage.getItem('userToken') || 
           await AsyncStorage.getItem('idToken') ||
           await AsyncStorage.getItem('authToken');
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    
    Alert.alert(
      t('logout'),
      t('confirmLogout'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              
              const cacheKeys = allKeys.filter(key => 
                key.startsWith('cache_') || 
                key.startsWith('search_history_') || 
                key.startsWith('draft_') ||
                key.startsWith('recent_') ||
                key.startsWith('temp_')
              );
              
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }
              
              const userSpecificKeys = allKeys.filter(key => 
                key.includes('_listings_') || 
                key.includes('_bookings_') || 
                key.includes('_favorites_') ||
                key.includes('_preferences_')
              );
              
              if (userSpecificKeys.length > 0) {
                await AsyncStorage.multiRemove(userSpecificKeys);
              }
              
              await clearUserData();
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSwitchRolePress = () => {
    const hasBasicProfile = user?.profile?.name;
    const hasContactInfo = user?.profile?.phone || user?.email;
    
    if (!hasBasicProfile || !hasContactInfo) {
      Alert.alert(
        'Complete Profile Required',
        'You need to complete your profile with name and contact information before switching roles.',
        [
          { text: t('cancel'), style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }
        ]
      );
      return;
    }
    
    setRoleModalVisible(true);
  };

  const handleRoleSelectDirect = async (role) => {
    if (roleSwitchLoading) return;
    
    setSelectedRole(role.toLowerCase());
    setRoleSwitchLoading(true);

    try {
      const token = await getAuthToken();

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

      setUserRole(role.toLowerCase());
      setUser(prev => ({ ...prev, role: role.toLowerCase() }));
      setRoleModalVisible(false);

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
      setRoleSwitchLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isLoggingOut) return;
    
    Alert.alert(
      t('deleteAccount'),
      'This action is permanent and cannot be undone. All your data including listings, bookings, messages, and profile information will be permanently deleted within 30 days.\n\nThis includes:\n- Your account and profile\n- All equipment listings\n- All produce listings\n- All booking history\n- All messages and solutions\n- All ad campaigns\n\nAre you sure you want to continue?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: 'Delete My Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your final warning. Your account and all associated data will be permanently removed.',
              [
                { text: 'Keep My Account', style: 'cancel' },
                {
                  text: 'Yes, Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    setIsLoggingOut(true);
                    setLoading(true);
                    try {
                      const token = await getAuthToken();
                      const response = await fetch(`${API_BASE_URL}/api/users/delete-account`, {
                        method: 'DELETE',
                        headers: { 
                          'Authorization': token ? `Bearer ${token}` : '',
                          'Content-Type': 'application/json'
                        },
                      });
                      
                      if (response.ok) {
                        await AsyncStorage.clear();
                        await clearUserData();
                        
                        Alert.alert(
                          'Account Deleted', 
                          'Your account has been scheduled for deletion and will be permanently removed within 30 days.',
                          [
                            { 
                              text: 'OK', 
                              onPress: () => {
                                navigation.reset({
                                  index: 0,
                                  routes: [{ name: 'Login' }],
                                });
                              }
                            }
                          ]
                        );
                      } else {
                        const errorData = await response.json().catch(() => ({}));
                        Alert.alert(
                          t('error'), 
                          errorData.error || 'Failed to delete account. Please try again or contact support.'
                        );
                      }
                    } catch (error) {
                      console.error('Delete account error:', error);
                      Alert.alert(
                        t('error'), 
                        'Network error occurred. Please check your connection and try again.'
                      );
                    } finally {
                      setLoading(false);
                      setIsLoggingOut(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const getUserName = () => {
    if (user?.profile?.name) return user.profile.name;
    if (user?.name) return user.name;
    if (user?.googleInfo?.name) return user.googleInfo.name;
    return 'User';
  };

  const getUserEmail = () => {
    if (user?.email) return user.email;
    if (user?.googleInfo?.email) return user.googleInfo.email;
    return 'No email';
  };

  const getUserRoleDisplay = () => {
    const role = user?.role || userRole || 'farmer';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getUserInitial = () => {
    const name = getUserName();
    return name.charAt(0)?.toUpperCase() || 'U';
  };

  if (loading && !user) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={isDarkTheme ? '#0F0F12' : '#F8FAFC'} />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={isDarkTheme ? '#0F0F12' : '#F8FAFC'} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton} 
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialIcons name="arrow-back-ios" size={16} color={colors.text} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <TouchableOpacity 
          style={styles.userCard} 
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {getUserInitial()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{getUserName()}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{getUserEmail()}</Text>
            <View style={styles.userRoleBadge}>
              <Text style={styles.userRoleText}>{getUserRoleDisplay()}</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>
          
          <SettingsButton onPress={() => navigation.navigate('Profile')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.primaryIconBg]}>
                <MaterialIcons name="person" size={16} color={colors.primary} />
              </View>
              <Text style={styles.settingText}>{t('editProfile')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>

          <View style={styles.divider} />
          
          <SettingsButton onPress={() => navigation.navigate('MyActivity')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.primaryIconBg]}>
                <MaterialIcons name="history" size={16} color={colors.primary} />
              </View>
              <Text style={styles.settingText}>{t('myActivity')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>

          <View style={styles.divider} />
          
          <SettingsButton onPress={handleSwitchRolePress}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.warningIconBg]}>
                <MaterialIcons name="swap-horiz" size={16} color={colors.warning || '#FF9800'} />
              </View>
              <Text style={styles.settingText}>{t('switchRole')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>{t('appearance')}</Text>
          
          <SettingsButton onPress={() => setThemeModalVisible(true)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.themeIconBg]}>
                <MaterialIcons name={isDarkTheme ? "dark-mode" : "light-mode"} size={16} color={colors.primary} />
              </View>
              <Text style={styles.settingText}>{t('darkTheme')}</Text>
            </View>
            <Text style={[styles.themeValueDisplay, { color: colors.textSecondary }]}>
              {isDarkTheme ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </SettingsButton>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>{t('language')} / भाषा / భాష</Text>
          
          <SettingsButton onPress={() => changeLanguage('en')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.infoIconBg]}>
                <MaterialIcons name="language" size={16} color="#0284C7" />
              </View>
              <Text style={[styles.settingText, language === 'en' && styles.activeLangText]}>English</Text>
            </View>
            {language === 'en' && <MaterialIcons name="check-circle" size={18} color={colors.primary} />}
          </SettingsButton>

          <View style={styles.divider} />
          
          <SettingsButton onPress={() => changeLanguage('hi')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.infoIconBg]}>
                <MaterialIcons name="language" size={16} color="#0284C7" />
              </View>
              <Text style={[styles.settingText, language === 'hi' && styles.activeLangText]}>हिन्दी (Hindi)</Text>
            </View>
            {language === 'hi' && <MaterialIcons name="check-circle" size={18} color={colors.primary} />}
          </SettingsButton>
          
          <View style={styles.divider} />

          <SettingsButton onPress={() => changeLanguage('te')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.infoIconBg]}>
                <MaterialIcons name="language" size={16} color="#0284C7" />
              </View>
              <Text style={[styles.settingText, language === 'te' && styles.activeLangText]}>తెలుగు (Telugu)</Text>
            </View>
            {language === 'te' && <MaterialIcons name="check-circle" size={18} color={colors.primary} />}
          </SettingsButton>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>{t('promotions') || 'Advertising'}</Text>
          
          <SettingsButton onPress={() => navigation.navigate('CreateAd')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.primaryIconBg]}>
                <MaterialIcons name="campaign" size={16} color={colors.primary} />
              </View>
              <Text style={styles.settingText}>{t('createAd') || 'Create Ad Campaign'}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>

          <View style={styles.divider} />
          
          <SettingsButton onPress={() => navigation.navigate('MyAds')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.primaryIconBg]}>
                <MaterialIcons name="history" size={16} color={colors.primary} />
              </View>
              <Text style={styles.settingText}>{t('myAds') || 'My Campaigns'}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.sectionTitle}>{t('legal')}</Text>
          
          <SettingsButton onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.neutralIconBg]}>
                <MaterialIcons name="privacy-tip" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.settingText}>{t('privacyPolicy')}</Text>
            </View>
            <MaterialIcons name="open-in-new" size={14} color={colors.textMuted} />
          </SettingsButton>

          <View style={styles.divider} />
          
          <SettingsButton onPress={() => navigation.navigate('Terms')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.neutralIconBg]}>
                <MaterialIcons name="description" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.settingText}>{t('termsConditions')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>
          
          <View style={styles.divider} />

          <SettingsButton onPress={() => navigation.navigate('About')}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.neutralIconBg]}>
                <MaterialIcons name="info" size={16} color={colors.textSecondary} />
              </View>
              <Text style={styles.settingText}>{t('about')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.supportTitle || styles.sectionTitle}>{t('support')}</Text>
          
          <SettingsButton onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.successIconBg]}>
                <MaterialIcons name="support-agent" size={16} color="#059669" />
              </View>
              <Text style={styles.settingText}>{t('contactSupport')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>

          <View style={styles.divider} />
          
          <SettingsButton onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}`)}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.successIconBg]}>
                <MaterialIcons name="feedback" size={16} color="#059669" />
              </View>
              <Text style={styles.settingText}>{t('sendFeedback')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </SettingsButton>
        </View>

        <View style={[styles.groupCard, styles.dangerBorder]}>
          <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
          
          <SettingsButton onPress={handleDeleteAccount}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, styles.dangerIconBg]}>
                <MaterialIcons name="delete-forever" size={16} color="#DC2626" />
              </View>
              <Text style={styles.dangerSettingText}>{t('deleteAccount')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#DC2626" />
          </SettingsButton>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]} 
          onPress={handleLogout} 
          activeOpacity={0.8}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={stylesStatic.logoutLoader} />
          ) : (
            <MaterialIcons name="logout" size={16} color="#FFFFFF" style={stylesStatic.logoutIcon} />
          )}
          <Text style={styles.logoutButtonText}>
            {isLoggingOut ? 'Signing out...' : t('logout')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.3</Text>
        <View style={stylesStatic.bottomSpace} />
      </Animated.ScrollView>

      {/* DIRECT IN-SETTINGS SWITCH ROLE MODAL */}
      <Modal
        visible={roleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setRoleModalVisible(false)}
        >
          <View style={[styles.dialogContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.dialogHeaderLine} />
            <Text style={[styles.dialogTitle, { color: colors.text }]}>{t('switchRole')}</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.textSecondary }]}>
              Select a role below to directly switch your active dashboard context.
            </Text>

            {/* Farmer Role Option Card */}
            <TouchableOpacity 
              style={[
                styles.roleCard, 
                { backgroundColor: colors.surface, borderColor: colors.border + '15' },
                (selectedRole === 'farmer' || userRole === 'farmer') && [styles.selectedCard, { borderColor: colors.primary, backgroundColor: colors.primary + '06' }],
                roleSwitchLoading && styles.disabledCard
              ]} 
              onPress={() => handleRoleSelectDirect('farmer')}
              disabled={roleSwitchLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: colors.primary + '12' }]}>
                <MaterialIcons name="agriculture" size={24} color={colors.primary} />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={[styles.roleTitle, { color: colors.text }]}>{t('farmer')}</Text>
                <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                  {t('farmerDesc') || 'Grow crops and manage your farm'}
                </Text>
              </View>
              {roleSwitchLoading && selectedRole === 'farmer' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons 
                  name={userRole === 'farmer' ? "check-circle" : "chevron-right"} 
                  size={20} 
                  color={userRole === 'farmer' ? colors.primary : colors.textMuted} 
                />
              )}
            </TouchableOpacity>

            {/* Labourer Role Option Card */}
            <TouchableOpacity 
              style={[
                styles.roleCard, 
                { backgroundColor: colors.surface, borderColor: colors.border + '15' },
                (selectedRole === 'labourer' || userRole === 'labourer') && [styles.selectedCard, { borderColor: '#F57C00', backgroundColor: '#FFF3E0' + '15' }],
                roleSwitchLoading && styles.disabledCard
              ]} 
              onPress={() => handleRoleSelectDirect('labourer')}
              disabled={roleSwitchLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: '#FFF3E0' }]}>
                <MaterialIcons name="work" size={22} color="#F57C00" />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={[styles.roleTitle, { color: colors.text }]}>{t('labourer')}</Text>
                <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                  {t('labourerDesc') || 'Find work in agricultural fields'}
                </Text>
              </View>
              {roleSwitchLoading && selectedRole === 'labourer' ? (
                <ActivityIndicator size="small" color="#F57C00" />
              ) : (
                <MaterialIcons 
                  name={userRole === 'labourer' ? "check-circle" : "chevron-right"} 
                  size={20} 
                  color={userRole === 'labourer' ? '#F57C00' : colors.textMuted} 
                />
              )}
            </TouchableOpacity>

            {/* Contractor Role Option Card */}
            <TouchableOpacity 
              style={[
                styles.roleCard, 
                { backgroundColor: colors.surface, borderColor: colors.border + '15' },
                (selectedRole === 'contractor' || userRole === 'contractor') && [styles.selectedCard, { borderColor: colors.primary, backgroundColor: colors.primary + '06' }],
                roleSwitchLoading && styles.disabledCard
              ]} 
              onPress={() => handleRoleSelectDirect('contractor')}
              disabled={roleSwitchLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconCircle, { backgroundColor: colors.primary + '12' }]}>
                <MaterialIcons name="groups" size={24} color={colors.primary} />
              </View>
              <View style={styles.roleTextContainer}>
                <Text style={[styles.roleTitle, { color: colors.text }]}>{t('contractor')}</Text>
                <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                  {t('contractorDesc') || 'Provide bulk workforce services'}
                </Text>
              </View>
              {roleSwitchLoading && selectedRole === 'contractor' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons 
                  name={userRole === 'contractor' ? "check-circle" : "chevron-right"} 
                  size={20} 
                  color={userRole === 'contractor' ? colors.primary : colors.textMuted} 
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dialogBtnSecondary, { backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9', marginTop: 8 }]}
              onPress={() => setRoleModalVisible(false)}
            >
              <Text style={[styles.dialogBtnSecondaryText, { color: colors.text }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CUSTOM DARK MODE THEME SELECTOR DIALOG MODAL */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlayCenter} 
          activeOpacity={1} 
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={[styles.centerDialogContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.centerDialogTitle, { color: colors.text }]}>Display Theme Preference</Text>
            <Text style={[styles.centerDialogSubtitle, { color: colors.textMuted }]}>
              Choose your preferred layout color appearance mode.
            </Text>

            <View style={styles.themeOptionsWrapper}>
              {/* Light Mode Row Button Option */}
              <TouchableOpacity 
                style={[styles.themeOptionRow, !isDarkTheme && { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]} 
                onPress={() => { if (isDarkTheme) toggleTheme(); setThemeModalVisible(false); }}
              >
                <View style={styles.themeOptionRowLeft}>
                  <MaterialIcons name="light-mode" size={20} color={!isDarkTheme ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.themeOptionLabel, { color: colors.text }, !isDarkTheme && { fontWeight: '700' }]}>Light Theme</Text>
                </View>
                {!isDarkTheme && <MaterialIcons name="radio-button-checked" size={18} color={colors.primary} />}
                {isDarkTheme && <MaterialIcons name="radio-button-unchecked" size={18} color={colors.textMuted} />}
              </TouchableOpacity>

              {/* Dark Mode Row Button Option */}
              <TouchableOpacity 
                style={[styles.themeOptionRow, isDarkTheme && { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]} 
                onPress={() => { if (!isDarkTheme) toggleTheme(); setThemeModalVisible(false); }}
              >
                <View style={styles.themeOptionRowLeft}>
                  <MaterialIcons name="dark-mode" size={20} color={isDarkTheme ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.themeOptionLabel, { color: colors.text }, isDarkTheme && { fontWeight: '700' }]}>Dark Theme</Text>
                </View>
                {isDarkTheme && <MaterialIcons name="radio-button-checked" size={18} color={colors.primary} />}
                {!isDarkTheme && <MaterialIcons name="radio-button-unchecked" size={18} color={colors.textMuted} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.centerDialogCloseBtn, { backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9' }]}
              onPress={() => setThemeModalVisible(false)}
            >
              <Text style={[styles.centerDialogCloseText, { color: colors.text }]}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  androidClipWrapper: { 
    overflow: 'hidden' 
  },
  buttonInnerLayout: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16 
  },
  logoutIcon: { 
    marginRight: 6 
  },
  logoutLoader: {
    marginRight: 6
  },
  bottomSpace: { 
    height: 24 
  }
});

const makeStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkTheme ? '#0F0F12' : '#F8FAFC' 
  },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 24 
  },
  centerLoader: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: STATUS_BAR_HEIGHT + 10, 
    paddingBottom: 10 
  },
  backButton: { 
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.text, 
    letterSpacing: -0.2 
  },
  headerSpacer: { 
    width: 38 
  },
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 16, 
    padding: 14, 
    marginBottom: 16, 
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border + '15',
  },
  userAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: colors.primary + '15', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: colors.border + '10' 
  },
  userAvatarText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.primary 
  },
  userInfo: { 
    flex: 1, 
    marginLeft: 12, 
    paddingRight: 4 
  },
  userName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.text, 
    letterSpacing: -0.1 
  },
  userEmail: { 
    fontSize: 12, 
    marginTop: 1, 
    color: colors.textSecondary, 
    fontWeight: '500' 
  },
  userRoleBadge: { 
    backgroundColor: isDarkTheme ? colors.border + '20' : '#E2E8F0', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6, 
    alignSelf: 'flex-start', 
    marginTop: 4 
  },
  userRoleText: { 
    fontSize: 9, 
    fontWeight: '700', 
    color: colors.primary, 
    textTransform: 'uppercase', 
    letterSpacing: 0.3 
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border + '15',
  },
  dangerBorder: { 
    borderColor: isDarkTheme ? '#DC262630' : '#FEE2E2' 
  },
  sectionTitle: { 
    fontSize: 10, 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginTop: 10, 
    marginBottom: 6, 
    marginLeft: 16, 
    color: colors.primary 
  },
  supportTitle: {
    fontSize: 10, 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginTop: 10, 
    marginBottom: 6, 
    marginLeft: 16, 
    color: '#059669' 
  },
  dangerSectionTitle: { 
    fontSize: 10, 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginTop: 10, 
    marginBottom: 6, 
    marginLeft: 16, 
    color: '#DC2626' 
  },
  settingItemStyle: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 6, 
    paddingHorizontal: 16 
  },
  settingInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    paddingRight: 8 
  },
  settingText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: colors.text, 
    flex: 1 
  },
  themeValueDisplay: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4
  },
  dangerSettingText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#DC2626', 
    flex: 1 
  },
  activeLangText: { 
    color: colors.primary, 
    fontWeight: '700' 
  },
  iconWrapper: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  primaryIconBg: { 
    backgroundColor: colors.primary + '10' 
  },
  warningIconBg: { 
    backgroundColor: isDarkTheme ? '#2A1A1A' : '#FFF3E0' 
  },
  themeIconBg: { 
    backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9' 
  },
  infoIconBg: { 
    backgroundColor: isDarkTheme ? '#102A45' : '#E0F2FE' 
  },
  neutralIconBg: { 
    backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9' 
  },
  successIconBg: { 
    backgroundColor: isDarkTheme ? '#062E1E' : '#ECFDF5' 
  },
  dangerIconBg: { 
    backgroundColor: isDarkTheme ? '#2D1010' : '#FEE2E2' 
  },
  divider: { 
    height: StyleSheet.hairlineWidth, 
    backgroundColor: colors.border + '15', 
    marginLeft: 60, 
    marginRight: 16 
  },
  logoutButton: { 
    backgroundColor: '#EF4444', 
    paddingVertical: 12, 
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 2,
  },
  logoutButtonDisabled: {
    opacity: 0.7
  },
  logoutButtonText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '700', 
  },
  versionText: { 
    textAlign: 'center', 
    fontSize: 11, 
    marginTop: 20, 
    fontWeight: '600', 
    color: colors.textMuted, 
    opacity: 0.5 
  },

  // Modal Sheet Standard UIs
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  dialogContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    width: '100%',
  },
  dialogHeaderLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  dialogSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  roleCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 14, 
    marginBottom: 10, 
    borderWidth: 1,
  },
  selectedCard: {
    borderWidth: 1.5,
  },
  disabledCard: {
    opacity: 0.6,
  },
  roleIconCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  roleTextContainer: { 
    flex: 1, 
    marginLeft: 12 
  },
  roleTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    marginBottom: 2 
  },
  roleSubtitle: { 
    fontSize: 11, 
    lineHeight: 15,
    fontWeight: '400'
  },
  dialogBtnSecondary: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Centered Alert Dialogs Styles
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  centerDialogContainer: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
  },
  centerDialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  centerDialogSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  themeOptionsWrapper: {
    gap: 10,
    marginBottom: 18,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  centerDialogCloseBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDialogCloseText: {
    fontSize: 13,
    fontWeight: '600',
  },
});