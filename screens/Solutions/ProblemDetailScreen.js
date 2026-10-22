import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../utils/theme';
import { useLanguage } from '../../utils/i18n';
import { solutionsAPI } from '../../utils/api';
import { useFocusEffect } from '@react-navigation/native';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProblemDetailScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const { t } = useLanguage();
  const { problemId } = route.params;

  const [problem, setProblem] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [upvoting, setUpvoting] = useState({});
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  useEffect(() => {
    loadUser();
    fetchProblemDetails();
  }, [problemId]);

  useFocusEffect(
    useCallback(() => {
      fetchProblemDetails();
    }, [problemId])
  );

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) setCurrentUser(JSON.parse(userStr));
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchProblemDetails = async () => {
    try {
      setLoading(true);
      const response = await solutionsAPI.getProblem(problemId);
      setProblem(response.problem);
      setSolutions(response.solutions || []);
    } catch (error) {
      console.error('Error fetching problem:', error);
      Alert.alert(t('error'), 'Failed to load problem details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProblemDetails();
    setRefreshing(false);
  };

  // ==================== UPVOTE PROBLEM ====================
  const handleUpvoteProblem = async () => {
    if (!problem) return;
    setUpvoting(prev => ({ ...prev, problem: true }));
    try {
      const response = await solutionsAPI.upvoteProblem(problem._id);
      setProblem(prev => ({
        ...prev,
        upvotes: response.upvotes,
        hasUpvoted: response.hasUpvoted,
      }));
    } catch (error) {
      Alert.alert(t('error'), 'Failed to upvote');
    } finally {
      setUpvoting(prev => ({ ...prev, problem: false }));
    }
  };

  // ==================== UPVOTE SOLUTION ====================
  const handleUpvoteSolution = async (solutionId) => {
    setUpvoting(prev => ({ ...prev, [solutionId]: true }));
    try {
      const response = await solutionsAPI.upvoteSolution(solutionId);
      setSolutions(prev =>
        prev.map(s =>
          s._id === solutionId
            ? { ...s, upvotes: response.upvotes, hasUpvoted: response.hasUpvoted }
            : s
        )
      );
    } catch (error) {
      Alert.alert(t('error'), 'Failed to upvote');
    } finally {
      setUpvoting(prev => ({ ...prev, [solutionId]: false }));
    }
  };

  // ==================== DELETE PROBLEM (OWNER ONLY) ====================
  const handleDeleteProblem = () => {
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
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('error') || 'Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ==================== DELETE SOLUTION (OWNER ONLY) ====================
  const handleDeleteSolution = (solutionId) => {
    Alert.alert(
      'Delete Solution',
      'Are you sure you want to delete this solution?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await solutionsAPI.deleteSolution(solutionId);
              Alert.alert(t('success') || 'Deleted', 'Solution deleted successfully');
              fetchProblemDetails();
            } catch (error) {
              Alert.alert(t('error') || 'Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ==================== OWNERSHIP CHECKS ====================
  const isProblemOwner = () => {
    if (!currentUser || !problem) return false;
    const ownerId = typeof problem.farmerId === 'object'
      ? problem.farmerId?._id?.toString()
      : problem.farmerId?.toString();
    return currentUser._id === ownerId;
  };

  const isSolutionOwner = (solution) => {
    if (!currentUser || !solution) return false;
    const ownerId = typeof solution.farmerId === 'object'
      ? solution.farmerId?._id?.toString()
      : solution.farmerId?.toString();
    return currentUser._id === ownerId;
  };

  const getFarmerName = (farmer) => {
    if (!farmer) return 'Unknown';
    return farmer.profile?.name || farmer.name || 'Farmer';
  };

  const getFarmerInitial = (farmer) => {
    return getFarmerName(farmer).charAt(0).toUpperCase();
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

  if (loading) {
    return (
      <View style={[styles.container, styles.loaderContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!problem) {
    return (
      <View style={[styles.container, styles.loaderContainer]}>
        <MaterialIcons name="error-outline" size={64} color={colors.textMuted} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Problem not found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.goBack, { color: colors.primary }]}>Return to Feed</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border + '20' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          Case Overview
        </Text>
        
        {isProblemOwner() ? (
          <TouchableOpacity onPress={handleDeleteProblem} style={styles.deleteHeaderBtn}>
            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Main Problem Card */}
        <View style={[styles.problemCard, { backgroundColor: colors.surface, borderColor: colors.border + '20' }]}>
          {/* Author & Meta Row */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {getFarmerInitial(problem.farmerId)}
              </Text>
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>
                {getFarmerName(problem.farmerId)}
              </Text>
              <Text style={[styles.postDate, { color: colors.textMuted }]}>
                {formatDate(problem.createdAt)}
              </Text>
            </View>
            <View style={[styles.cropBadge, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.cropText, { color: colors.primary }]}>
                {problem.cropType}
              </Text>
            </View>
          </View>

          {/* Description Block */}
          <Text style={[styles.problemTitle, { color: colors.text }]}>{problem.title}</Text>
          {problem.teluguTitle && (
            <Text style={[styles.teluguTitle, { color: colors.textSecondary }]}>{problem.teluguTitle}</Text>
          )}
          
          <Text style={[styles.problemDesc, { color: colors.textSecondary }]}>{problem.description}</Text>
          {problem.teluguDescription && (
            <Text style={[styles.teluguDesc, { color: colors.textMuted }]}>{problem.teluguDescription}</Text>
          )}

          {/* Location Badge */}
          {problem.location?.address && (
            <View style={styles.locationRow}>
              <MaterialIcons name="place" size={14} color={colors.textMuted} />
              <Text style={[styles.locationText, { color: colors.textMuted }]}>
                {problem.location.address}
              </Text>
            </View>
          )}

          {/* ==================== IMAGE VIEWER ==================== */}
          {problem.mediaUrl && (
            <TouchableOpacity
              style={styles.imageWrapper}
              onPress={() => setImageViewerVisible(true)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: problem.mediaUrl }}
                style={styles.problemImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <MaterialIcons name="fullscreen" size={20} color="#FFF" />
                <Text style={styles.imageOverlayText}>Tap to View Full Image</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Action Row */}
          <View style={[styles.actionRow, { borderTopColor: colors.border + '20' }]}>
            <TouchableOpacity
              style={[styles.upvoteBtn, { backgroundColor: problem.hasUpvoted ? colors.primary + '18' : colors.inputBg }]}
              onPress={handleUpvoteProblem}
              disabled={upvoting.problem}
            >
              {upvoting.problem ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <MaterialIcons
                    name={problem.hasUpvoted ? 'thumb-up' : 'thumb-up-off-alt'}
                    size={18}
                    color={problem.hasUpvoted ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.upvoteText, { color: problem.hasUpvoted ? colors.primary : colors.textMuted }]}>
                    {problem.upvotes || 0} {t('upvotes') || 'Helpful'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Solutions Feed */}
        <View style={styles.solutionsSection}>
          <View style={styles.solutionsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('solutions') || 'Community Solutions'} ({solutions.length})
            </Text>
            <TouchableOpacity
              style={[styles.addSolutionBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AddSolution', { problemId: problem._id })}
            >
              <MaterialIcons name="add" size={18} color="#FFF" />
              <Text style={styles.addSolutionText}>{t('addSolution') || 'Add Response'}</Text>
            </TouchableOpacity>
          </View>

          {solutions.length === 0 ? (
            <View style={[styles.emptySolutions, { backgroundColor: colors.surface, borderColor: colors.border + '20' }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
                <MaterialIcons name="lightbulb-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No responses yet. Be the first to assist with this case!
              </Text>
            </View>
          ) : (
            solutions.map((solution) => (
              <View key={solution._id} style={[styles.solutionCard, { backgroundColor: colors.surface, borderColor: colors.border + '20' }]}>
                <View style={styles.solutionAuthorRow}>
                  <View style={[styles.smallAvatar, { backgroundColor: '#10B981' + '18' }]}>
                    <Text style={[styles.smallAvatarText, { color: '#10B981' }]}>
                      {getFarmerInitial(solution.farmerId)}
                    </Text>
                  </View>
                  <View style={styles.solutionAuthorInfo}>
                    <Text style={[styles.solutionAuthorName, { color: colors.text }]}>
                      {getFarmerName(solution.farmerId)}
                    </Text>
                    <Text style={[styles.solutionDate, { color: colors.textMuted }]}>
                      {formatDate(solution.createdAt)}
                    </Text>
                  </View>
                  
                  {isSolutionOwner(solution) && (
                    <TouchableOpacity
                      style={styles.solutionDeleteBtn}
                      onPress={() => handleDeleteSolution(solution._id)}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[styles.solutionText, { color: colors.text }]}>
                  {solution.solution}
                </Text>
                {solution.teluguSolution && (
                  <Text style={[styles.solutionTelugu, { color: colors.textSecondary }]}>
                    {solution.teluguSolution}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.solutionUpvote, { backgroundColor: solution.hasUpvoted ? colors.primary + '18' : colors.inputBg }]}
                  onPress={() => handleUpvoteSolution(solution._id)}
                  disabled={upvoting[solution._id]}
                >
                  {upvoting[solution._id] ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <MaterialIcons
                        name={solution.hasUpvoted ? 'thumb-up' : 'thumb-up-off-alt'}
                        size={14}
                        color={solution.hasUpvoted ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.solutionUpvoteText, { color: solution.hasUpvoted ? colors.primary : colors.textMuted }]}>
                        {solution.upvotes || 0}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* ==================== FULLSCREEN IMAGE MODAL ==================== */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setImageViewerVisible(false)}
          >
            <MaterialIcons name="close" size={26} color="#FFF" />
          </TouchableOpacity>

          <Image
            source={{ uri: problem?.mediaUrl }}
            style={styles.fullImage}
            resizeMode="contain"
          />

          <Text style={styles.modalHint}>Tap × to close</Text>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, marginTop: 14, marginBottom: 20, fontWeight: '500' },
  goBackBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: colors.primary + '15' },
  goBack: { fontSize: 14, fontWeight: '700' },

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
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center', letterSpacing: -0.2 },
  deleteHeaderBtn: { 
    padding: 8, 
    borderRadius: 10, 
    backgroundColor: 'rgba(239, 68, 68, 0.1)' 
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // Problem Core Card
  problemCard: { 
    borderRadius: 18, 
    padding: 18, 
    marginBottom: 24, 
    borderWidth: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.3 : 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  authorInfo: { flex: 1, marginLeft: 12 },
  authorName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.1 },
  postDate: { fontSize: 12, marginTop: 2 },
  cropBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  cropText: { fontSize: 12, fontWeight: '700' },
  
  problemTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, lineHeight: 24 },
  teluguTitle: { fontSize: 14, marginBottom: 12 },
  problemDesc: { fontSize: 14, lineHeight: 22, marginBottom: 8 },
  teluguDesc: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  locationText: { fontSize: 12, fontWeight: '500' },

  // Inline Image Frame
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  problemImage: {
    width: '100%',
    height: 220,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imageOverlayText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  actionRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 4,
  },
  upvoteBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 12, 
    gap: 8 
  },
  upvoteText: { fontSize: 14, fontWeight: '700' },

  // Solutions Container
  solutionsSection: { marginBottom: 20 },
  solutionsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  addSolutionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 20, 
    gap: 4 
  },
  addSolutionText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  emptySolutions: { 
    borderRadius: 16, 
    padding: 30, 
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Modular Solution Card
  solutionCard: { 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkTheme ? 0.2 : 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  solutionAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  smallAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  smallAvatarText: { fontSize: 13, fontWeight: '700' },
  solutionAuthorInfo: { flex: 1, marginLeft: 10 },
  solutionAuthorName: { fontSize: 14, fontWeight: '700' },
  solutionDate: { fontSize: 11, marginTop: 1 },
  solutionDeleteBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  
  solutionText: { fontSize: 14, lineHeight: 21, marginBottom: 6 },
  solutionTelugu: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  
  solutionUpvote: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 10, 
    gap: 6 
  },
  solutionUpvoteText: { fontSize: 12, fontWeight: '700' },

  // Fullscreen Viewer
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    padding: 8,
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  modalHint: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});