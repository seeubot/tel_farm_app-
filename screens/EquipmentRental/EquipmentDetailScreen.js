import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Linking,
  Image,
  Modal,
  Dimensions,
  Clipboard,
  ToastAndroid,
  ActivityIndicator,
  Share,
  Animated,
  Pressable,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import { equipmentAPI } from '../../utils/api';

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 44;
const PLAYSTORE_LINK = 'https://play.google.com/store/apps/details?id=com.agriagent.app';

export default function EquipmentDetailScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const { equipment: initialEquipment } = route.params || {};
  
  const [equipment, setEquipment] = useState(initialEquipment || {});
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentActiveSlide, setCurrentActiveSlide] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const [contactMenuVisible, setContactMenuVisible] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (initialEquipment?._id) {
      fetchEquipmentDetails();
    }
  }, []);

  const fetchEquipmentDetails = async () => {
    try {
      const response = await equipmentAPI.getById(initialEquipment._id);
      if (response?.equipment) {
        setEquipment(response.equipment);
      }
    } catch (error) {
      console.error('Error fetching equipment details:', error);
    }
  };

  // Extracts raw phone string
  const getPhoneNumber = () => {
    return equipment?.ownerId?.profile?.phone?.toString().replace(/[^0-9+]/g, '') || '';
  };

  /**
   * Formats phone numbers for WhatsApp, defaulting to +91 (India country code)
   * if no country code prefix is provided.
   */
  const getFormattedWhatsAppPhone = () => {
    const raw = getPhoneNumber();
    if (!raw) return '';

    // Strip all non-digit characters
    let digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return '';

    // 10 digits standard mobile number in India -> append 91
    if (digits.length === 10) {
      return `91${digits}`;
    }

    // 11 digits starting with 0 (e.g. 09876543210) -> convert to 919876543210
    if (digits.length === 11 && digits.startsWith('0')) {
      return `91${digits.slice(1)}`;
    }

    // Already includes 91 with 12 digits
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }

    // Default fallback to prefix 91 if country code is missing
    if (digits.length < 12 && !digits.startsWith('91')) {
      return `91${digits}`;
    }

    return digits;
  };

  // Formats human-friendly display phone number (e.g. +91 98765 43210)
  const getFormattedDisplayPhone = () => {
    const waPhone = getFormattedWhatsAppPhone();
    if (!waPhone) return 'Not Provided';
    if (waPhone.startsWith('91') && waPhone.length === 12) {
      return `+91 ${waPhone.slice(2, 7)} ${waPhone.slice(7)}`;
    }
    return `+${waPhone}`;
  };

  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('http') || url.startsWith('https') || 
           url.startsWith('file://') || url.startsWith('data:');
  };

  const getImageSource = (img) => {
    if (!img) return null;
    if (isValidImageUrl(img)) return { uri: img };
    if (img.startsWith('/') || img.includes('ImagePicker')) return { uri: 'file://' + img };
    return { uri: img };
  };

  const handleCallOwner = () => {
    const phone = getPhoneNumber();
    if (!phone) {
      Alert.alert('Phone Unavailable', 'The equipment owner has not provided a contact number.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      setContactMenuVisible(true);
    });
  };

  const handleShareApp = async () => {
    try {
      const eqName = equipment?.name || 'agricultural equipment';
      const priceText = equipment?.pricing?.perDay ? `₹${equipment.pricing.perDay}/day` : 'great rental rates';
      await Share.share({
        title: `${eqName} on AgriAgent`,
        message: `Check out ${eqName} available for rent at ${priceText} on AgriAgent! Download the app: ${PLAYSTORE_LINK}`,
      });
    } catch (error) {
      console.error('Sharing failed: ', error);
    }
  };

  const handleWhatsApp = () => {
    const formattedPhone = getFormattedWhatsAppPhone();
    if (!formattedPhone) { 
      Alert.alert('WhatsApp Unavailable', 'Owner phone number is not available.'); 
      return; 
    }

    const eqName = equipment?.name || 'Equipment';
    const message = `Hi! I found your listing for "${eqName}" on AgriAgent. I would like to inquire about its availability for rental.`;
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMsg}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(
        'WhatsApp Not Found', 
        'WhatsApp does not appear to be installed on your device. Would you like to copy the phone number instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Copy Number', onPress: handleCopyNumber },
        ]
      );
    });
  };

  const handleSMS = () => {
    const phone = getPhoneNumber();
    if (!phone) { Alert.alert('SMS Unavailable', 'Phone number not available'); return; }
    const eqName = equipment?.name || 'Equipment';
    const body = encodeURIComponent(`Hi, I am interested in renting your ${eqName} listed on AgriAgent.`);
    Linking.openURL(`sms:${phone}?body=${body}`).catch(() => {
      Alert.alert('SMS Error', 'Unable to open messaging app.');
    });
  };

  const handleCopyNumber = () => {
    const phone = getFormattedDisplayPhone();
    if (phone === 'Not Provided') { Alert.alert('Unavailable', 'No phone number to copy.'); return; }
    Clipboard.setString(phone);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Phone number copied to clipboard!', ToastAndroid.SHORT);
    } else {
      Alert.alert('Copied!', 'Phone number copied to clipboard.');
    }
    setContactMenuVisible(false);
  };

  const handleViewLocation = async () => {
    if (equipment?.location?.lat && equipment?.location?.lng) {
      const lat = equipment.location.lat;
      const lng = equipment.location.lng;
      const label = encodeURIComponent(equipment.name || 'Equipment Location');
      const url = Platform.select({
        ios: `http://maps.apple.com/?q=${label}&ll=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
      });
      await Linking.openURL(url);
    } else if (equipment?.location?.address || equipment?.location?.village) {
      const query = encodeURIComponent(equipment.location.address || equipment.location.village);
      const url = Platform.select({
        ios: `http://maps.apple.com/?q=${query}`,
        android: `https://www.google.com/maps/search/?api=1&query=${query}`,
      });
      await Linking.openURL(url);
    } else {
      Alert.alert('Location Unavailable', 'No specific GPS location or address attached to this item.');
    }
  };

  const handleViewImage = (index) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const handlePrevImage = () => {
    if (equipment.images?.length > 1) {
      setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : equipment.images.length - 1));
    }
  };

  const handleNextImage = () => {
    if (equipment.images?.length > 1) {
      setSelectedImageIndex(prev => (prev < equipment.images.length - 1 ? prev + 1 : 0));
    }
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentActiveSlide) {
      setCurrentActiveSlide(roundIndex);
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked(prev => !prev);
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        !isBookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks',
        ToastAndroid.SHORT
      );
    }
  };

  const hasPhone = Boolean(getPhoneNumber());
  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar 
        translucent 
        backgroundColor="transparent" 
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'} 
      />
      
      {/* Floating Glass Navigation Header */}
      <View style={styles.fixedHeader}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.headerIconButton} 
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back-ios" size={18} color={colors.text} style={{ marginLeft: 5 }} />
        </TouchableOpacity>
        
        <Text style={styles.fixedHeaderTitle} numberOfLines={1}>
          {equipment.name || 'Equipment Details'}
        </Text>

        <View style={styles.headerActionsRight}>
          <TouchableOpacity 
            onPress={toggleBookmark} 
            style={styles.headerIconButton} 
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'} 
              size={20} 
              color={isBookmarked ? '#10B981' : colors.text} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleShareApp} 
            style={styles.headerIconButton} 
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={{ height: STATUS_BAR_HEIGHT + 60 }} />

        {}
        {equipment.images?.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              pagingEnabled 
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {equipment.images.map((img, index) => {
                const imageSource = getImageSource(img);
                const hasError = imageErrors[index];
                
                return (
                  <TouchableOpacity 
                    key={index} 
                    onPress={() => handleViewImage(index)} 
                    activeOpacity={0.95}
                  >
                    {hasError ? (
                      <View style={[styles.mainImage, styles.imageErrorContainer]}>
                        <MaterialCommunityIcons name="image-broken-variant" size={52} color={colors.textMuted} />
                        <Text style={[styles.imageErrorText, { color: colors.textMuted }]}>
                          Image temporarily unavailable
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.mainImage}>
                        <Image 
                          source={imageSource}
                          style={styles.mainImageInner}
                          resizeMode="cover"
                          onLoadStart={() => setImageLoading(true)}
                          onLoad={() => setImageLoading(false)}
                          onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                        />
                        {imageLoading && (
                          <View style={styles.imageLoadingOverlay}>
                            <ActivityIndicator size="small" color={colors.primary} />
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {/* Gallery Slide Indicator Badge */}
            <View style={styles.carouselBadge}>
              <Ionicons name="images-outline" size={12} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.carouselBadgeText}>
                {currentActiveSlide + 1} / {equipment.images.length}
              </Text>
            </View>

            {/* Micro Dot Navigation */}
            {equipment.images.length > 1 && (
              <View style={styles.imageDots}>
                {equipment.images.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.imageDot, 
                      { 
                        backgroundColor: index === currentActiveSlide ? (colors.primary || '#10B981') : colors.border + '60',
                        width: index === currentActiveSlide ? 20 : 6
                      }
                    ]} 
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Placeholder Image fallback */
          <Card style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <Card.Content style={styles.imagePlaceholderContent}>
              <View style={[styles.placeholderIconContainer, { backgroundColor: (colors.primary || '#10B981') + '15' }]}>
                <FontAwesome5 name="tractor" size={38} color={colors.primary || '#10B981'} />
              </View>
              <Text style={[styles.imagePlaceholderText, { color: colors.text }]}>No Images Available</Text>
              <Text style={[styles.imagePlaceholderSubtext, { color: colors.textMuted }]}>
                The provider hasn't attached gallery photos for this machine yet.
              </Text>
            </Card.Content>
          </Card>
        )}

        {}
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Card.Content style={styles.cardPadding}>
            <View style={styles.categoryAndVerifyRow}>
              <View style={[styles.categoryBadge, { backgroundColor: (colors.primary || '#10B981') + '15' }]}>
                <MaterialIcons name="grid-view" size={12} color={colors.primary || '#10B981'} />
                <Text style={[styles.categoryBadgeText, { color: colors.primary || '#10B981' }]}>
                  {(equipment.category || 'Agricultural').toUpperCase()}
                </Text>
              </View>

              {equipment.ownerId?.verification?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="verified-user" size={12} color="#059669" />
                  <Text style={styles.verifiedText}>VERIFIED PARTNER</Text>
                </View>
              )}
            </View>

            <Text style={[styles.equipmentName, { color: colors.text }]}>{equipment.name || 'Unnamed Equipment'}</Text>
            {equipment.teluguName ? (
              <Text style={[styles.teluguName, { color: colors.primary || '#10B981' }]}>
                {equipment.teluguName}
              </Text>
            ) : null}

            {/* Provider Info Sub-card */}
            <View style={[styles.ownerSection, { borderColor: colors.border + '25' }]}>
              <View style={[styles.avatarCircle, { backgroundColor: (colors.primary || '#10B981') + '18' }]}>
                <Text style={[styles.avatarInitials, { color: colors.primary || '#10B981' }]}>
                  {(equipment.ownerId?.profile?.name || 'Owner').charAt(0).toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.ownerInfoText}>
                <View style={styles.ownerTitleRow}>
                  <Text style={[styles.ownerTitle, { color: colors.textMuted }]}>EQUIPMENT PROVIDER</Text>
                </View>
                <Text style={[styles.ownerName, { color: colors.text }]}>
                  {equipment.ownerId?.profile?.name || 'Verified Ag Partner'}
                </Text>
                {hasPhone && (
                  <Text style={[styles.ownerPhoneSub, { color: colors.textMuted }]}>
                    {getFormattedDisplayPhone()}
                  </Text>
                )}
              </View>

              {hasPhone && (
                <View style={styles.ownerQuickActions}>
                  <TouchableOpacity 
                    style={[styles.ownerChatButton, { backgroundColor: '#25D366' }]} 
                    onPress={handleWhatsApp} 
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.ownerCallMiniBtn, { backgroundColor: (colors.primary || '#10B981') + '15' }]} 
                    onPress={handleCallOwner} 
                    activeOpacity={0.85}
                  >
                    <Ionicons name="call" size={16} color={colors.primary || '#10B981'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Detailed Description */}
            {equipment.description ? (
              <View style={styles.descriptionSection}>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>About Machinery</Text>
                <Text 
                  style={[styles.description, { color: colors.textSecondary }]} 
                  numberOfLines={showFullDescription ? undefined : 3}
                >
                  {equipment.description}
                </Text>
                {equipment.description.length > 120 && (
                  <TouchableOpacity 
                    onPress={() => setShowFullDescription(!showFullDescription)} 
                    style={styles.readMoreContainer} 
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.readMore, { color: colors.primary || '#10B981' }]}>
                      {showFullDescription ? 'Show Less' : 'Read Full Description'}
                    </Text>
                    <MaterialIcons 
                      name={showFullDescription ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
                      size={18} 
                      color={colors.primary || '#10B981'} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {}
        {equipment.features?.length > 0 && (
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <Card.Content style={styles.cardPadding}>
              <View style={styles.cardHeaderRow}>
                <MaterialIcons name="stars" size={18} color={colors.primary || '#10B981'} />
                <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0, marginLeft: 6 }]}>
                  Key Specifications
                </Text>
              </View>

              <View style={styles.featuresGrid}>
                {equipment.features.map((feature, index) => (
                  <View 
                    key={index} 
                    style={[styles.featureTag, { backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9' }]}
                  >
                    <View style={[styles.checkIconWrapper, { backgroundColor: (colors.primary || '#10B981') + '20' }]}>
                      <MaterialIcons name="check" size={12} color={colors.primary || '#10B981'} />
                    </View>
                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {}
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <Card.Content style={styles.cardPadding}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="pricetag" size={16} color={colors.primary || '#10B981'} />
              <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0, marginLeft: 6 }]}>
                Rental Pricing Options
              </Text>
            </View>

            <View style={styles.priceContainerGrid}>
              <View style={[styles.priceSegment, { backgroundColor: isDarkTheme ? '#1A1D24' : '#F8FAFC' }]}>
                <View style={[styles.priceIconBadge, { backgroundColor: (colors.primary || '#10B981') + '18' }]}>
                  <MaterialIcons name="today" size={18} color={colors.primary || '#10B981'} />
                </View>
                <Text style={[styles.priceSegmentLabel, { color: colors.textMuted }]}>Per Day</Text>
                <Text style={[styles.priceSegmentValue, { color: colors.text }]}>
                  ₹{equipment.pricing?.perDay ? equipment.pricing.perDay.toLocaleString('en-IN') : 'N/A'}
                </Text>
              </View>

              {equipment.pricing?.perHour ? (
                <View style={[styles.priceSegment, { backgroundColor: isDarkTheme ? '#1A1D24' : '#F8FAFC' }]}>
                  <View style={[styles.priceIconBadge, { backgroundColor: '#3B82F618' }]}>
                    <MaterialIcons name="timer" size={18} color="#3B82F6" />
                  </View>
                  <Text style={[styles.priceSegmentLabel, { color: colors.textMuted }]}>Hourly Rate</Text>
                  <Text style={[styles.priceSegmentValue, { color: colors.text }]}>
                    ₹{equipment.pricing.perHour.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Refundable Security Deposit Banner */}
            <View style={[
              styles.depositBox, 
              { 
                backgroundColor: isDarkTheme ? '#231515' : '#FEF2F2', 
                borderColor: isDarkTheme ? '#451A1A' : '#FEE2E2' 
              }
            ]}>
              <View style={styles.depositHeader}>
                <MaterialIcons name="security" size={16} color="#EF4444" />
                <View>
                  <Text style={[styles.depositLabel, { color: '#EF4444' }]}>REFUNDABLE DEPOSIT</Text>
                  <Text style={[styles.depositSubText, { color: colors.textMuted }]}>Returned upon safe machine inspection</Text>
                </View>
              </View>
              <Text style={[styles.depositValue, { color: '#EF4444' }]}>
                ₹{equipment.pricing?.deposit ? equipment.pricing.deposit.toLocaleString('en-IN') : '0'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {}
        <TouchableOpacity 
          style={[
            styles.locationWidget, 
            { backgroundColor: colors.surface, borderColor: colors.border + '25' }
          ]} 
          onPress={handleViewLocation}
          activeOpacity={0.8}
        >
          <View style={[styles.locationWidgetIcon, { backgroundColor: (colors.primary || '#10B981') + '15' }]}>
            <Ionicons name="location" size={20} color={colors.primary || '#10B981'} />
          </View>
          <View style={styles.locationWidgetInfo}>
            <Text style={[styles.locationLabelText, { color: colors.textMuted }]}>SERVICE & PICKUP LOCATION</Text>
            <Text style={[styles.locationAddressText, { color: colors.text }]} numberOfLines={2}>
              {equipment.location?.address || equipment.location?.village || 'Location details available on request'}
            </Text>
          </View>
          <View style={[styles.arrowButton, { backgroundColor: isDarkTheme ? '#26262B' : '#F1F5F9' }]}>
            <MaterialIcons name="directions" size={18} color={colors.primary || '#10B981'} />
          </View>
        </TouchableOpacity>

        {}
        <View style={[
          styles.safetyBanner, 
          { 
            backgroundColor: isDarkTheme ? '#102219' : '#F0FDF4', 
            borderColor: isDarkTheme ? '#14532D' : '#DCFCE7' 
          }
        ]}>
          <MaterialIcons name="gpp-good" size={20} color="#22C55E" style={{ marginTop: 2 }} />
          <View style={styles.safetyBannerContent}>
            <Text style={[styles.safetyTitle, { color: colors.text }]}>Verified Ag Safety Guarantee</Text>
            <Text style={[styles.safetyDescription, { color: colors.textSecondary }]}>
              Verify identity documents and inspect equipment operational health in person before making full cash or UPI payments.
            </Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {}
      <View style={[styles.stickyBottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border + '20' }]}>
        <View style={styles.stickyPriceSection}>
          <Text style={[styles.stickyPriceLabel, { color: colors.textMuted }]}>Daily Rental</Text>
          <Text style={[styles.stickyPriceVal, { color: colors.text }]}>
            ₹{equipment.pricing?.perDay ? equipment.pricing.perDay.toLocaleString('en-IN') : 'N/A'}
          </Text>
        </View>

        {hasPhone ? (
          <View style={styles.actionButtonsRow}>
            {/* Direct WhatsApp CTA Button */}
            <TouchableOpacity 
              style={[styles.whatsappPrimaryButton, { backgroundColor: '#25D366' }]} 
              onPress={handleWhatsApp}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
              <Text style={styles.whatsappButtonText}>WhatsApp</Text>
            </TouchableOpacity>

            {/* Direct Voice Call Button */}
            <TouchableOpacity 
              style={[styles.floatingPrimaryBtn, { backgroundColor: colors.primary || '#10B981' }]} 
              onPress={handleCallOwner}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={16} color="#FFF" />
              <Text style={styles.floatingPrimaryBtnText}>Call</Text>
            </TouchableOpacity>

            {/* Options Menu Button */}
            <TouchableOpacity 
              style={[styles.floatingMoreIcon, { backgroundColor: isDarkTheme ? '#26262B' : '#F1F5F9' }]} 
              onPress={() => setContactMenuVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="more-vert" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.noContactStickyCard, { backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9' }]}>
            <MaterialIcons name="phonelink-erase" size={16} color={colors.textMuted} />
            <Text style={[styles.noContactStickyText, { color: colors.textMuted }]}>Contact Details Unavailable</Text>
          </View>
        )}
      </View>

      {}
      <Modal 
        visible={imageViewerVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.imageViewerClose} 
            onPress={() => setImageViewerVisible(false)} 
            activeOpacity={0.7}
          >
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          
          {equipment.images?.[selectedImageIndex] && (
            <Image 
              source={getImageSource(equipment.images[selectedImageIndex])}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}

          <Text style={styles.imageViewerCounter}>
            {selectedImageIndex + 1} / {equipment.images?.length || 1}
          </Text>
          
          {equipment.images?.length > 1 && (
            <View style={styles.imageViewerNav}>
              <TouchableOpacity style={styles.navArrow} onPress={handlePrevImage} activeOpacity={0.7}>
                <View style={styles.arrowBg}>
                  <MaterialIcons name="chevron-left" size={28} color="#FFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navArrow} onPress={handleNextImage} activeOpacity={0.7}>
                <View style={styles.arrowBg}>
                  <MaterialIcons name="chevron-right" size={28} color="#FFF" />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {}
      <Modal
        visible={contactMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setContactMenuVisible(false)}
        >
          <View style={[styles.dialogContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.dialogHeaderLine} />
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Contact Owner Options</Text>
            <Text style={[styles.dialogSubtitle, { color: colors.textMuted }]}>
              Phone: {getFormattedDisplayPhone()}
            </Text>

            <View style={styles.dialogOptionsList}>
              {/* WhatsApp Option with explicit +91 standard */}
              <TouchableOpacity 
                style={[styles.dialogItem, { backgroundColor: '#25D36615' }]} 
                onPress={() => { handleWhatsApp(); setContactMenuVisible(false); }}
              >
                <View style={[styles.dialogIconBox, { backgroundColor: '#25D366' }]}>
                  <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" />
                </View>
                <View style={styles.dialogItemContent}>
                  <Text style={[styles.dialogItemText, { color: colors.text }]}>Chat on WhatsApp</Text>
                  <Text style={[styles.dialogItemSub, { color: colors.textMuted }]}>Pre-filled query with +91 country code</Text>
                </View>
              </TouchableOpacity>

              {/* Voice Phone Call Option */}
              <TouchableOpacity 
                style={[styles.dialogItem, { backgroundColor: (colors.primary || '#10B981') + '15' }]} 
                onPress={() => { handleCallOwner(); setContactMenuVisible(false); }}
              >
                <View style={[styles.dialogIconBox, { backgroundColor: colors.primary || '#10B981' }]}>
                  <Ionicons name="call" size={18} color="#FFF" />
                </View>
                <View style={styles.dialogItemContent}>
                  <Text style={[styles.dialogItemText, { color: colors.text }]}>Direct Voice Call</Text>
                  <Text style={[styles.dialogItemSub, { color: colors.textMuted }]}>Standard cellular phone call</Text>
                </View>
              </TouchableOpacity>

              {/* SMS Message Option */}
              <TouchableOpacity 
                style={[styles.dialogItem, { backgroundColor: '#3B82F615' }]} 
                onPress={() => { handleSMS(); setContactMenuVisible(false); }}
              >
                <View style={[styles.dialogIconBox, { backgroundColor: '#3B82F6' }]}>
                  <MaterialIcons name="sms" size={18} color="#FFF" />
                </View>
                <View style={styles.dialogItemContent}>
                  <Text style={[styles.dialogItemText, { color: colors.text }]}>Send Text SMS</Text>
                  <Text style={[styles.dialogItemSub, { color: colors.textMuted }]}>Send SMS message directly</Text>
                </View>
              </TouchableOpacity>

              {/* Copy Phone Number Option */}
              <TouchableOpacity 
                style={[styles.dialogItem, { backgroundColor: isDarkTheme ? '#26262B' : '#F1F5F9' }]} 
                onPress={handleCopyNumber}
              >
                <View style={[styles.dialogIconBox, { backgroundColor: colors.textMuted }]}>
                  <MaterialIcons name="content-copy" size={18} color="#FFF" />
                </View>
                <View style={styles.dialogItemContent}>
                  <Text style={[styles.dialogItemText, { color: colors.text }]}>Copy Phone Number</Text>
                  <Text style={[styles.dialogItemSub, { color: colors.textMuted }]}>{getFormattedDisplayPhone()}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.dialogCloseButton, { backgroundColor: isDarkTheme ? '#26262B' : '#E2E8F0' }]}
              onPress={() => setContactMenuVisible(false)}
            >
              <Text style={[styles.dialogCloseText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkTheme ? '#0F0F12' : '#F8FAFC' 
  },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 24 
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUS_BAR_HEIGHT + 60,
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkTheme ? 'rgba(15,15,18,0.88)' : 'rgba(255,255,255,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '15',
    zIndex: 999,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: isDarkTheme ? '#1E1E24' : '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 8,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageGalleryContainer: { 
    marginBottom: 16, 
    position: 'relative' 
  },
  mainImage: { 
    width: width - 32, 
    height: 250, 
    borderRadius: 18, 
    overflow: 'hidden', 
    backgroundColor: isDarkTheme ? '#1E1E24' : '#E2E8F0' 
  },
  mainImageInner: { 
    width: '100%', 
    height: '100%' 
  },
  imageErrorContainer: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: colors.border + '15',
    padding: 24
  },
  imageErrorText: { 
    fontSize: 12, 
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center'
  },
  imageLoadingOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.15)' 
  },
  carouselBadge: {
    position: 'absolute',
    bottom: 22,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  carouselBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  imageDots: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 5, 
    marginTop: 10 
  },
  imageDot: { 
    height: 5, 
    borderRadius: 3,
  },
  imagePlaceholder: { 
    borderRadius: 18, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border + '12',
    elevation: 0,
  },
  imagePlaceholderContent: { 
    alignItems: 'center', 
    paddingVertical: 36, 
    paddingHorizontal: 24,
  },
  placeholderIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePlaceholderText: { 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 4,
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  card: { 
    borderRadius: 18, 
    marginBottom: 14, 
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border + '18',
  },
  cardPadding: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: { 
    fontSize: 13, 
    fontWeight: '700', 
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  categoryAndVerifyRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10,
  },
  categoryBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    gap: 4 
  },
  categoryBadgeText: { 
    fontSize: 10, 
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  verifiedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: isDarkTheme ? '#064E3B' : '#D1FAE5', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    gap: 4,
  },
  verifiedText: { 
    fontSize: 10, 
    color: isDarkTheme ? '#A7F3D0' : '#065F46', 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  equipmentName: { 
    fontSize: 21, 
    fontWeight: '700',
    lineHeight: 28,
  },
  teluguName: { 
    fontSize: 14, 
    fontWeight: '600',
    marginTop: 2,
  },
  ownerSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 14,
    marginTop: 14, 
    borderTopWidth: 1, 
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 17,
    fontWeight: '700',
  },
  ownerInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  ownerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  ownerPhoneSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  ownerQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerChatButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerCallMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  descriptionSection: { 
    marginTop: 14,
    paddingTop: 14, 
    borderTopWidth: 1, 
    borderTopColor: colors.border + '15' 
  },
  description: { 
    fontSize: 13, 
    lineHeight: 21,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  readMore: { 
    fontSize: 12, 
    fontWeight: '600', 
  },
  featuresGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  featureTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10 
  },
  checkIconWrapper: {
    width: 16,
    height: 16,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },
  priceContainerGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  priceSegment: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  priceIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceSegmentLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  priceSegmentValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  depositBox: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 12, 
    borderWidth: 1,
  },
  depositHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  depositLabel: { 
    fontSize: 10, 
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  depositSubText: {
    fontSize: 10,
    fontWeight: '500',
  },
  depositValue: { 
    fontSize: 15, 
    fontWeight: '700',
    marginLeft: 8,
  },
  locationWidget: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 18, 
    marginBottom: 14, 
    gap: 12, 
    borderWidth: 1, 
  },
  locationWidgetIcon: { 
    width: 42, 
    height: 42, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  locationWidgetInfo: { 
    flex: 1 
  },
  locationLabelText: { 
    fontSize: 9, 
    fontWeight: '700', 
    letterSpacing: 0.5,
    marginBottom: 2 
  },
  locationAddressText: { 
    fontSize: 13, 
    fontWeight: '600',
    lineHeight: 18,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyBanner: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  safetyBannerContent: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  safetyDescription: {
    fontSize: 11,
    lineHeight: 16,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    borderTopWidth: 1,
    zIndex: 1000,
  },
  stickyPriceSection: {
    flexDirection: 'column',
  },
  stickyPriceLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  stickyPriceVal: {
    fontSize: 19,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsappPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    gap: 6,
  },
  whatsappButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    gap: 6,
  },
  floatingPrimaryBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingMoreIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noContactStickyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  noContactStickyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  imageViewerContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.96)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  imageViewerClose: { 
    position: 'absolute', 
    top: 50, 
    right: 20, 
    zIndex: 10, 
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
  },
  imageViewerImage: { 
    width: width, 
    height: height * 0.65 
  },
  imageViewerCounter: { 
    position: 'absolute', 
    bottom: 90, 
    color: '#FFF', 
    fontSize: 12, 
    fontWeight: '600', 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 14, 
    paddingVertical: 5, 
    borderRadius: 10,
  },
  imageViewerNav: { 
    position: 'absolute', 
    bottom: 25, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 32,
  },
  navArrow: { 
    padding: 4 
  },
  arrowBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  dialogContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    width: '100%',
  },
  dialogHeaderLine: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  dialogSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 18,
  },
  dialogOptionsList: {
    gap: 10,
    marginBottom: 18,
  },
  dialogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  dialogIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogItemContent: {
    flex: 1,
  },
  dialogItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dialogItemSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  dialogCloseButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCloseText: {
    fontSize: 14,
    fontWeight: '700',
  },
});