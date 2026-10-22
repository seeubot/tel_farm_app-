import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../utils/theme';
import { useLanguage } from '../../utils/i18n';
import { solutionsAPI } from '../../utils/api';
import { useFocusEffect } from '@react-navigation/native';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const CROP_FILTERS = [
  'All',
  'Paddy',
  'Cotton',
  'Sugarcane',
  'Chilli',
  'Maize',
  'Groundnut',
  'Vegetables',
];

export default function SolutionsScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    loadUser();
    fetchProblems();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProblems();
    }, [selectedCrop])
  );

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedCrop !== 'All') {
        filters.crop = selectedCrop;
      }
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }
      const response = await solutionsAPI.getAllProblems(filters);
      setProblems(response.problems || []);
    } catch (error) {
      console.error('Error fetching problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProblems();
    setRefreshing(false);
  };

  const handleSearch = () => {
    fetchProblems();
  };

  // ==================== DELETE PROBLEM (OWNER ONLY) ====================
  const handleDeleteProblem = (problemId) => {
    Alert.alert(
      t('delete') || 'Delete Problem',
      'Are you sure you want to delete this problem? This action cannot be undone.',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await solutionsAPI.deleteProblem(problemId);
              Alert.alert(t('success') || 'Deleted', 'Problem deleted successfully');
              fetchProblems();
            } catch (error) {
              Alert.alert(t('error') || 'Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ==================== OWNERSHIP CHECK ====================
  const isProblemOwner = (problem) => {
    if (!currentUser || !problem) return false;
    const ownerId = typeof problem.farmerId === 'object'
      ? problem.farmerId?._id?.toString()
      : problem.farmerId?.toString();
    return currentUser._id === ownerId;
  };

  const getFarmerName = (farmer) => {
    if (!farmer) return 'Unknown';
    return farmer.profile?.name || farmer.name || 'Farmer';
  };

  const getFarmerInitial = (farmer) => {
    const name = getFarmerName(farmer);
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60));
    if (diff < 24) return `${diff}h ago`;
    const days = Math.floor(diff / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border + '20' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('communitySolutions') || 'Community Solutions'}
        </Text>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setSearchVisible(!searchVisible)} 
            style={[styles.headerIconBtn, searchVisible && { backgroundColor: colors.primary + '15' }]}
          >
            <MaterialIcons name="search" size={20} color={searchVisible ? colors.primary : colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Dropdown */}
      {searchVisible && (
        <View style={[styles.searchWrapper, { backgroundColor: colors.surface, borderColor: colors.border + '30' }]}>
          <MaterialIcons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search crop queries, pests, or diseases..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchProblems(); }}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Crop Filter Horizontal Carousel */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {CROP_FILTERS.map((crop) => {
            const isSelected = selectedCrop === crop;
            return (
              <TouchableOpacity
                key={crop}
                style={[
                  styles.filterChip,
                  isSelected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border + '30' },
                ]}
                onPress={() => setSelectedCrop(crop)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isSelected ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  {crop}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Problems Feed */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading community cases...</Text>
          </View>
        ) : problems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
              <MaterialIcons name="forum" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('noProblems') || 'No Queries Found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {t('beFirstToPost') || 'Be the first to post a query to get diagnostic feedback from community experts.'}
            </Text>
            <TouchableOpacity
              style={[styles.postProblemBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AddProblem')}
            >
              <MaterialIcons name="add" size={18} color="#FFF" />
              <Text style={styles.postProblemText}>{t('postProblem') || 'Post a Problem'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          problems.map((problem) => (
            <TouchableOpacity
              key={problem._id}
              style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: colors.border + '20' }]}
              onPress={() => navigation.navigate('ProblemDetail', { problemId: problem._id })}
              activeOpacity={0.9}
            >
              {/* Card Top Metadata Bar */}
              <View style={styles.cardHeader}>
                <View style={styles.cardAuthor}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {getFarmerInitial(problem.farmerId)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.authorName, { color: colors.text }]}>
                      {getFarmerName(problem.farmerId)}
                    </Text>
                    <Text style={[styles.postTime, { color: colors.textMuted }]}>
                      {formatDate(problem.createdAt)}
                    </Text>
                  </View>
                </View>

                {/* Owner Option Control */}
                {isProblemOwner(problem) && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteProblem(problem._id);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Crop & Sector Badges */}
              <View style={styles.cropRow}>
                <View style={[styles.cropBadge, { backgroundColor: colors.primary + '12' }]}>
                  <Text style={[styles.cropBadgeText, { color: colors.primary }]}>
                    {problem.cropType}
                  </Text>
                </View>
                {problem.location?.village && (
                  <View style={styles.locationRow}>
                    <MaterialIcons name="place" size={12} color={colors.textMuted} />
                    <Text style={[styles.locationText, { color: colors.textMuted }]}>
                      {problem.location.village}
                    </Text>
                  </View>
                )}
              </View>

              {/* Subject Description Block */}
              <Text style={[styles.problemTitle, { color: colors.text }]} numberOfLines={2}>
                {problem.title}
              </Text>
              <Text style={[styles.problemDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {problem.description}
              </Text>

              {/* Bottom Metrics Bar */}
              <View style={[styles.cardFooter, { borderTopColor: colors.border + '20' }]}>
                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="thumb-up-off-alt" size={15} color={colors.textMuted} />
                    <Text style={[styles.statText, { color: colors.textMuted }]}>
                      {problem.upvotes || 0}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <MaterialIcons name="chat-bubble-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.statText, { color: colors.textMuted }]}>
                      {problem.solutionCount || 0} {t('solutions') || 'solutions'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.viewDetailsRow}>
                  <Text style={[styles.viewDetailsText, { color: colors.primary }]}>View Case</Text>
                  <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddProblem')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Dropper
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 2 },

  // Horizontal Filters
  filterWrapper: {
    marginVertical: 12,
  },
  filterContent: { 
    paddingHorizontal: 16, 
    gap: 8, 
    alignItems: 'center' 
  },
  filterChip: { 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1 
  },
  filterText: { fontSize: 12, fontWeight: '600' },

  // Feed Scroll
  scrollContent: { paddingHorizontal: 16 },
  loaderContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { fontSize: 13, marginTop: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 18 },
  postProblemBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 20, 
    gap: 6 
  },
  postProblemText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Problem Cards
  problemCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  authorName: { fontSize: 13, fontWeight: '700' },
  postTime: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' },

  cropRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cropBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  cropBadgeText: { fontSize: 11, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  locationText: { fontSize: 11, fontWeight: '500' },

  problemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4, lineHeight: 20 },
  problemDesc: { fontSize: 12, lineHeight: 18 },

  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 12, 
    paddingTop: 10, 
    borderTopWidth: 1 
  },
  stats: { flexDirection: 'row', gap: 16 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, fontWeight: '600' },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailsText: { fontSize: 12, fontWeight: '700' },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});