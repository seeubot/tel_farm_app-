import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
  Clipboard,
  ToastAndroid,
  Linking,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import { useLanguage } from '../../utils/i18n';
import { API_BASE_URL, IMAGE_SERVER_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;
const SUPPORT_PHONE = '8897350151';
const DEFAULT_WA_MESSAGE = "Thanks for using the AgriAgent,Have a Greate Deal";

export default function CreateAdScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [submittingUTR, setSubmittingUTR] = useState(false);

  // Image states
  const [adImage, setAdImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');

  // UPI details
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [createdAdId, setCreatedAdId] = useState('');

  // Form states with target custom phone variable instead of open raw link URL
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    teluguTitle: '',
    description: '',
    targetAudience: { location: '' },
  });

  const adPlans = useMemo(() => [
    {
      id: 'standard_feed',
      name: t('standardBanner') || 'Standard Banner',
      price: 499,
      duration: 30,
      type: 'banner',
      placement: 'home',
      features: ['Shows in home feed', 'Rotates with other ads', 'Basic performance tracking'],
      icon: 'campaign',
      color: '#10B981', // Cyber Mint
    },
    {
      id: 'premium_hero',
      name: t('premiumSpotlight') || 'Premium Spotlight',
      price: 999,
      duration: 30,
      type: 'banner',
      placement: 'home_premium',
      features: ['Replaces Weather Card', 'Banner ads on ALL screens', 'Maximum spotlight priority visibility'],
      popular: true,
      icon: 'star',
      color: '#6366F1', // Royal Cyber Indigo
    },
  ], [t]);

  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dynamicStyles = getDynamicStyles(colors, isDarkTheme);

  useEffect(() => {
    fetchUpiDetails();
  }, []);

  const getHelpText = useCallback(() => {
    const texts = {
      en: {
        needHelp: 'Need help creating an ad?',
        callUs: 'Call us for assistance',
        tapToCall: 'Tap to call',
        weWillHelp: 'We will guide you through the process',
        callFailed: 'Call Failed',
        callFailedDesc: 'Unable to make a call. Please dial 8897350151 manually from your phone app.',
      },
      te: {
        needHelp: 'యాడ్ సృష్టించడంలో సహాయం కావాలా?',
        callUs: 'సహాయం కోసం కాల్ చేయండి',
        tapToCall: 'కాల్ చేయడానికి నొక్కండి',
        weWillHelp: 'మేము మీకు ప్రక్రియలో మార్గదర్శనం చేస్తాము',
        callFailed: 'కాల్ విఫలమైంది',
        callFailedDesc: 'కాల్ చేయలేకపోతున్నాము. దయచేసి మీ ఫోన్ యాప్ నుండి 8897350151 కి డయల్ చేయండి.',
      },
      hi: {
        needHelp: 'विज्ञापन बनाने में सहायता चाहिए?',
        callUs: 'सहायता के लिए कॉल करें',
        tapToCall: 'कॉल करने के लिए टैप करें',
        weWillHelp: 'हम प्रक्रिया में आपका मार्गदर्शन करेंगे',
        callFailed: 'कॉल विफल',
        callFailedDesc: 'कॉल नहीं कर पा रहे हैं। कृपया अपने फोन ऐप से 8897350151 डायल करें।',
      },
    };
    return texts[language] || texts.en;
  }, [language]);

  const helpText = useMemo(() => getHelpText(), [getHelpText]);

  const fetchUpiDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/upi-details`);
      const data = await response.json();
      if (data.success) {
        setUpiId(data.upiId || 'siddhikreddy@ibl');
        setQrCodeUrl(data.qrCodeUrl || 'https://files.catbox.moe/houb5j.png');
      }
    } catch (error) {
      setUpiId('siddhikreddy@ibl');
      setQrCodeUrl('https://files.catbox.moe/houb5j.png');
    }
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
  };

  const handleCallSupport = () => {
    const phoneUrl = `tel:${SUPPORT_PHONE}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert(helpText.callFailed, helpText.callFailedDesc);
    });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAdImage(result.assets[0].uri);
      setUploadedImageUrl('');
    }
  };

  const removeImage = () => {
    setAdImage(null);
    setUploadedImageUrl('');
  };

  const uploadToServer = async (imageUri) => {
    try {
      const token = await AsyncStorage.getItem('idToken');
      const dataBody = new FormData();
      dataBody.append('file', {
        uri: imageUri,
        name: `ad_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: dataBody,
      });

      const data = await response.json();
      if (data.success && data.url) {
        return data.url;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error.message);
      throw error;
    }
  };

  const handleSubmitAd = () => {
    if (!selectedPlan) {
      Alert.alert(t('failed') || 'Error', 'Please select a plan');
      return;
    }
    if (!formData.title) {
      Alert.alert(t('required') || 'Required', 'Please enter ad title');
      return;
    }
    if (!adImage && !uploadedImageUrl) {
      Alert.alert(t('required') || 'Required', 'Please select an ad image');
      return;
    }
    
    // Validate clean phone sequence structures before packing payload
    const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert(t('required') || 'Required', 'Please enter a valid WhatsApp Phone Number');
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmAndSubmit = async () => {
    setLoading(true);
    setShowPaymentModal(false);

    try {
      const token = await AsyncStorage.getItem('idToken');
      let imageUrl = uploadedImageUrl;

      if (adImage && !uploadedImageUrl) {
        setUploadingImage(true);
        try {
          const serverUrl = await uploadToServer(adImage);
          imageUrl = serverUrl;
          setUploadedImageUrl(serverUrl);
        } catch (uploadError) {
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      let cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone; // Fallback to Indian prefix matrix structure if user left it off
      }
      const structuredWaLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(DEFAULT_WA_MESSAGE)}`;

      const response = await fetch(`${API_BASE_URL}/api/ads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          teluguTitle: formData.teluguTitle,
          description: formData.description,
          type: selectedPlan.type,
          placement: selectedPlan.placement,
          budget: selectedPlan.price,
          duration: selectedPlan.duration,
          media: {
            imageUrl: imageUrl,
            redirectUrl: structuredWaLink, // Injected as target dynamic routing value
          },
          targetAudience: formData.targetAudience,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCreatedAdId(data.ad._id);
        await fetch(`${API_BASE_URL}/api/payments/upi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            adId: data.ad._id,
            amount: selectedPlan.price,
          }),
        });
        setShowQRCode(true);
      } else {
        Alert.alert(t('failed') || 'Error', data.error || 'Failed to create ad');
      }
    } catch (error) {
      Alert.alert(t('error') || 'Error', 'Failed to create ad. Please try again.');
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  const copyUpiId = () => {
    if (!upiId) return;
    Clipboard.setString(upiId);
    if (Platform.OS === 'android') ToastAndroid.show('UPI ID copied!', ToastAndroid.SHORT);
    else Alert.alert(t('success') || 'Copied', 'UPI ID copied');
  };

  const handleSubmitUTR = async () => {
    if (!utrNumber.trim()) {
      Alert.alert(t('required') || 'Required', 'Please enter the UTR/Transaction ID');
      return;
    }

    setSubmittingUTR(true);
    try {
      const token = await AsyncStorage.getItem('idToken');
      await fetch(`${API_BASE_URL}/api/payments/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          adId: createdAdId,
          utrNumber: utrNumber.trim(),
        }),
      });

      Alert.alert(
        t('success') || 'Payment Submitted!',
        `UTR: ${utrNumber.trim()}\n\nAd will be activated after verification.`,
        [{ text: t('done') || 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        t('success') || 'Submitted',
        `UTR: ${utrNumber.trim()}\n\nAd will be activated after verification.`,
        [{ text: t('done') || 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setSubmittingUTR(false);
    }
  };

  if (showQRCode) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowQRCode(false)} style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}>
            <MaterialIcons name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('payment') || 'Complete Payment'}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.qrContainer} showsVerticalScrollIndicator={false}>
          <Text style={[styles.qrTitle, { color: colors.text }]}>{t('scanQR') || 'Scan QR to Pay'}</Text>
          <Text style={[styles.qrAmount, { color: selectedPlan?.color }]}>Rs.{selectedPlan?.price}</Text>

          <View style={[styles.qrCodeBox, { backgroundColor: '#FFF', borderColor: colors.border + '30' }]}>
            {qrCodeUrl ? (
              <Image source={{ uri: qrCodeUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>

          <View style={[dynamicStyles.card, styles.upiIdBox]}>
            <Text style={[styles.upiIdLabel, { color: colors.textSecondary }]}>{t('upiId') || 'UPI ID'}</Text>
            <Text style={[styles.upiIdValue, { color: colors.text }]}>{upiId}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={copyUpiId}>
              <MaterialIcons name="content-copy" size={16} color={colors.primary} />
              <Text style={[styles.copyBtnText, { color: colors.primary }]}>{t('copyUpiId')?.split(' ')[0] || 'Copy ID'}</Text>
            </TouchableOpacity>
          </View>

          <View style={[dynamicStyles.card, styles.utrSection]}>
            <View style={styles.utrHeader}>
              <MaterialIcons name="receipt-long" size={18} color={colors.primary} />
              <Text style={[styles.utrTitle, { color: colors.text }]}>{t('enterUTR') || 'Enter UTR / Transaction ID'}</Text>
            </View>
            <Text style={[styles.utrHint, { color: colors.textSecondary }]}>
              After payment, enter the UTR number from your UPI app
            </Text>
            <TextInput
              style={[styles.utrInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]}
              placeholder="e.g., UPI1234567890"
              placeholderTextColor={colors.textMuted}
              value={utrNumber}
              onChangeText={setUtrNumber}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitUtrButton, { backgroundColor: '#10B981' }]}
            onPress={handleSubmitUTR}
            disabled={submittingUTR}
            activeOpacity={0.85}
          >
            {submittingUTR ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={18} color="#FFF" />
                <Text style={styles.submitUtrText}>{t('submitUTR') || 'Submit UTR & Confirm'}</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payLaterButton, { borderColor: colors.border + '40' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.payLaterText, { color: colors.textSecondary }]}>{t('payLater') || 'Pay Later'}</Text>
          </TouchableOpacity>

          <Text style={[styles.note, { color: colors.textMuted }]}>{t('activationNote') || 'Activation within 24h after verification'}</Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[dynamicStyles.headerIconBtn, styles.headerIconBtnShared]}>
          <MaterialIcons name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('createAd') || 'Create Ad'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('choosePlan') || 'Choose Plan'}</Text>
        <View style={styles.plansRow}>
          {adPlans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  dynamicStyles.card,
                  styles.planCard,
                  isSelected && { borderColor: plan.color, borderWidth: 2 },
                ]}
                onPress={() => handleSelectPlan(plan)}
                activeOpacity={0.85}
              >
                {plan.popular && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularText}>{t('best') || 'BEST'}</Text>
                  </View>
                )}
                <View style={[styles.planIcon, { backgroundColor: plan.color + '15' }]}>
                  <MaterialIcons name={plan.icon} size={24} color={plan.color} />
                </View>
                <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                <Text style={[styles.planPrice, { color: plan.color }]}>
                  Rs.{plan.price}
                  <Text style={styles.planDuration}>/{plan.duration}d</Text>
                </Text>
                <View style={styles.featuresList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <MaterialIcons name="check" size={12} color={plan.color} />
                      <Text style={[styles.featureText, { color: colors.textSecondary }]} numberOfLines={2}>{f}</Text>
                    </View>
                  ))}
                </View>
                {isSelected && (
                  <MaterialIcons name="check-circle" size={20} color={plan.color} style={styles.selectedCheck} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {!selectedPlan && (
          <TouchableOpacity
            style={[dynamicStyles.card, styles.helpCard]}
            onPress={handleCallSupport}
            activeOpacity={0.85}
          >
            <View style={styles.helpContent}>
              <View style={styles.helpIconContainer}>
                <MaterialIcons name="support-agent" size={24} color={colors.primary} />
              </View>
              <View style={styles.helpTextContainer}>
                <Text style={[styles.helpTitle, { color: colors.text }]}>{helpText.needHelp}</Text>
                <Text style={[styles.helpSubtitle, { color: colors.textSecondary }]}>{helpText.weWillHelp}</Text>
                <View style={styles.helpPhoneRow}>
                  <MaterialIcons name="phone" size={12} color={colors.primary} />
                  <Text style={[styles.helpPhone, { color: colors.primary }]}>{helpText.callUs}</Text>
                </View>
              </View>
              <View style={styles.helpArrowContainer}>
                <MaterialIcons name="phone-in-talk" size={18} color={colors.primary} />
                <Text style={[styles.helpTapText, { color: colors.primary }]}>{helpText.tapToCall}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {selectedPlan && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('equipmentDetails') || 'Ad Details'}</Text>

            <Text style={[styles.label, { color: colors.text }]}>{t('adTitle') || 'Title'} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]}
              placeholder="Your ad headline"
              placeholderTextColor={colors.textMuted}
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('adTeluguTitle') || 'Telugu Title'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]}
              placeholder="(optional)"
              placeholderTextColor={colors.textMuted}
              value={formData.teluguTitle}
              onChangeText={(t) => setFormData({ ...formData, teluguTitle: t })}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('adDescription') || 'Description'}</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]}
              placeholder="Brief description"
              placeholderTextColor={colors.textMuted}
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              multiline
              numberOfLines={3}
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('adImage') || 'Ad Image'} *</Text>
            {adImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: adImage }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                  <MaterialIcons name="close" size={18} color="#FFF" />
                </TouchableOpacity>
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#FFF" size="small" />
                    <Text style={styles.uploadingText}>Uploading to server...</Text>
                  </View>
                )}
                {uploadedImageUrl && !uploadingImage && (
                  <View style={styles.uploadedBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#10B981" />
                    <Text style={styles.uploadedText}>{t('success') || 'Uploaded Successfully'}</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: colors.inputBg, borderColor: colors.border + '30' }]}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add-photo-alternate" size={36} color={colors.primary} />
                <Text style={[styles.uploadBtnText, { color: colors.textSecondary }]}>
                  Tap to Select Image
                </Text>
                <Text style={[styles.uploadBtnHint, { color: colors.textMuted }]}>
                  16:9 recommended layout bounds
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.label, { color: colors.text }]}>{t('whatsappNumber') || 'WhatsApp Phone Number'} *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]}
              placeholder={t('whatsappNumberPlaceholder') || "e.g., 918897350151"}
              placeholderTextColor={colors.textMuted}
              value={whatsappPhone}
              onChangeText={setWhatsappPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { color: colors.text }]}>{t('targetLocation') || 'Target Location'}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border + '30' }]}
              placeholder="e.g., Hyderabad"
              placeholderTextColor={colors.textMuted}
              value={formData.targetAudience.location}
              onChangeText={(t) => setFormData({ ...formData, targetAudience: { ...formData.targetAudience, location: t } })}
            />

            <View style={[dynamicStyles.card, styles.summaryCard]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('plan') || 'Plan'}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPlan.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('duration') || 'Duration'}</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedPlan.duration} days</Text>
              </View>
              <View style={[styles.summaryDivider, { borderTopColor: colors.border + '30' }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>{t('total') || 'Total'}</Text>
                <Text style={[styles.totalValue, { color: selectedPlan.color }]}>Rs.{selectedPlan.price}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: selectedPlan.color }]}
              onPress={handleSubmitAd}
              disabled={uploadingImage}
              activeOpacity={0.85}
            >
              {uploadingImage ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <MaterialIcons name="qr-code" size={18} color="#FFF" />
                  <Text style={styles.submitButtonText}>{t('proceedToPay') || 'Proceed to Pay'}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { backgroundColor: colors.surface, borderColor: colors.border + '30' }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('submitAd') || 'Create Ad'}</Text>
            <Text style={[styles.modalAmount, { color: selectedPlan?.color }]}>Rs.{selectedPlan?.price}</Text>
            <Text style={[styles.modalPlan, { color: colors.textSecondary }]}>{selectedPlan?.name} - {selectedPlan?.duration} days</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: selectedPlan?.color || colors.primary }]}
              onPress={confirmAndSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.confirmBtnText}>Create Ad & Get QR</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t('cancel') || 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getDynamicStyles = (colors, isDarkTheme) => StyleSheet.create({
  headerIconBtn: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '30' : '#EAF0F6',
  },
  card: {
    backgroundColor: isDarkTheme ? colors.surface : '#FFFFFF',
    borderColor: isDarkTheme ? colors.border + '20' : '#EAF0F6',
    shadowColor: isDarkTheme ? '#000000' : '#8FA4B5',
    shadowOpacity: isDarkTheme ? 0.22 : 0.07,
  }
});

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: STATUS_BAR_HEIGHT + 12, paddingBottom: 16 },
    headerIconBtnShared: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
    
    sectionTitle: { fontSize: 11, fontWeight: '700', marginBottom: 14, marginTop: 14, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.5 },
    label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 12, letterSpacing: 0.1 },
    input: { borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 14, marginBottom: 8, fontWeight: '500' },
    textArea: { height: 80, textAlignVertical: 'top' },
    
    plansRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    planCard: { flex: 1, borderRadius: 22, padding: 16, borderWidth: 1.5, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
    popularBadge: { position: 'absolute', top: -11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    popularText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
    planIcon: { width: 46, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10, marginTop: 6 },
    planName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
    planPrice: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
    planDuration: { fontSize: 11, fontWeight: '500' },
    featuresList: { width: '100%', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 6 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    featureText: { fontSize: 11, fontWeight: '500', lineHeight: 15, flex: 1 },
    selectedCheck: { position: 'absolute', top: 8, right: 8 },
    
    helpCard: { borderRadius: 22, borderWidth: 1, padding: 16, marginTop: 8, marginBottom: 4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
    helpContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    helpIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    helpTextContainer: { flex: 1 },
    helpTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    helpSubtitle: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
    helpPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    helpPhone: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
    helpArrowContainer: { alignItems: 'center', gap: 4, paddingLeft: 4 },
    helpTapText: { fontSize: 10, fontWeight: '700' },
    
    imagePreviewContainer: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
    imagePreview: { width: '100%', height: 180 },
    removeImageBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    uploadingText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 8 },
    uploadedBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4 },
    uploadedText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
    
    uploadBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 8 },
    uploadBtnText: { fontSize: 14, fontWeight: '700', marginTop: 8 },
    uploadBtnHint: { fontSize: 11, marginTop: 4, fontWeight: '500' },
    
    summaryCard: { borderRadius: 22, padding: 18, borderWidth: 1, marginTop: 16, marginBottom: 16, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 1.5 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    summaryLabel: { fontSize: 13, fontWeight: '500' },
    summaryValue: { fontSize: 13, fontWeight: '700' },
    summaryDivider: { borderTopWidth: 1, marginVertical: 8 },
    totalLabel: { fontSize: 14, fontWeight: '700' },
    totalValue: { fontSize: 18, fontWeight: '800' },
    
    submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14, gap: 8, marginBottom: 20 },
    submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    
    qrContainer: { paddingHorizontal: 20, paddingBottom: 32, alignItems: 'center' },
    qrTitle: { fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 4 },
    qrAmount: { fontSize: 32, fontWeight: '800', marginBottom: 20 },
    qrCodeBox: { borderWidth: 1, borderRadius: 22, padding: 16, marginBottom: 20, width: 210, height: 210, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    qrImage: { width: 180, height: 180 },
    upiIdBox: { borderRadius: 14, padding: 14, width: '100%', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
    upiIdLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    upiIdValue: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    copyBtnText: { fontSize: 13, fontWeight: '700' },
    
    utrSection: { borderRadius: 22, padding: 16, width: '100%', marginBottom: 16, borderWidth: 1 },
    utrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    utrTitle: { fontSize: 14, fontWeight: '700' },
    utrHint: { fontSize: 12, lineHeight: 16, marginBottom: 12, fontWeight: '500' },
    utrInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, letterSpacing: 0.5, fontWeight: '600' },
    
    submitUtrButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14, gap: 8, width: '100%', marginBottom: 12 },
    submitUtrText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    payLaterButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 14 },
    payLaterText: { fontSize: 14, fontWeight: '700' },
    note: { fontSize: 11, textAlign: 'center', fontWeight: '500' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContentCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderBottomWidth: 0 },
    modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    modalAmount: { fontSize: 36, fontWeight: '800', marginBottom: 2 },
    modalPlan: { fontSize: 13, marginBottom: 20, fontWeight: '500' },
    confirmBtn: { width: '100%', paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12 },
    confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    cancelBtn: { paddingVertical: 8 },
    cancelText: { fontSize: 14, fontWeight: '600' },
  });