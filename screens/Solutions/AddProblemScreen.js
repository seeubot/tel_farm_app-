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
import { solutionsAPI, IMAGE_SERVER_URL } from '../../utils/api';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

const cropTypes = ['Paddy', 'Cotton', 'Chilli', 'Groundnut', 'Sugarcane', 'Maize', 'Turmeric', 'Other'];

export default function AddProblemScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const editMode = route.params?.editMode || false;
  const existingData = route.params?.problemData || null;
  
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [problemType, setProblemType] = useState(existingData?.type || 'text');
  const [media, setMedia] = useState(existingData?.mediaUrl || null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState(existingData?.mediaUrl || '');
  const [formData, setFormData] = useState({
    title: existingData?.title || '',
    teluguTitle: existingData?.teluguTitle || '',
    description: existingData?.description || '',
    teluguDescription: existingData?.teluguDescription || '',
    cropType: existingData?.cropType || '',
    location: existingData?.location?.address || '',
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      setUploadedMediaUrl('');
      setProblemType('image');
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      setUploadedMediaUrl('');
      setProblemType('video');
    }
  };

  const uploadToServer = async (fileUri, fileType = 'image') => {
    try {
      const token = await AsyncStorage.getItem('userToken') || 
                    await AsyncStorage.getItem('idToken') ||
                    await AsyncStorage.getItem('authToken');
      
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: `problem_${Date.now()}.${fileType === 'video' ? 'mp4' : 'jpg'}`,
        type: fileType === 'video' ? 'video/mp4' : 'image/jpeg',
      });

      const response = await fetch(`${IMAGE_SERVER_URL}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.url) {
        return data.url;
      }
      throw new Error(data.error || 'Upload failed');
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync(location.coords);
      if (reverseGeocode[0]) {
        const addr = reverseGeocode[0];
        setFormData(prev => ({
          ...prev,
          location: `${addr.city || addr.district || addr.region || ''}`
        }));
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.cropType) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      let mediaUrl = uploadedMediaUrl;

      if (media && !uploadedMediaUrl) {
        setUploadingMedia(true);
        try {
          mediaUrl = await uploadToServer(media, problemType);
          setUploadedMediaUrl(mediaUrl);
        } catch (uploadError) {
          Alert.alert('Upload Error', 'Failed to upload media. Please try again.');
          setLoading(false);
          setUploadingMedia(false);
          return;
        }
        setUploadingMedia(false);
      }
      
      const problemData = {
        title: formData.title,
        teluguTitle: formData.teluguTitle,
        description: formData.description,
        teluguDescription: formData.teluguDescription,
        cropType: formData.cropType,
        type: problemType,
        location: { address: formData.location },
        mediaUrl: mediaUrl,
      };

      if (editMode && existingData?._id) {
        const token = await AsyncStorage.getItem('userToken') || 
                      await AsyncStorage.getItem('idToken') ||
                      await AsyncStorage.getItem('authToken');
        
        const response = await fetch(`${IMAGE_SERVER_URL}/api/problems/${existingData._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(problemData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update problem');
        }
        
        Alert.alert('Updated', 'Your problem has been updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await solutionsAPI.createProblem(problemData);
        
        Alert.alert('Success', 'Your problem has been posted successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to save problem');
    } finally {
      setLoading(false);
    }
  };

  const handleBackNavigation = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackNavigation} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{editMode ? 'Edit Problem' : 'Post a Problem'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Problem Type Selection */}
        <Text style={styles.label}>Problem Type</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeButton, problemType === 'text' && styles.typeButtonActive]}
            onPress={() => setProblemType('text')}
          >
            <Text style={[styles.typeText, problemType === 'text' && styles.typeTextActive]}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, problemType === 'image' && styles.typeButtonActive]}
            onPress={pickImage}
          >
            <Text style={[styles.typeText, problemType === 'image' && styles.typeTextActive]}>Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, problemType === 'video' && styles.typeButtonActive]}
            onPress={pickVideo}
          >
            <Text style={[styles.typeText, problemType === 'video' && styles.typeTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>

        {/* Media Preview */}
        {media && (
          <View style={styles.mediaPreviewContainer}>
            {problemType === 'image' ? (
              <Image source={{ uri: media }} style={styles.previewImage} />
            ) : (
              <View style={styles.videoPreview}>
                <MaterialIcons name="play-circle-fill" size={40} color={colors.primary} />
                <Text style={styles.previewText}>Video ready</Text>
              </View>
            )}
            {uploadingMedia && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            {uploadedMediaUrl && !uploadingMedia && (
              <View style={styles.uploadedBadge}>
                <MaterialIcons name="check-circle" size={14} color="#059669" />
                <Text style={styles.uploadedText}>Uploaded</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.removeMediaBtn} 
              onPress={() => { setMedia(null); setUploadedMediaUrl(''); setProblemType('text'); }}
            >
              <Text style={styles.removeMediaText}>X</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Crop Type */}
        <Text style={styles.label}>Crop Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cropContainer}>
          {cropTypes.map(crop => (
            <TouchableOpacity
              key={crop}
              style={[styles.cropChip, formData.cropType === crop && styles.cropChipActive]}
              onPress={() => setFormData({ ...formData, cropType: crop })}
            >
              <Text style={[styles.cropText, formData.cropType === crop && styles.cropTextActive]}>{crop}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Title */}
        <Text style={styles.label}>Title (English) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Paddy leaves turning yellow"
          placeholderTextColor={colors.textMuted}
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />

        {/* Telugu Title */}
        <Text style={styles.label}>Title (Telugu)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., వరి ఆకులు పసుపు రంగులోకి మారుతున్నాయి"
          placeholderTextColor={colors.textMuted}
          value={formData.teluguTitle}
          onChangeText={(text) => setFormData({ ...formData, teluguTitle: text })}
        />

        {/* Description */}
        <Text style={styles.label}>Description (English) *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your problem in detail..."
          placeholderTextColor={colors.textMuted}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={5}
        />

        {/* Telugu Description */}
        <Text style={styles.label}>Description (Telugu)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="మీ సమస్యను వివరంగా రాయండి..."
          placeholderTextColor={colors.textMuted}
          value={formData.teluguDescription}
          onChangeText={(text) => setFormData({ ...formData, teluguDescription: text })}
          multiline
          numberOfLines={5}
        />

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.locationInput, { flex: 1 }]}
            placeholder="Village/District"
            placeholderTextColor={colors.textMuted}
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
          />
          <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
            <Text style={styles.locationBtnText}>📍</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, (loading || uploadingMedia) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploadingMedia}
        >
          {(loading || uploadingMedia) ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>{editMode ? 'Update Problem' : 'Post Problem'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 16, paddingTop: STATUS_BAR_HEIGHT + 10, paddingBottom: 30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 4 },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  label: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8, marginTop: 12 },
  typeContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
  typeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 14, color: colors.textSecondary },
  typeTextActive: { color: '#FFF' },
  mediaPreviewContainer: { position: 'relative', marginBottom: 16, alignSelf: 'flex-start' },
  previewImage: { width: 100, height: 100, borderRadius: 12 },
  videoPreview: { width: 100, height: 100, backgroundColor: colors.inputBg, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  previewText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: '#FFF', fontSize: 10, marginTop: 4 },
  uploadedBadge: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 3 },
  uploadedText: { color: '#059669', fontSize: 9, fontWeight: '700' },
  removeMediaBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#F44336', borderRadius: 12, padding: 4 },
  removeMediaText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  cropContainer: { flexDirection: 'row', marginBottom: 16 },
  cropChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.inputBg, marginRight: 10, borderWidth: 1, borderColor: colors.border },
  cropChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  cropText: { fontSize: 13, color: colors.textSecondary },
  cropTextActive: { color: '#FFF' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  locationRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  locationInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text },
  locationBtn: { padding: 12, backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  locationBtnText: { fontSize: 18 },
  submitButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { backgroundColor: colors.textMuted, opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  bottomSpace: { height: 20 },
});