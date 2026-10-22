import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function PromotionsScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // --- ANIMATION VALUES ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  // Track dynamic animation scale instances for each plan layout item
  const scaleBasic = useRef(new Animated.Value(1)).current;
  const scaleStandard = useRef(new Animated.Value(1)).current;
  const scalePremium = useRef(new Animated.Value(1)).current;

  const getScaleRef = (id) => {
    if (id === 'basic') return scaleBasic;
    if (id === 'standard') return scaleStandard;
    return scalePremium;
  };

  useEffect(() => {
    // Entrance Sequence
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Infinite Badge Pulse Configuration
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 499,
      duration: '7 days',
      color: '#4CAF50',
      features: [
        'Priority in search results',
        'Featured badge on listing',
        '7 days promotion',
      ],
      notIncluded: [
        'Home page banner',
        'Push notifications',
      ],
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 999,
      duration: '15 days',
      color: '#FF9800',
      popular: true,
      features: [
        'Priority in search results',
        'Featured badge on listing',
        'Home page banner',
        'Push notification to buyers',
        '15 days promotion',
      ],
      notIncluded: [
        'WhatsApp broadcast',
        'Social media post',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 1999,
      duration: '30 days',
      color: '#9C27B0',
      features: [
        'Top priority in search results',
        'Featured badge on listing',
        'Home page banner (top position)',
        'Multiple push notifications',
        'WhatsApp broadcast',
        'Social media promotion',
        'Email campaign',
        '30 days promotion',
      ],
      notIncluded: [],
    },
  ];

  const featuredListings = [
    { id: 1, name: 'Organic Paddy', farmer: 'Ramesh Naik', price: '₹2,200/quintal', views: 1245 },
    { id: 2, name: 'Cotton Bundle', farmer: 'Sujatha Devi', price: '₹6,500/quintal', views: 892 },
    { id: 3, name: 'Mahindra Tractor', farmer: 'Venkatesh Reddy', price: '₹1,200/day', views: 567 },
  ];

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
    
    // Animate structural pop context selection feedback
    plans.forEach((p) => {
      const scaleValue = getScaleRef(p.id);
      if (p.id === planId) {
        Animated.sequence([
          Animated.timing(scaleValue, { toValue: 1.02, duration: 100, useNativeDriver: true }),
          Animated.timing(scaleValue, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.timing(scaleValue, { toValue: 0.98, duration: 150, useNativeDriver: true }).start();
      }
    });
  };

  const handleRequestPromotion = () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please choose a promotion plan to continue');
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Accept Terms', 'Please read and accept the terms and conditions');
      return;
    }
    setShowRequestModal(true);
  };

  const submitRequest = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    Alert.alert(
      'Request Submitted',
      `Your ${plan.name} promotion request has been received!\n\nAmount: ₹${plan.price}\nDuration: ${plan.duration}\n\nWe will review and activate within 24 hours.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
    setShowRequestModal(false);
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Promotions</Text>
          <TouchableOpacity style={styles.historyButton}>
            <MaterialIcons name="history" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Banner */}
        <View style={[styles.heroBanner, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroTitle}>Boost Your Sales!</Text>
          <Text style={styles.heroSubtitle}>
            Get your produce and equipment seen by 10,000+ farmers and buyers
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>10K+</Text>
              <Text style={styles.heroStatLabel}>Active Buyers</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>₹2L+</Text>
              <Text style={styles.heroStatLabel}>Sales Generated</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNumber}>95%</Text>
              <Text style={styles.heroStatLabel}>Satisfaction</Text>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: colors.primary + '15' }]}>
                <MaterialIcons name="assignment" size={22} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>Choose Plan</Text>
              <Text style={styles.stepDesc}>Select a plan that fits your needs</Text>
            </View>
            <View style={styles.stepArrow}>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: colors.primary + '15' }]}>
                <MaterialIcons name="payment" size={22} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>Make Payment</Text>
              <Text style={styles.stepDesc}>Secure online payment</Text>
            </View>
            <View style={styles.stepArrow}>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </View>
            <View style={styles.step}>
              <View style={[styles.stepCircle, { backgroundColor: colors.primary + '15' }]}>
                <MaterialIcons name="campaign" size={22} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>Get Featured</Text>
              <Text style={styles.stepDesc}>Start getting more buyers</Text>
            </View>
          </View>
        </View>

        {/* Promotion Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotion Plans</Text>
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isCurrentSelected = selectedPlan === plan.id;
              const currentScale = getScaleRef(plan.id);

              return (
                <Animated.View 
                  key={plan.id}
                  style={{ transform: [{ scale: currentScale }] }}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.planCard,
                      { backgroundColor: colors.surface },
                      isCurrentSelected && { borderColor: plan.color, borderWidth: 2, backgroundColor: colors.surface },
                    ]}
                    onPress={() => handleSelectPlan(plan.id)}
                  >
                    {plan.popular && (
                      <Animated.View style={[styles.popularBadge, { backgroundColor: plan.color, opacity: pulseAnim }]}>
                        <Text style={styles.popularText}>Most Popular</Text>
                      </Animated.View>
                    )}
                    <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                    <Text style={styles.planPrice}>₹{plan.price}</Text>
                    <Text style={styles.planDuration}>{plan.duration}</Text>
                    
                    <View style={styles.planFeatures}>
                      {plan.features.slice(0, 3).map((feature, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <MaterialIcons name="check-circle" size={14} color={plan.color} />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                      {plan.features.length > 3 && (
                        <Text style={styles.moreFeatures}>+{plan.features.length - 3} more features</Text>
                      )}
                    </View>
                    
                    <View style={[
                      styles.selectPlanBtn, 
                      { borderColor: plan.color },
                      isCurrentSelected && { backgroundColor: plan.color }
                    ]}>
                      <Text style={[
                        styles.selectPlanText, 
                        { color: plan.color },
                        isCurrentSelected && { color: '#FFF', fontWeight: '700' }
                      ]}>
                        {isCurrentSelected ? '✓ Selected' : 'Select Plan'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Featured Listings Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Success Stories</Text>
            <TouchableOpacity activeOpacity={0.6}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
            {featuredListings.map((item) => (
              <View key={item.id} style={[styles.featuredCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.featuredBadge, { backgroundColor: colors.primary + '15' }]}>
                  <MaterialIcons name="stars" size={12} color={colors.primary} />
                  <Text style={[styles.featuredBadgeText, { color: colors.primary }]}>Featured</Text>
                </View>
                <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.featuredFarmer} numberOfLines={1}>{item.farmer}</Text>
                <Text style={styles.featuredPrice}>{item.price}</Text>
                <View style={styles.featuredStats}>
                  <MaterialIcons name="visibility" size={12} color={colors.textMuted} />
                  <Text style={styles.featuredViews}>{item.views} views</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Promote With Us?</Text>
          <View style={styles.benefitsGrid}>
            <View style={[styles.benefitCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                <MaterialIcons name="visibility" size={22} color={colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>More Visibility</Text>
              <Text style={styles.benefitDesc}>Featured on homepage and search results</Text>
            </View>
            <View style={[styles.benefitCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                <MaterialIcons name="notifications-active" size={22} color={colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>Push Alerts</Text>
              <Text style={styles.benefitDesc}>Direct notifications to interested buyers</Text>
            </View>
            <View style={[styles.benefitCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                <MaterialIcons name="verified" size={22} color={colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>Trust Badge</Text>
              <Text style={styles.benefitDesc}>Get a special "Featured" verification badge</Text>
            </View>
            <View style={[styles.benefitCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.benefitIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                <MaterialIcons name="trending-up" size={22} color={colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>Higher Sales</Text>
              <Text style={styles.benefitDesc}>2x-3x more inquiries from buyers</Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={[styles.termsContainerBlock, { backgroundColor: colors.surface }]}>
          <TouchableOpacity 
            style={styles.termsHeader}
            onPress={() => setShowTermsModal(true)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="description" size={20} color={colors.primary} />
            <Text style={styles.termsHeaderText}>Terms & Conditions</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name={agreedToTerms ? "check-box" : "check-box-outline-blank"} 
              size={22} 
              color={colors.primary} 
            />
            <Text style={styles.checkboxText}>
              I agree to the terms and conditions
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={handleRequestPromotion}
          activeOpacity={0.8}
        >
          <MaterialIcons name="rocket-launch" size={20} color="#FFF" />
          <Text style={styles.ctaButtonText}>Request Promotion</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Terms Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showTermsModal}
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.termsTitle}>AgriAgent Promotion Terms</Text>
            <Text style={styles.termsDate}>Last updated: May 2026</Text>

            <Text style={styles.termsSection}>1. Eligibility</Text>
            <Text style={styles.termsText}>
              • User must have a verified account on AgriAgent{'\n'}
              • Listing must be genuine and accurate{'\n'}
              • No fraudulent or misleading information
            </Text>

            <Text style={styles.termsSection}>2. Payment & Refund</Text>
            <Text style={styles.termsText}>
              • Payment must be completed before promotion starts{'\n'}
              • No refund once promotion is active{'\n'}
              • Refund only if promotion is not delivered
            </Text>

            <Text style={styles.termsSection}>3. Promotion Duration</Text>
            <Text style={styles.termsText}>
              • Starts within 24 hours of payment confirmation{'\n'}
              • Duration as per selected plan{'\n'}
              • Extension available at standard rates
            </Text>

            <Text style={styles.termsSection}>4. Content Guidelines</Text>
            <Text style={styles.termsText}>
              • Images must be clear and authentic{'\n'}
              • No misleading pricing or claims{'\n'}
              • AgriAgent reserves right to edit content
            </Text>

            <Text style={styles.termsSection}>5. Termination</Text>
            <Text style={styles.termsText}>
              • AgriAgent may terminate promotion if terms violated{'\n'}
              • No refund for terminated promotions{'\n'}
              • User may be banned from future promotions
            </Text>

            <Text style={styles.termsSection}>6. Liability</Text>
            <Text style={styles.termsText}>
              • AgriAgent is not responsible for sales outcomes{'\n'}
              • Promotion guarantees visibility, not sales{'\n'}
              • Results may vary based on product and market
            </Text>

            <TouchableOpacity style={styles.acceptButton} onPress={() => {
              setAgreedToTerms(true);
              setShowTermsModal(false);
            }}>
              <Text style={styles.acceptButtonText}>I Accept the Terms</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Request Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showRequestModal}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRequestModal(false)} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Promotion</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.requestTitle}>Selected Plan</Text>
            {selectedPlan && (
              <View style={[styles.requestPlanCard, { backgroundColor: colors.primary + '10' }]}>
                <Text style={[styles.requestPlanName, { color: colors.primary }]}>
                  {plans.find(p => p.id === selectedPlan)?.name}
                </Text>
                <Text style={styles.requestPlanPrice}>
                  ₹{plans.find(p => p.id === selectedPlan)?.price}
                </Text>
                <Text style={styles.requestPlanDuration}>
                  {plans.find(p => p.id === selectedPlan)?.duration}
                </Text>
              </View>
            )}

            <Text style={styles.requestTitle}>Select Item to Promote</Text>
            <TouchableOpacity style={[styles.selectItemBtn, { borderColor: colors.primary }]}>
              <MaterialIcons name="add-circle" size={20} color={colors.primary} />
              <Text style={[styles.selectItemText, { color: colors.primary }]}>Choose from your listings</Text>
            </TouchableOpacity>

            <Text style={styles.requestTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity style={[styles.paymentMethod, { borderColor: colors.border }]}>
                <MaterialIcons name="credit-card" size={20} color={colors.primary} />
                <Text style={[styles.paymentMethodText, { color: colors.text }]}>Card Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.paymentMethod, { borderColor: colors.border }]}>
                <MaterialIcons name="qr-code-scanner" size={20} color={colors.primary} />
                <Text style={[styles.paymentMethodText, { color: colors.text }]}>UPI / QR Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.paymentMethod, { borderColor: colors.border }]}>
                <MaterialIcons name="account-balance-wallet" size={20} color={colors.primary} />
                <Text style={[styles.paymentMethodText, { color: colors.text }]}>Net Banking</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.submitRequestBtn, { backgroundColor: colors.primary }]}
              onPress={submitRequest}
            >
              <Text style={styles.submitRequestBtnText}>Submit Request</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </Animated.View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  historyButton: {
    padding: 8,
  },
  heroBanner: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 }
    })
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 24,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  stepArrow: {
    paddingHorizontal: 2,
    marginTop: -20,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    borderRadius: 18,
    padding: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 2 }
    })
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  popularText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  planDuration: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  planFeatures: {
    marginBottom: 20,
    gap: 8
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  moreFeatures: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    paddingLeft: 24,
  },
  selectPlanBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  selectPlanText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  featuredScroll: {
    flexDirection: 'row',
  },
  featuredCard: {
    width: 150,
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6 },
      android: { elevation: 1.5 }
    })
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  featuredFarmer: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
  },
  featuredPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredViews: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500'
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: (width - 44) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 6 },
      android: { elevation: 1.5 }
    })
  },
  benefitIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  termsContainerBlock: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  termsHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  checkboxText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 }
    })
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  bottomSpace: {
    height: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: STATUS_BAR_HEIGHT + 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  termsTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  termsDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 20,
  },
  termsSection: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  termsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  acceptButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  requestTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  requestPlanCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  requestPlanName: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  requestPlanPrice: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  requestPlanDuration: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 1,
  },
  selectItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  selectItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentMethods: {
    gap: 10,
    marginBottom: 24,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitRequestBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  submitRequestBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});