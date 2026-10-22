import React, { useState, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

// Crop price data sourced from publicly available market information
// NOT official government data — verify at agricoop.gov.in
const cropPriceData = {
  paddy: {
    name: 'Paddy',
    teluguName: 'వరి',
    varieties: [
      { name: 'Common', price: 2300, unit: 'quintal' },
      { name: 'Grade A', price: 2320, unit: 'quintal' },
    ],
    avgYield: 25,
  },
  cotton: {
    name: 'Cotton',
    teluguName: 'పత్తి',
    varieties: [
      { name: 'Medium Staple', price: 6620, unit: 'quintal' },
      { name: 'Long Staple', price: 7020, unit: 'quintal' },
    ],
    avgYield: 5.5,
  },
  chilli: {
    name: 'Chilli',
    teluguName: 'మిరప',
    varieties: [
      { name: 'Teja', price: 16500, unit: 'quintal' },
      { name: 'Byadgi', price: 15500, unit: 'quintal' },
    ],
    avgYield: 8,
  },
  redGram: {
    name: 'Red Gram (Tur)',
    teluguName: 'కందిపప్పు',
    varieties: [
      { name: 'Red Gram', price: 7550, unit: 'quintal' },
    ],
    avgYield: 6,
  },
  maize: {
    name: 'Maize',
    teluguName: 'మొక్కజొన్న',
    varieties: [
      { name: 'Maize', price: 2225, unit: 'quintal' },
    ],
    avgYield: 30,
  },
  groundnut: {
    name: 'Groundnut',
    teluguName: 'వేరుశనగ',
    varieties: [
      { name: 'Groundnut', price: 6375, unit: 'quintal' },
    ],
    avgYield: 12,
  },
  sugarcane: {
    name: 'Sugarcane',
    teluguName: 'చెరకు',
    varieties: [
      { name: 'Sugarcane', price: 3800, unit: 'tonne' },
    ],
    avgYield: 80,
  },
  turmeric: {
    name: 'Turmeric',
    teluguName: 'పసుపు',
    varieties: [
      { name: 'Turmeric', price: 12500, unit: 'quintal' },
    ],
    avgYield: 10,
  },
  soybean: {
    name: 'Soybean',
    teluguName: 'సోయాబీన్',
    varieties: [
      { name: 'Soybean', price: 4892, unit: 'quintal' },
    ],
    avgYield: 12,
  },
};

const cropList = [
  { id: 'paddy', name: 'Paddy', icon: 'grass' },
  { id: 'cotton', name: 'Cotton', icon: 'cloud' },
  { id: 'chilli', name: 'Chilli', icon: 'local-fire-department' },
  { id: 'redGram', name: 'Red Gram', icon: 'eco' },
  { id: 'maize', name: 'Maize', icon: 'grass' },
  { id: 'groundnut', name: 'Groundnut', icon: 'eco' },
  { id: 'sugarcane', name: 'Sugarcane', icon: 'grass' },
  { id: 'turmeric', name: 'Turmeric', icon: 'spa' },
  { id: 'soybean', name: 'Soybean', icon: 'eco' },
];

export default function RevenueCalculatorScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [landArea, setLandArea] = useState('');
  const [yieldPerAcre, setYieldPerAcre] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [useManualPrice, setUseManualPrice] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);
  const [savedCalculations, setSavedCalculations] = useState([]);

  useEffect(() => {
    loadUserData();
    loadSavedCalculations();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadSavedCalculations = async () => {
    try {
      const saved = await AsyncStorage.getItem('revenueCalculations');
      if (saved) {
        setSavedCalculations(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved calculations:', error);
    }
  };

  const saveCalculation = (result) => {
    const newCalc = {
      id: Date.now().toString(),
      cropName: selectedCrop.name,
      area: result.area,
      totalRevenue: result.totalRevenue,
      date: new Date().toLocaleDateString(),
    };
    const updated = [newCalc, ...savedCalculations.slice(0, 9)];
    setSavedCalculations(updated);
    AsyncStorage.setItem('revenueCalculations', JSON.stringify(updated));
  };

  const getCurrentPrice = () => {
    if (useManualPrice && customPrice) {
      return parseFloat(customPrice);
    }
    if (selectedVariety) {
      return selectedVariety.price || 0;
    }
    const firstVariety = cropPriceData[selectedCrop?.id]?.varieties[0];
    return firstVariety?.price || 0;
  };

  const calculateRevenue = () => {
    const area = parseFloat(landArea);
    let yieldValue = parseFloat(yieldPerAcre);
    const price = getCurrentPrice();

    if (isNaN(area) || area <= 0) {
      Alert.alert('Error', 'Please enter valid land area');
      return;
    }

    if (isNaN(yieldValue) || yieldValue <= 0) {
      yieldValue = cropPriceData[selectedCrop?.id]?.avgYield || 0;
    }

    if (yieldValue <= 0) {
      Alert.alert('Error', 'Please enter valid yield or check crop data');
      return;
    }

    if (price <= 0) {
      Alert.alert('Error', 'Price not available. Please enter manually');
      return;
    }

    const totalYield = area * yieldValue;
    const totalRevenue = totalYield * price;
    const revenuePerAcre = yieldValue * price;

    const result = {
      area,
      yieldPerAcre: yieldValue,
      totalYield,
      price,
      totalRevenue,
      revenuePerAcre,
      unit: cropPriceData[selectedCrop?.id]?.varieties[0]?.unit === 'tonne' ? 'Tonnes' : 'Quintals',
      cropName: selectedCrop.name,
      varietyName: selectedVariety?.name,
      date: new Date().toLocaleDateString(),
    };

    setCalculationResult(result);
    saveCalculation(result);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const clearCalculation = () => {
    setCalculationResult(null);
    setLandArea('');
    setYieldPerAcre('');
    setCustomPrice('');
    setUseManualPrice(false);
  };

  const openSourceLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Revenue Calculator</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ✅ DISCLAIMER BANNER — Required by Google Play */}
        <View style={[styles.disclaimerBanner, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="info-outline" size={18} color="#E65100" />
          <View style={styles.disclaimerContent}>
            <Text style={styles.disclaimerTitle}>⚠️ Important Notice</Text>
            <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
              AgriAgent is an independent app.{' '}
              <Text style={styles.disclaimerBold}>We are NOT affiliated with any government entity.</Text>
              {'\n'}
              Crop prices shown are indicative market rates sourced from publicly available information. 
              They may differ from official MSP rates.
            </Text>
            <View style={styles.sourceLinks}>
              <Text style={[styles.sourceLabel, { color: colors.textMuted }]}>Official Sources:</Text>
              <TouchableOpacity onPress={() => openSourceLink('https://agricoop.gov.in')}>
                <Text style={[styles.sourceLink, { color: colors.primary }]}>agricoop.gov.in</Text>
              </TouchableOpacity>
              <Text style={[styles.sourceSeparator, { color: colors.textMuted }]}>|</Text>
              <TouchableOpacity onPress={() => openSourceLink('https://agmarknet.gov.in')}>
                <Text style={[styles.sourceLink, { color: colors.primary }]}>agmarknet.gov.in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Crop Selection */}
        {!selectedCrop ? (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Crop</Text>
            <View style={styles.cropGrid}>
              {cropList.map((crop) => (
                <TouchableOpacity
                  key={crop.id}
                  style={[styles.cropCard, { backgroundColor: colors.surface }]}
                  onPress={() => setSelectedCrop(crop)}
                >
                  <MaterialIcons name={crop.icon} size={32} color={colors.primary} />
                  <Text style={[styles.cropName, { color: colors.text }]}>{crop.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Selected Crop Header */}
            <TouchableOpacity 
              style={[styles.selectedCropHeader, { backgroundColor: colors.surface }]}
              onPress={() => {
                setSelectedCrop(null);
                setSelectedVariety(null);
                setCalculationResult(null);
              }}
            >
              <View>
                <Text style={[styles.selectedCropName, { color: colors.text }]}>{selectedCrop.name}</Text>
                <Text style={[styles.selectedCropTelugu, { color: colors.textMuted }]}>
                  {cropPriceData[selectedCrop.id]?.teluguName}
                </Text>
              </View>
              <MaterialIcons name="edit" size={20} color={colors.primary} />
            </TouchableOpacity>

            {/* Variety Selection */}
            {cropPriceData[selectedCrop.id]?.varieties.length > 1 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Select Variety</Text>
                  <View style={styles.varietyContainer}>
                    {cropPriceData[selectedCrop.id].varieties.map((variety, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.varietyChip,
                          { backgroundColor: colors.inputBg, borderColor: colors.border },
                          selectedVariety?.name === variety.name && styles.varietyChipActive,
                        ]}
                        onPress={() => setSelectedVariety(variety)}
                      >
                        <Text style={[
                          styles.varietyText,
                          selectedVariety?.name === variety.name && styles.varietyTextActive,
                        ]}>
                          {variety.name}
                        </Text>
                        <Text style={styles.varietyPrice}>
                          ₹{variety.price}/{variety.unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Land & Yield Input */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Land & Yield Details</Text>

                <Text style={styles.label}>Land Area (acres) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter land area in acres"
                  placeholderTextColor={colors.textMuted}
                  value={landArea}
                  onChangeText={setLandArea}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Yield per Acre ({cropPriceData[selectedCrop.id]?.varieties[0]?.unit === 'tonne' ? 'Tonnes' : 'Quintals'})</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Default: ${cropPriceData[selectedCrop.id]?.avgYield || 'N/A'} units/acre`}
                  placeholderTextColor={colors.textMuted}
                  value={yieldPerAcre}
                  onChangeText={setYieldPerAcre}
                  keyboardType="numeric"
                />
                <Text style={styles.hintText}>Leave empty to use average yield for this crop</Text>
              </Card.Content>
            </Card>

            {/* Price Input */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Price per {cropPriceData[selectedCrop.id]?.varieties[0]?.unit === 'tonne' ? 'Tonnes' : 'Quintals'}</Text>

                <View style={styles.priceToggle}>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      !useManualPrice && styles.toggleOptionActive,
                    ]}
                    onPress={() => setUseManualPrice(false)}
                  >
                    <Text style={[
                      styles.toggleText,
                      !useManualPrice && styles.toggleTextActive,
                    ]}>
                      Market Rate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleOption,
                      useManualPrice && styles.toggleOptionActive,
                    ]}
                    onPress={() => setUseManualPrice(true)}
                  >
                    <Text style={[
                      styles.toggleText,
                      useManualPrice && styles.toggleTextActive,
                    ]}>
                      Manual Entry
                    </Text>
                  </TouchableOpacity>
                </View>

                {!useManualPrice ? (
                  <View style={styles.priceDisplay}>
                    <Text style={styles.priceValue}>
                      ₹{getCurrentPrice().toLocaleString()}
                    </Text>
                    <Text style={styles.priceSubtext}>
                      Indicative market rate — verify at source
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter price per unit"
                    placeholderTextColor={colors.textMuted}
                    value={customPrice}
                    onChangeText={setCustomPrice}
                    keyboardType="numeric"
                  />
                )}
              </Card.Content>
            </Card>

            {/* Calculate Button */}
            <Button
              mode="contained"
              onPress={calculateRevenue}
              style={styles.calculateButton}
              buttonColor={colors.primary}
            >
              Calculate Revenue
            </Button>

            {/* Results */}
            {calculationResult && (
              <Card style={styles.resultCard}>
                <Card.Content>
                  <Text style={[styles.resultTitle, { color: colors.text }]}>Revenue Summary</Text>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Land Area</Text>
                    <Text style={styles.resultValue}>{calculationResult.area} acres</Text>
                  </View>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Yield per Acre</Text>
                    <Text style={styles.resultValue}>
                      {calculationResult.yieldPerAcre} {calculationResult.unit}
                    </Text>
                  </View>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Total Yield</Text>
                    <Text style={styles.resultValue}>
                      {calculationResult.totalYield.toLocaleString()} {calculationResult.unit}
                    </Text>
                  </View>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Price per Unit</Text>
                    <Text style={styles.resultValue}>{formatCurrency(calculationResult.price)}</Text>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.revenueLabel}>Revenue per Acre</Text>
                    <Text style={styles.revenueValue}>{formatCurrency(calculationResult.revenuePerAcre)}</Text>
                  </View>
                  
                  <View style={styles.resultRow}>
                    <Text style={styles.totalRevenueLabel}>Total Revenue</Text>
                    <Text style={styles.totalRevenueValue}>{formatCurrency(calculationResult.totalRevenue)}</Text>
                  </View>

                  {/* ✅ Result disclaimer */}
                  <Text style={[styles.resultDisclaimer, { color: colors.textMuted }]}>
                    Estimates only. Actual revenue may vary. Verify official rates at agricoop.gov.in
                  </Text>

                  <TouchableOpacity style={styles.clearButton} onPress={clearCalculation}>
                    <Text style={styles.clearButtonText}>New Calculation</Text>
                  </TouchableOpacity>
                </Card.Content>
              </Card>
            )}

            {/* Recent Calculations */}
            {savedCalculations.length > 0 && !calculationResult && (
              <Card style={styles.historyCard}>
                <Card.Content>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Calculations</Text>
                  {savedCalculations.map((calc) => (
                    <View key={calc.id} style={styles.historyItem}>
                      <View>
                        <Text style={[styles.historyCrop, { color: colors.text }]}>{calc.cropName}</Text>
                        <Text style={[styles.historyDate, { color: colors.textMuted }]}>{calc.date}</Text>
                      </View>
                      <Text style={[styles.historyAmount, { color: colors.primary }]}>{formatCurrency(calc.totalRevenue)}</Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: STATUS_BAR_HEIGHT + 10, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },

  // ✅ Disclaimer styles
  disclaimerBanner: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    gap: 10,
  },
  disclaimerContent: { flex: 1 },
  disclaimerTitle: { fontSize: 13, fontWeight: '700', color: '#E65100', marginBottom: 4 },
  disclaimerText: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  disclaimerBold: { fontWeight: '700' },
  sourceLinks: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sourceLabel: { fontSize: 11 },
  sourceLink: { fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
  sourceSeparator: { fontSize: 11 },

  // ✅ Result disclaimer
  resultDisclaimer: { fontSize: 11, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 },
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cropCard: { width: '30%', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2 },
  cropName: { fontSize: 13, marginTop: 8, fontWeight: '500' },
  selectedCropHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16 },
  selectedCropName: { fontSize: 18, fontWeight: 'bold' },
  selectedCropTelugu: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 16, marginBottom: 16, elevation: 2, backgroundColor: colors.cardBg },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 8 },
  hintText: { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  varietyContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  varietyChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: '45%' },
  varietyChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  varietyText: { fontSize: 13, fontWeight: '500', color: colors.text },
  varietyTextActive: { color: '#FFF' },
  varietyPrice: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  priceToggle: { flexDirection: 'row', backgroundColor: colors.inputBg, borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleOptionActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 13, color: colors.textSecondary },
  toggleTextActive: { color: '#FFF', fontWeight: '500' },
  priceDisplay: { alignItems: 'center', paddingVertical: 20, backgroundColor: colors.primaryLight, borderRadius: 12 },
  priceValue: { fontSize: 32, fontWeight: 'bold', color: colors.primary },
  priceSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  calculateButton: { borderRadius: 12, paddingVertical: 6, marginBottom: 16 },
  resultCard: { borderRadius: 16, marginBottom: 16, backgroundColor: colors.primaryLight },
  resultTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultLabel: { fontSize: 14, color: colors.textSecondary },
  resultValue: { fontSize: 14, fontWeight: '500', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  revenueLabel: { fontSize: 16, fontWeight: '500', color: colors.text },
  revenueValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  totalRevenueLabel: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  totalRevenueValue: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  clearButton: { marginTop: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 10 },
  clearButtonText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  historyCard: { borderRadius: 16, marginBottom: 16, backgroundColor: colors.cardBg },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyCrop: { fontSize: 14, fontWeight: '500' },
  historyDate: { fontSize: 11, marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: 'bold' },
  bottomSpace: { height: 20 },
});