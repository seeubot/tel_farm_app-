import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../utils/theme';
import { useLanguage } from '../utils/i18n';
import { equipmentAPI, solutionsAPI, API_BASE_URL } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '../utils/auth';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTIVITY_CACHE_KEY = 'cache_my_activity_data';

// Helper: Fetch with timeout to prevent network hanging
const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export default function MyActivity({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('equipment');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [produce, setProduce] = useState([]);
  const [problems, setProblems] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [shops, setShops] = useState([]);

  /* Custom Confirmation Modal State */
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(''); // 'equipment', 'produce', 'problems', 'solutions', 'shops'

  const tabs = useMemo(() => [
    { key: 'equipment', label: t('equipment') || 'Equipment', icon: 'build', activeColor: colors.primary },
    { key: 'produce', label: t('produce') || 'Produce', icon: 'grass', activeColor: '#10B981' },
    { key: 'problems', label: t('problems') || 'Problems', icon: 'help-outline', activeColor: '#F59E0B' },
    { key: 'solutions', label: t('solutions') || 'Solutions', icon: 'lightbulb-outline', activeColor: '#8B5CF6' },
    { key: 'shops', label: t('shops') || 'Shops', icon: 'store', activeColor: '#3B82F6' },
  ], [colors.primary, t]);

  const getAuthToken = async () => {
    return await AsyncStorage.getItem('userToken') || 
           await AsyncStorage.getItem('idToken') ||
           await AsyncStorage.getItem('authToken');
  };

  // Instant local cache restoration
  const loadCachedData = async () => {
    try {
      const cached = await AsyncStorage.getItem(ACTIVITY_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.equipment) setEquipment(parsed.equipment);
        if (parsed.produce) setProduce(parsed.produce);
        if (parsed.problems) setProblems(parsed.problems);
        if (parsed.solutions) setSolutions(parsed.solutions);
        if (parsed.shops) setShops(parsed.shops);
        setLoading(false);
      }
    } catch (e) {
      console.log('Cache read error:', e);
    }
  };

  const fetchAllData = async (isSilentRefresh = false) => {
    if (!isSilentRefresh) setLoading(true);
    try {
      const token = await getAuthToken();
      const userData = await getUserData();
      const userId = userData?.user?._id;

      if (!userId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Parallel execution with Promise.allSettled
      const [eqResult, prodResult, probResult, solResult, shopResult] = await Promise.allSettled([
        fetchWithTimeout(`${API_BASE_URL}/api/equipment?owner=${userId}`, { headers }, 5000),
        fetchWithTimeout(`${API_BASE_URL}/api/produce?farmer=${userId}`, { headers }, 5000),
        fetchWithTimeout(`${API_BASE_URL}/api/problems?farmer=${userId}`, { headers }, 5000),
        solutionsAPI.getAllProblems(),
        fetchWithTimeout(`${API_BASE_URL}/api/fertilizer-shops?addedBy=${userId}`, { headers }, 5000),
      ]);

      let newEq = [];
      let newProd = [];
      let newProb = [];
      let newSol = [];
      let newShop = [];

      // Parse Equipment
      if (eqResult.status === 'fulfilled' && eqResult.value?.ok) {
        const data = await eqResult.value.json();
        if (data.success && data.equipment) {
          newEq = data.equipment.filter(e => e?.ownerId === userId || e?.ownerId?._id === userId);
          setEquipment(newEq);
        }
      }

      // Parse Produce
      if (prodResult.status === 'fulfilled' && prodResult.value?.ok) {
        const data = await prodResult.value.json();
        if (data.success && data.produce) {
          newProd = data.produce.filter(p => p?.farmerId === userId || p?.farmerId?._id === userId);
          setProduce(newProd);
        }
      }

      // Parse Problems
      if (probResult.status === 'fulfilled' && probResult.value?.ok) {
        const data = await probResult.value.json();
        if (data.success && data.problems) {
          newProb = data.problems.filter(p => p?.farmerId === userId || p?.farmerId?._id === userId);
          setProblems(newProb);
        }
      }

      // Parse Solutions
      if (solResult.status === 'fulfilled' && solResult.value?.problems) {
        const allProblems = solResult.value.problems || [];
        for (const problem of allProblems) {
          if (problem?.solutions) {
            const mySols = problem.solutions.filter(s => s?.farmerId === userId || s?.farmerId?._id === userId);
            newSol.push(...mySols.map(s => ({ ...s, problemTitle: problem.title, problemId: problem._id })));
          }
        }
        setSolutions(newSol);
      }

      // Parse Shops
      if (shopResult.status === 'fulfilled' && shopResult.value?.ok) {
        const data = await shopResult.value.json();
        if (data.success && data.shops) {
          newShop = data.shops.filter(s => s?.addedBy === userId || s?.addedBy?._id === userId);
          setShops(newShop);
        }
      }

      // Save fresh data to local cache
      AsyncStorage.setItem(
        ACTIVITY_CACHE_KEY,
        JSON.stringify({
          equipment: newEq,
          produce: newProd,
          problems: newProb,
          solutions: newSol,
          shops: newShop,
        })
      ).catch(() => {});

    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadCachedData().then(() => fetchAllData(true));
  }, []));

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData(true);
  };

  const requestDelete = (item, type) => {
    // Validate type
    const validTypes = ['equipment', 'produce', 'problems', 'solutions', 'shops'];
    if (!validTypes.includes(type)) {
      console.error('Invalid delete type:', type);
      return;
    }
    
    setItemToDelete(item);
    setDeleteType(type);
    setConfirmModalVisible(true);
  };

  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    const item = itemToDelete;
    const token = await getAuthToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      let url = '';
      if (deleteType === 'equipment') url = `${API_BASE_URL}/api/equipment/${item._id}`;
      else if (deleteType === 'produce') url = `${API_BASE_URL}/api/produce/${item._id}`;
      else if (deleteType === 'problems') url = `${API_BASE_URL}/api/problems/${item._id}`;
      else if (deleteType === 'solutions') url = `${API_BASE_URL}/api/solutions/${item._id}`;
      else if (deleteType === 'shops') url = `${API_BASE_URL}/api/fertilizer-shops/${item._id}`;

      const response = await fetch(url, { method: 'DELETE', headers });
      if (response.ok) {
        if (deleteType === 'equipment') setEquipment(prev => prev.filter(e => e._id !== item._id));
        else if (deleteType === 'produce') setProduce(prev => prev.filter(p => p._id !== item._id));
        else if (deleteType === 'problems') setProblems(prev => prev.filter(p => p._id !== item._id));
        else if (deleteType === 'solutions') setSolutions(prev => prev.filter(s => s._id !== item._id));
        else if (deleteType === 'shops') setShops(prev => prev.filter(s => s._id !== item._id));
      }
    } catch (error) {
      console.error('Failed to delete item', error);
    } finally {
      setConfirmModalVisible(false);
      setItemToDelete(null);
      setDeleteType('');
    }
  };

  /* Navigation actions */
  const handleEditEquipment = (item) => {
    navigation.navigate('PostRental', { editMode: true, equipmentData: item });
  };

  const handleEditProblem = (item) => {
    navigation.navigate('AddProblem', { editMode: true, problemData: item });
  };

  const handleEditSolution = (item) => {
    navigation.navigate('AddSolution', { 
      editMode: true, 
      solutionData: item,
      problemId: item.problemId,
      problemTitle: item.problemTitle 
    });
  };

  const handleBackNavigation = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderEquipmentCard = (item) => {
    if (!item) return null;
    return (
      <View key={item._id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIconBox, { backgroundColor: colors.primary + '15' }]}>
            <MaterialIcons name="build" size={22} color={colors.primary} />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.name || 'Unnamed Equipment'}
              </Text>
              <View style={[styles.badgeContainer, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>{item.category || 'General'}</Text>
              </View>
            </View>
            <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
              {t('cost') || 'Cost'}: <Text style={styles.priceHighlight}>₹{item.pricing?.perDay || item.price || 0} {t('perDay') || '/ day'}</Text>
            </Text>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]} 
            onPress={() => handleEditEquipment(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('edit') || 'Edit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={() => requestDelete(item, 'equipment')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: '#DC2626' }]}>{t('delete') || 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderProduceCard = (item) => {
    if (!item) return null;
    const minOrderVal = item?.minOrder || item?.minOrderQuantity || item?.minimumOrder || null;

    return (
      <View key={item._id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIconBox, { backgroundColor: '#E6F4EA' }]}>
            <MaterialIcons name="grass" size={22} color="#059669" />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.cropName || item.title || 'Agricultural Produce'}
              </Text>
              <View style={[styles.badgeContainer, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.badgeText, { color: '#065F46' }]}>{item.quantity || 0} {item.unit || 'Kg'}</Text>
              </View>
            </View>
            <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
              {t('price') || 'Price'}: <Text style={[styles.priceHighlight, { color: '#059669' }]}>₹{item.price || 0}/{item.priceUnit || item.unit || 'Kg'}</Text>
            </Text>
            {minOrderVal && (
              <Text style={[styles.itemMetaSub, { color: colors.textMuted }]}>
                Min. Order: {minOrderVal} {item.unit || 'Kg'}
              </Text>
            )}
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]} 
            onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
            activeOpacity={0.7}
          >
            <MaterialIcons name="visibility" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('view') || 'View'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={() => requestDelete(item, 'produce')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: '#DC2626' }]}>{t('delete') || 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderProblemCard = (item) => {
    if (!item) return null;
    return (
      <View key={item._id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIconBox, { backgroundColor: '#FEF3C7' }]}>
            <MaterialIcons name="help-outline" size={22} color="#D97706" />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.title || 'Crop Query'}
              </Text>
              <View style={[styles.badgeContainer, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.badgeText, { color: '#92400E' }]}>{item.cropType || 'General'}</Text>
              </View>
            </View>
            <View style={styles.microStatsRow}>
              <View style={styles.statsIndicator}>
                <MaterialIcons name="comment" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>{item.solutionCount || 0} {t('solutions') || 'Solutions'}</Text>
              </View>
              <View style={[styles.statsIndicator, { marginLeft: 12 }]}>
                <MaterialIcons name="thumb-up" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>{item.upvotes || 0} {t('upvotes') || 'Upvotes'}</Text>
              </View>
            </View>
            <View style={styles.dateRow}>
              <MaterialIcons name="event" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]} 
            onPress={() => handleEditProblem(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('edit') || 'Edit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={() => requestDelete(item, 'problems')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: '#DC2626' }]}>{t('delete') || 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSolutionCard = (item) => {
    if (!item) return null;
    return (
      <View key={item._id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIconBox, { backgroundColor: '#F3E8FF' }]}>
            <MaterialIcons name="lightbulb-outline" size={22} color="#7C3AED" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
              {item.solution || 'Proposed Solution'}
            </Text>
            {item.problemTitle && (
              <Text style={[styles.itemMeta, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
                {t('onQuestion') || 'On Question'}: <Text style={styles.boldProblemTitle}>{item.problemTitle}</Text>
              </Text>
            )}
            <View style={[styles.microStatsRow, { marginTop: 4 }]}>
              <View style={styles.statsIndicator}>
                <MaterialIcons name="thumb-up" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>{item.upvotes || 0} {t('helpfulVotes') || 'Helpful'}</Text>
              </View>
            </View>
            <View style={[styles.dateRow, { marginTop: 4 }]}>
              <MaterialIcons name="event" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]} 
            onPress={() => handleEditSolution(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('edit') || 'Edit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={() => requestDelete(item, 'solutions')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: '#DC2626' }]}>{t('delete') || 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderShopCard = (item) => {
    if (!item) return null;
    return (
      <View key={item._id} style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIconBox, { backgroundColor: '#E0F2FE' }]}>
            <MaterialIcons name="store" size={22} color="#0284C7" />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                {item.name || 'Fertilizer Store'}
              </Text>
              <View style={[styles.badgeContainer, { backgroundColor: item.isVerified ? '#D1FAE5' : '#F3F4F6' }]}>
                <Text style={[styles.badgeText, { color: item.isVerified ? '#065F46' : '#4B5563' }]}>
                  {item.isVerified ? (t('verified') || 'Verified') : (t('pending') || 'Pending')}
                </Text>
              </View>
            </View>
            <View style={[styles.dateRow, { marginTop: 4, marginBottom: 4 }]}>
              <MaterialIcons name="location-on" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
              <Text style={[styles.itemMeta, { color: colors.textSecondary, marginBottom: 0 }]} numberOfLines={1}>
                {item.location?.village || item.location?.address || item.address || (t('noLocationAddress') || 'Location not specified')}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.primary + '10' }]} 
            onPress={() => navigation.navigate('FertilizerShops', { shopId: item._id })}
            activeOpacity={0.7}
          >
            <MaterialIcons name="visibility" size={16} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t('viewShopDetails') || 'View Details'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.deleteBtn]} 
            onPress={() => requestDelete(item, 'shops')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionText, { color: '#DC2626' }]}>{t('delete') || 'Delete'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'equipment': return equipment;
      case 'produce': return produce;
      case 'problems': return problems;
      case 'solutions': return solutions;
      case 'shops': return shops;
      default: return [];
    }
  };

  const renderItem = (item) => {
    switch (activeTab) {
      case 'equipment': return renderEquipmentCard(item);
      case 'produce': return renderProduceCard(item);
      case 'problems': return renderProblemCard(item);
      case 'solutions': return renderSolutionCard(item);
      case 'shops': return renderShopCard(item);
      default: return null;
    }
  };

  const currentData = getCurrentData();

  const styles = useMemo(() => getStyles(colors, isDarkTheme), [colors, isDarkTheme]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={isDarkTheme ? '#0F172A' : '#FFFFFF'} />
      
      {/* Modern Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back-ios" size={18} color={colors.text} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.title}>{t('myActivity') || 'My Activity'}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('myActivitySubtitle') || 'Manage all your created listings and posts'}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Horizontal Scrollable Filter Tabs */}
      <View style={styles.tabBarWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsContainer} 
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map(tab => {
            const isTabActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.8}
                style={[
                  styles.tab, 
                  isTabActive && { backgroundColor: tab.activeColor + '12', borderColor: tab.activeColor }
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <MaterialIcons 
                  name={tab.icon} 
                  size={16} 
                  color={isTabActive ? tab.activeColor : colors.textMuted} 
                />
                <Text style={[
                  styles.tabText, 
                  isTabActive ? { color: tab.activeColor, fontWeight: '700' } : { color: colors.textMuted }
                ]}>
                  {tab.label}
                </Text>
                <View style={[
                  styles.tabCount, 
                  { backgroundColor: isTabActive ? tab.activeColor : colors.border + '50' }
                ]}>
                  <Text style={[
                    styles.tabCountText, 
                    { color: isTabActive ? '#FFF' : colors.textSecondary }
                  ]}>
                    {tab.key === 'equipment' ? equipment.length :
                     tab.key === 'produce' ? produce.length :
                     tab.key === 'problems' ? problems.length :
                     tab.key === 'solutions' ? solutions.length :
                     shops.length}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Scrollable Content Body */}
      {loading && currentData.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t('loadingActivity') || 'Fetching activity logs...'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {currentData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
                <MaterialIcons name="inventory" size={42} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>{t('noItemsYet') || 'No Activity Records'}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {(t('itemsWillAppearHere') || 'Items in {type} will show up here once posted.').replace('{type}', tabs.find(tab => tab.key === activeTab)?.label?.toLowerCase() || '')}
              </Text>
            </View>
          ) : (
            currentData.map(item => renderItem(item))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Modern Confirmation Bottom Dialog Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackgroundDismiss} 
            activeOpacity={1} 
            onPress={() => setConfirmModalVisible(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalIndicator} />
            <View style={styles.modalHeaderIconContainer}>
              <MaterialIcons name="warning" size={30} color="#DC2626" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('confirmDeleteTitle') || 'Delete Listing?'}
            </Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              {t('confirmDeleteMessage') || 'Are you sure you want to permanently delete this item? This action cannot be undone.'}
            </Text>

            {itemToDelete && (
              <View style={[styles.modalTargetCard, { backgroundColor: colors.border + '15', borderColor: colors.border + '25' }]}>
                <Text style={[styles.modalTargetTitle, { color: colors.text }]} numberOfLines={1}>
                  {itemToDelete.name || itemToDelete.cropName || itemToDelete.title || itemToDelete.solution || 'Selected Item'}
                </Text>
                <Text style={[styles.modalTargetCategory, { color: colors.primary }]}>
                  {deleteType.toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.modalActionButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel, { borderColor: colors.border + '30', backgroundColor: isDarkTheme ? '#1E293B' : '#F1F5F9' }]} 
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={[styles.modalBtnCancelText, { color: colors.text }]}>{t('keepIt') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm]} 
                onPress={handleExecuteDelete}
              >
                <Text style={styles.modalBtnConfirmText}>{t('deletePermanently') || 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkTheme ? '#0F172A' : '#F8FAFC' 
  },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: STATUS_BAR_HEIGHT + 10, 
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '15',
  },
  backButton: { 
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDarkTheme ? '#1E293B' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  title: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: colors.text, 
    letterSpacing: -0.3 
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  headerSpacer: { width: 36 },
  
  tabBarWrapper: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '15',
  },
  tabsContainer: { maxHeight: 46 },
  tabsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 20, 
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: isDarkTheme ? '#1E293B' : '#F1F5F9'
  },
  tabText: { fontSize: 12, fontWeight: '600' },
  tabCount: { 
    paddingHorizontal: 6, 
    paddingVertical: 1, 
    borderRadius: 10, 
    minWidth: 20, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: { fontSize: 10, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  loadingText: { marginTop: 10, fontSize: 13, fontWeight: '500' },

  itemCard: { 
    borderRadius: 18, 
    padding: 14, 
    marginBottom: 12, 
    borderWidth: 1, 
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  itemIconBox: { 
    width: 42, 
    height: 42, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  itemInfo: { flex: 1 },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    gap: 8
  },
  itemName: { fontSize: 15, fontWeight: '700', flex: 1, letterSpacing: -0.2 },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  itemMeta: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  itemMetaSub: { fontSize: 11, fontWeight: '400', marginBottom: 2 },
  priceHighlight: { fontWeight: '700' },
  boldProblemTitle: { fontWeight: '700', textDecorationLine: 'underline' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  itemDate: { fontSize: 11, fontWeight: '500' },
  
  microStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  statsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  itemActions: { 
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 12, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: colors.border + '15' 
  },
  actionBtn: { 
    flex: 1,
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 8, 
    borderRadius: 10, 
    gap: 6,
  },
  deleteBtn: { backgroundColor: isDarkTheme ? '#3B1A1A' : '#FEE2E2' },
  actionText: { fontSize: 12, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyText: { fontSize: 16, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  emptySubtext: { fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 18 },

  /* Bottom Dialog Action Sheet Modal Styling */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalBackgroundDismiss: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    alignItems: 'center',
  },
  modalIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  modalTargetCard: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  modalTargetTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
  },
  modalTargetCategory: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    borderWidth: 1,
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalBtnConfirm: {
    backgroundColor: '#DC2626',
  },
  modalBtnConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});