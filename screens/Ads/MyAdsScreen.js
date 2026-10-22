import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import { API_BASE_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function MyAdsScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI filter and search states (fully processed on frontend to keep backend identical)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchMyAds();
  }, []);

  const fetchMyAds = async () => {
    try {
      const token = await AsyncStorage.getItem('idToken');
      const response = await fetch(`${API_BASE_URL}/api/ads/my-ads`, {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setAds(data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyAds();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';     // Vibrant Emerald / Cyber Mint
      case 'pending': return '#F59E0B';    // Deep Amber
      case 'paused': return '#6366F1';     // Royal Indigo
      case 'completed': return '#6B7280';  // Cool Slate Gray
      case 'rejected': return '#EF4444';   // Clean Crimson
      default: return '#9CA3AF';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'In Review';
      case 'paused': return 'Paused';
      case 'completed': return 'Finished';
      case 'rejected': return 'Rejected';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const summaryMetrics = useMemo(() => {
    let active = 0;
    let totalSpend = 0;
    let totalViews = 0;
    let totalClicks = 0;

    ads.forEach(ad => {
      if (ad.status === 'active') active++;
      totalSpend += Number(ad.budget) || 0;
      totalViews += Number(ad.impressions) || 0;
      totalClicks += Number(ad.clicks) || 0;
    });

    const overallCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

    return {
      active,
      totalSpend,
      totalViews,
      overallCtr
    };
  }, [ads]);

  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesSearch = 
        ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ad.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        selectedStatus === 'all' || 
        ad.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [ads, searchQuery, selectedStatus]);

  const styles = getStyles(colors, isDarkTheme);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerAlign]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Campaigns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      {/* HEADER SECTION */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Campaigns</Text>
          <Text style={[styles.subTitle, { color: colors.textSecondary }]}>Manage and monitor ads</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary + '18' }]}
          onPress={() => navigation.navigate('CreateAd')}
        >
          <MaterialIcons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]} 
            tintColor={colors.primary}
          />
        }
      >
        {/* METRICS SUMMARY CARD GRID */}
        {ads.length > 0 && (
          <View style={styles.dashboardContainer}>
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border + '18' }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: colors.primary + '12' }]}>
                  <MaterialCommunityIcons name="wallet-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Budget</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>₹{summaryMetrics.totalSpend}</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border + '18' }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#10B98112' }]}>
                  <Ionicons name="eye-outline" size={18} color="#10B981" />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Impressions</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{summaryMetrics.totalViews}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border + '18' }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#6366F112' }]}>
                  <MaterialCommunityIcons name="rocket-launch-outline" size={18} color="#6366F1" />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Active Ads</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{summaryMetrics.active}</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border + '18' }]}>
                <View style={[styles.metricIconWrap, { backgroundColor: '#F59E0B12' }]}>
                  <MaterialCommunityIcons name="trending-up" size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Avg. CTR</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{summaryMetrics.overallCtr}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* SEARCH AND FILTER BAR */}
        {ads.length > 0 && (
          <View style={styles.filterSection}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border + '20' }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                placeholder="Search campaigns..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusChipsContainer}
            >
              {['all', 'active', 'pending', 'paused', 'completed', 'rejected'].map((status) => {
                const isActive = selectedStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setSelectedStatus(status)}
                    style={[
                      styles.statusChip,
                      { 
                        backgroundColor: isActive ? colors.primary : colors.surface,
                        borderColor: isActive ? colors.primary : colors.border + '20'
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.statusChipText, 
                        { color: isActive ? '#FFF' : colors.textSecondary }
                      ]}
                    >
                      {status === 'all' ? 'All Ads' : getStatusText(status)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* CAMPAIGNS FEED / EMPTY STATES */}
        {filteredAds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBackground, { backgroundColor: colors.primary + '0D' }]}>
              <MaterialCommunityIcons name="bullhorn-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {ads.length === 0 ? 'Grow Your Business' : 'No matches found'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {ads.length === 0 
                ? 'Launch your first advertising campaign to reach thousands of potential local buyers.' 
                : 'Try adjusting your search query or selecting a different status filter.'}
            </Text>
            {ads.length === 0 && (
              <TouchableOpacity 
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateAd')}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.createButtonText}>Create Campaign</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredAds.map((ad) => (
            <View key={ad._id} style={[styles.adCard, { backgroundColor: colors.surface, borderColor: colors.border + '20' }]}>
              <View style={styles.adHeader}>
                <View style={styles.adTitleContainer}>
                  <Text style={[styles.adTitle, { color: colors.text }]} numberOfLines={1}>
                    {ad.title}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ad.status) + '15' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(ad.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(ad.status) }]}>
                    {getStatusText(ad.status)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.adDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {ad.description}
              </Text>

              {/* Statistical Pill Grid inside the Ad card */}
              <View style={[styles.adStats, { backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
                <View style={styles.statItem}>
                  <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
                  <View style={styles.statTextWrap}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{ad.impressions || 0}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Views</Text>
                  </View>
                </View>

                <View style={[styles.verticalDivider, { backgroundColor: colors.border + '20' }]} />

                <View style={styles.statItem}>
                  <Ionicons name="finger-print-outline" size={14} color={colors.textSecondary} />
                  <View style={styles.statTextWrap}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{ad.clicks || 0}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>Clicks</Text>
                  </View>
                </View>

                <View style={[styles.verticalDivider, { backgroundColor: colors.border + '20' }]} />

                <View style={styles.statItem}>
                  <Ionicons name="analytics-outline" size={14} color={colors.textSecondary} />
                  <View style={styles.statTextWrap}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{ad.ctr || 0}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>CTR</Text>
                  </View>
                </View>
              </View>

              {/* Card Footer highlighting dates and budget visually */}
              <View style={[styles.adFooter, { borderTopColor: colors.border + '20' }]}>
                <View style={styles.footerLeft}>
                  <Text style={[styles.budgetLabel, { color: colors.textMuted }]}>BUDGET</Text>
                  <View style={styles.budgetRow}>
                    <Text style={[styles.adBudget, { color: colors.text }]}>₹{ad.budget}</Text>
                    <Text style={[styles.adDuration, { color: colors.textSecondary }]}>/ {ad.duration} days</Text>
                  </View>
                </View>
                <View style={styles.footerRight}>
                  <MaterialIcons name="calendar-today" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={[styles.adDate, { color: colors.textSecondary }]}>
                    {formatDate(ad.startDate)} - {formatDate(ad.endDate)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  centerAlign: {
    justifyContent: 'center', 
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600'
  },
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingBottom: 40 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: STATUS_BAR_HEIGHT + 12, 
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  backButton: { 
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: colors.text,
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  addButton: { 
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  /* Dashboard Metrics Grid styles */
  dashboardContainer: {
    marginVertical: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.22 : 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },

  /* Search & Quick-Filters styles */
  filterSection: {
    marginBottom: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
    fontWeight: '600',
  },
  statusChipsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Empty State components */
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBackground: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { 
    fontSize: 17, 
    fontWeight: '800', 
    marginBottom: 6,
    textAlign: 'center'
  },
  emptyText: { 
    fontSize: 13, 
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  createButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22, 
    paddingVertical: 12, 
    borderRadius: 14,
  },
  createButtonText: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '700' 
  },

  /* Campaign list card styles */
  adCard: { 
    borderRadius: 22, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDarkTheme ? 0.25 : 0.05,
    shadowRadius: 12,
    elevation: 3 
  },
  adHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 10,
    gap: 12,
  },
  adTitleContainer: {
    flex: 1,
  },
  adTitle: { 
    fontSize: 16, 
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingVertical: 5, 
    borderRadius: 8, 
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: { 
    fontSize: 10, 
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  adDesc: { 
    fontSize: 13, 
    marginBottom: 14, 
    lineHeight: 19 
  },
  adStats: { 
    flexDirection: 'row', 
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    flex: 1,
    justifyContent: 'center'
  },
  statTextWrap: {
    marginLeft: 1,
  },
  verticalDivider: {
    width: 1,
    height: 18,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: { 
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  adFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    paddingTop: 12, 
    borderTopWidth: 1, 
  },
  footerLeft: {
    flexDirection: 'column',
  },
  budgetLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 1,
  },
  adBudget: { 
    fontSize: 18, 
    fontWeight: '800' 
  },
  adDuration: { 
    fontSize: 11,
    marginLeft: 3,
    fontWeight: '500',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 2,
  },
  adDate: { 
    fontSize: 10,
    fontWeight: '600',
  },
});