import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { API_BASE_URL } from '../utils/api';

const { width } = Dimensions.get('window');

export default function AdBanner({ placement, onAdClick, navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAds();
  }, [placement]);

  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 5000); // Rotates every 5 seconds
      return () => clearInterval(interval);
    }
  }, [ads]);

  const fetchAds = async () => {
    try {
      // Passes placement to backend. Backend should return premium ads first if placement context matches.
      const response = await fetch(`${API_BASE_URL}/api/ads/active?placement=${placement || 'global'}&limit=5`);
      const data = await response.json();
      setAds(data.ads || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdPress = async (ad) => {
    try {
      await fetch(`${API_BASE_URL}/api/ads/${ad._id}/click`, { method: 'POST' });
      if (ad.media?.redirectUrl) {
        Linking.openURL(ad.media.redirectUrl);
      }
      if (onAdClick) onAdClick(ad);
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }
  };

  const handleCreateAd = () => {
    if (navigation) {
      navigation.navigate('CreateAd');
    }
  };

  if (loading) return null;

  // Placeholder when no ads exist
  if (ads.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.placeholderContainer, { backgroundColor: colors.primaryLight }]}
        onPress={handleCreateAd}
        activeOpacity={0.9}
      >
        <View style={styles.placeholderContent}>
          <View style={[styles.placeholderIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.placeholderIconText}>📢</Text>
          </View>
          <View style={styles.placeholderTextContainer}>
            <Text style={[styles.placeholderTitle, { color: colors.primary }]}>
              Want to see your ad here?
            </Text>
            <Text style={[styles.placeholderDesc, { color: colors.textSecondary }]}>
              Promote your products to thousands of farmers
            </Text>
          </View>
          <View style={[styles.createAdButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.createAdButtonText}>Create Ad</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const currentAd = ads[currentAdIndex];
  
  // Explicit flag verification to see if current ad payload claims a premium tier package
  const isPremium = currentAd.type === 'premium' || placement === 'premium';

  return (
    <TouchableOpacity
      style={[
        styles.adContainer, 
        { backgroundColor: colors.surface },
        isPremium && [styles.premiumContainer, { borderColor: colors.primary }]
      ]}
      onPress={() => handleAdPress(currentAd)}
      activeOpacity={0.9}
    >
      <View style={styles.adContent}>
        {currentAd.media?.imageUrl ? (
          <Image 
            source={{ uri: currentAd.media.imageUrl }} 
            style={[styles.adImage, isPremium && styles.premiumImage]} 
          />
        ) : (
          <View style={[styles.adPlaceholder, { backgroundColor: colors.primaryLight }, isPremium && styles.premiumPlaceholder]}>
            <Text style={[styles.adTitle, { color: colors.primary }, isPremium && styles.premiumTitle]}>
              {currentAd.title}
            </Text>
            <Text style={[styles.adDesc, { color: colors.textSecondary }]}>
              {currentAd.description}
            </Text>
          </View>
        )}
        
        {/* Dynamic Badge styling switch */}
        <View style={[styles.adBadge, isPremium && { backgroundColor: colors.primary }]}>
          <Text style={styles.adBadgeText}>
            {isPremium ? '💎 FEATURED' : 'Sponsored'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIconText: {
    fontSize: 20,
  },
  placeholderTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  placeholderTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  placeholderDesc: {
    fontSize: 10,
  },
  createAdButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  createAdButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '500',
  },
  adContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  premiumContainer: {
    marginHorizontal: 16,
    borderWidth: 2,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  adContent: {
    position: 'relative',
  },
  adImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  premiumImage: {
    height: 120, // Tall image layout architecture for higher conversion impact
  },
  adPlaceholder: {
    padding: 12,
    alignItems: 'center',
  },
  premiumPlaceholder: {
    paddingVertical: 24,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premiumTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  adDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  adBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adBadgeText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '700',
  },
});