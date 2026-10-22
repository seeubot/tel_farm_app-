import React, { useState } from 'react';
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';
import { equipmentAPI, IMAGE_SERVER_URL } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function PostRentalScreen({ navigation }) {
  const { colors, isDarkTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    teluguName: '',
    category: 'Tractor',
    description: '',
    pricePerDay: '',
    pricePerHour: '',
    deposit: '',
    location: { lat: null, lng: null, address: '', village: '', district: '' },
    features: [],
  });
  const [featureInput, setFeatureInput] = useState('');

  const categories = [
    'Tractor', 'Harvester', 'Irrigation Pump', 'Power Tiller',
    'Sprayer', 'Processing Machine', 'Trailer', 'Other'
  ];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && images.length < 5) {
      setImages([...images, result.assets[0].uri]);
    } else if (images.length >= 5) {
      Alert.alert('Limit reached', 'You can upload up to 5 images');
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    const newUrls = [...uploadedImageUrls];
    newUrls.splice(index, 1);
    setUploadedImageUrls(newUrls);
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
      setFeatureInput('');
    }
  };

  const removeFeature = (feature) => {
    setFormData({ ...formData, features: formData.features.filter(f => f !== feature) });
  };

  // ✅ FIXED: Upload images one at a time with proper error handling
  const uploadImages = async (imageUris) => {
    try {
      const token = await AsyncStorage.getItem('idToken');
      const urls = [];

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i];
        
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          name: `equipment_${Date.now()}_${i}.jpg`,
          type: 'image/jpeg',
        });

        console.log(`📤 Uploading image ${i + 1}/${imageUris.length}...`);

        const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/image`, {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: formData,
        });

        // Get text first, then parse
        const responseText = await response.text();
        console.log(`📥 Response ${i + 1}:`, responseText.substring(0, 100));

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON Parse error for image', i + 1, ':', responseText);
          throw new Error(`Server error uploading image ${i + 1}`);
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || `Upload failed for image ${i + 1}`);
        }

        if (data.url) {
          urls.push(data.url);
          console.log(`✅ Image ${i + 1} uploaded:`, data.url);
        } else {
          throw new Error(`No URL returned for image ${i + 1}`);
        }
      }

      return urls;
    } catch (error) {
      console.error('Upload error:', error.message);
      throw error;
    }
  };

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setGettingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      const address = reverseGeocode[0];
      setFormData({
        ...formData,
        location: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          address: `${address?.name || ''}, ${address?.city || ''}, ${address?.region || ''}`,
          village: address?.city || address?.name || '',
          district: address?.region || '',
        },
      });
      Alert.alert('Location Set', 'Your location has been added.');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get location.');
    } finally {
      setGettingLocation(false);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) { Alert.alert('Error', 'Please enter equipment name'); return false; }
    if (!formData.pricePerDay || parseFloat(formData.pricePerDay) <= 0) { Alert.alert('Error', 'Please enter valid price per day'); return false; }
    if (!formData.deposit || parseFloat(formData.deposit) <= 0) { Alert.alert('Error', 'Please enter security deposit'); return false; }
    if (images.length === 0) { Alert.alert('Error', 'Please upload at least one image'); return false; }
    if (!formData.location.lat) { Alert.alert('Error', 'Please set your location'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const token = await AsyncStorage.getItem('idToken');
    if (!token) {
      Alert.alert('Session Expired', 'Please login again to continue.');
      return;
    }

    setLoading(true);
    setUploadingImages(true);

    try {
      // ✅ Upload images first
      let imageUrls = uploadedImageUrls;
      
      if (uploadedImageUrls.length === 0 && images.length > 0) {
        imageUrls = await uploadImages(images);
        setUploadedImageUrls(imageUrls);
      }

      setUploadingImages(false);

      const equipmentData = {
        name: formData.name,
        teluguName: formData.teluguName,
        category: formData.category,
        description: formData.description,
        pricing: {
          perDay: parseFloat(formData.pricePerDay),
          perHour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : null,
          deposit: parseFloat(formData.deposit),
        },
        location: formData.location,
        features: formData.features,
        images: imageUrls,
        availability: { isAvailable: true },
      };

      await equipmentAPI.create(equipmentData);
      
      Alert.alert('Success', 'Your equipment has been listed!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to post equipment');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
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
          <Text style={styles.title}>Post Equipment for Rent</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Equipment Details */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Equipment Details</Text>
          <Text style={styles.label}>Equipment Name *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="e.g., Mahindra Tractor" placeholderTextColor={colors.textMuted} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} />
          <Text style={styles.label}>Name in Telugu</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="ఉదా: మహీంద్రా ట్రాక్టర్" placeholderTextColor={colors.textMuted} value={formData.teluguName} onChangeText={(t) => setFormData({ ...formData, teluguName: t })} />
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.categoryChip, { backgroundColor: colors.inputBg, borderColor: colors.border }, formData.category === cat && styles.categoryChipActive]} onPress={() => setFormData({ ...formData, category: cat })}>
                <Text style={[styles.categoryText, formData.category === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="Describe your equipment..." placeholderTextColor={colors.textMuted} value={formData.description} onChangeText={(t) => setFormData({ ...formData, description: t })} multiline numberOfLines={4} />
        </View>

        {/* Pricing */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Pricing & Deposit</Text>
          <Text style={styles.label}>Price per Day (₹) *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="e.g., 1200" placeholderTextColor={colors.textMuted} value={formData.pricePerDay} onChangeText={(t) => setFormData({ ...formData, pricePerDay: t })} keyboardType="numeric" />
          <Text style={styles.label}>Price per Hour (₹)</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="e.g., 150" placeholderTextColor={colors.textMuted} value={formData.pricePerHour} onChangeText={(t) => setFormData({ ...formData, pricePerHour: t })} keyboardType="numeric" />
          <Text style={styles.label}>Security Deposit (₹) *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="e.g., 5000" placeholderTextColor={colors.textMuted} value={formData.deposit} onChangeText={(t) => setFormData({ ...formData, deposit: t })} keyboardType="numeric" />
          <Text style={styles.hintText}>Deposit is refundable after equipment return</Text>
        </View>

        {/* Features */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Features</Text>
          <View style={styles.addFeatureRow}>
            <TextInput style={[styles.featureInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]} placeholder="e.g., Power Steering" placeholderTextColor={colors.textMuted} value={featureInput} onChangeText={setFeatureInput} />
            <TouchableOpacity style={[styles.addFeatureBtn, { backgroundColor: colors.primary }]} onPress={addFeature}>
              <MaterialIcons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.featuresList}>
            {formData.features.map((f, i) => (
              <TouchableOpacity key={i} style={[styles.featureChip, { backgroundColor: colors.primaryLight }]} onPress={() => removeFeature(f)}>
                <Text style={[styles.featureChipText, { color: colors.primary }]}>{f} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Images */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Photos *</Text>
          <Text style={styles.hintText}>Upload clear photos of your equipment</Text>
          
          {uploadingImages && (
            <View style={[styles.uploadingBanner, { backgroundColor: colors.primaryLight }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.uploadingText, { color: colors.primary }]}>Uploading to server...</Text>
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.uploadedImage} />
                {uploadedImageUrls[index] && (
                  <View style={styles.uploadedBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#059669" />
                  </View>
                )}
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                  <MaterialIcons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={[styles.addImageBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={pickImage}>
                <MaterialIcons name="add-photo-alternate" size={32} color={colors.primary} />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={styles.imageCount}>{images.length}/5 photos</Text>
        </View>

        {/* Location */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Location *</Text>
          <TouchableOpacity style={[styles.locationButton, { backgroundColor: colors.primaryLight }]} onPress={getCurrentLocation} disabled={gettingLocation}>
            {gettingLocation ? <ActivityIndicator size="small" color={colors.primary} /> : (
              <>
                <MaterialIcons name="my-location" size={20} color={colors.primary} />
                <Text style={[styles.locationButtonText, { color: colors.primary }]}>{formData.location.address ? 'Update Location' : 'Get Current Location'}</Text>
              </>
            )}
          </TouchableOpacity>
          {formData.location.address && (
            <View style={styles.locationInfo}>
              <MaterialIcons name="location-on" size={16} color={colors.primary} />
              <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>{formData.location.address}</Text>
            </View>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }, (loading || uploadingImages) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading || uploadingImages}>
          {(loading || uploadingImages) ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Post Equipment</Text>}
        </TouchableOpacity>
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: STATUS_BAR_HEIGHT + 10, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 8 },
  textArea: { height: 100, textAlignVertical: 'top' },
  hintText: { fontSize: 11, color: colors.textMuted, marginTop: -4, marginBottom: 8, fontStyle: 'italic' },
  uploadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginBottom: 8 },
  uploadingText: { fontSize: 12, fontWeight: '500' },
  categoryContainer: { flexDirection: 'row', marginBottom: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: 13, color: colors.textSecondary },
  categoryTextActive: { color: '#FFF' },
  addFeatureRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  featureInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  addFeatureBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  featuresList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  featureChipText: { fontSize: 12 },
  imageScroll: { flexDirection: 'row', marginVertical: 12 },
  imageContainer: { position: 'relative', marginRight: 12 },
  uploadedImage: { width: 100, height: 100, borderRadius: 12 },
  uploadedBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 2 },
  removeImageBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#F44336', borderRadius: 12, padding: 2 },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addImageText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  imageCount: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  locationButtonText: { fontSize: 14, fontWeight: '500' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  locationAddress: { flex: 1, fontSize: 12 },
  submitButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  bottomSpace: { height: 20 },
});