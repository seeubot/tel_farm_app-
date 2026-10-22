import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Linking,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';
import { API_BASE_URL } from '../utils/api';

const { width, height } = Dimensions.get('window');

export default function PopupAd({ navigation, onClose }) {
  const { colors, isDarkTheme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const flatListRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAds();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Auto-rotate to next ad every 5 seconds
  useEffect(() => {
    if (ads.length > 1 && visible) {
      const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % ads.length;
        setCurrentIndex(nextIndex);
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [ads.length, currentIndex, visible]);

  const fetchAds = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ads/active?placement=popup&limit=10`);
      const data = await response.json();
      if (data.ads && data.ads.length > 0) {
        setAds(data.ads);
        setVisible(true);
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdPress = async (ad) => {
    if (ad?.media?.redirectUrl) {
      await fetch(`${API_BASE_URL}/api/ads/${ad._id}/click`, { method: 'POST' });
      Linking.openURL(ad.media.redirectUrl);
    }
    handleClose();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onClose) onClose();
    });
  };

  const renderAd = ({ item, index }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleAdPress(item)}
      style={styles.adContent}
    >
      {item.media?.imageUrl ? (
        <Image source={{ uri: item.media.imageUrl }} style={styles.adImage} />
      ) : (
        <View style={[styles.adPlaceholder, { backgroundColor: colors.primaryLight }]}>
          <MaterialIcons name="campaign" size={40} color={colors.primary} />
          <Text style={[styles.adTitle, { color: colors.primary }]}>{item.title}</Text>
          <Text style={[styles.adDesc, { color: colors.textSecondary }]}>{item.description}</Text>
        </View>
      )}

      <View style={styles.adInfo}>
        <Text style={[styles.sponsoredText, { color: colors.textMuted }]}>Sponsored</Text>
        <Text style={[styles.learnMoreText, { color: colors.primary }]}>Learn More →</Text>
      </View>
    </TouchableOpacity>
  );

  if (!visible || ads.length === 0) {
    return null;
  }

  const currentAd = ads[currentIndex];

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.surface,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Ad Carousel */}
          {ads.length === 1 ? (
            renderAd({ item: ads[0] })
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={ads}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={renderAd}
                keyExtractor={(item) => item._id}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / width);
                  setCurrentIndex(index);
                }}
              />
              {/* Pagination Dots */}
              <View style={styles.paginationContainer}>
                {ads.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      currentIndex === index && styles.paginationDotActive,
                      { backgroundColor: currentIndex === index ? colors.primary : colors.textMuted },
                    ]}
                  />
                ))}
              </View>
              {/* Ad Counter */}
              <View style={styles.counterContainer}>
                <Text style={[styles.counterText, { color: colors.textMuted }]}>
                  {currentIndex + 1} / {ads.length}
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adContent: {
    width: width * 0.85,
  },
  adImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  adPlaceholder: {
    padding: 30,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  adTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  adDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  adInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sponsoredText: {
    fontSize: 11,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  paginationDotActive: {
    width: 20,
    height: 8,
    borderRadius: 4,
    opacity: 1,
  },
  counterContainer: {
    position: 'absolute',
    bottom: 10,
    right: 15,
  },
  counterText: {
    fontSize: 11,
  },
});