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
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function AddSolutionScreen({ navigation, route }) {
  const { colors, isDarkTheme } = useTheme();
  const { problemId, problemTitle } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [solutionText, setSolutionText] = useState('');
  const [teluguSolution, setTeluguSolution] = useState('');
  const [media, setMedia] = useState(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images');
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
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMedia(result.assets[0].uri);
      setUploadedMediaUrl('');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Image',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  // ✅ Upload to Render server
  const uploadToServer = async (fileUri) => {
    try {
      const token = await AsyncStorage.getItem('idToken');
      
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: `solution_${Date.now()}.jpg`,
        type: 'image/jpeg',
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

  const handleSubmit = async () => {
    if (!solutionText.trim()) {
      Alert.alert('Error', 'Please enter your solution');
      return;
    }

    if (!problemId) {
      Alert.alert('Error', 'Problem ID missing');
      return;
    }

    setLoading(true);

    try {
      let mediaUrl = null;

      // Upload media if selected
      if (media && !uploadedMediaUrl) {
        setUploadingMedia(true);
        try {
          mediaUrl = await uploadToServer(media);
          setUploadedMediaUrl(mediaUrl);
        } catch (uploadError) {
          Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
          setLoading(false);
          setUploadingMedia(false);
          return;
        }
        setUploadingMedia(false);
      } else if (uploadedMediaUrl) {
        mediaUrl = uploadedMediaUrl;
      }

      // Submit solution via API
      await solutionsAPI.addSolution(problemId, {
        solution: solutionText.trim(),
        teluguSolution: teluguSolution.trim(),
        mediaUrl: mediaUrl,
        mediaType: mediaUrl ? 'image' : undefined,
      });

      Alert.alert(
        'Solution Posted',
        'Your solution has been posted successfully. Farmers will benefit from your advice!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to post solution');
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = () => {
    setMedia(null);
    setUploadedMediaUrl('');
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Solution</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Problem Info */}
        {problemTitle && (
          <View style={[styles.problemInfo, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="help-outline" size={20} color={colors.primary} />
            <Text style={styles.problemInfoText}>Replying to: {problemTitle}</Text>
          </View>
        )}

        {/* Solution Input */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={styles.label}>Your Solution (English) *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Write your solution here..."
            placeholderTextColor={colors.textMuted}
            value={solutionText}
            onChangeText={setSolutionText}
            multiline
            numberOfLines={6}
          />

          <Text style={styles.label}>Your Solution (Telugu)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="మీ పరిష్కారం తెలుగులో రాయండి..."
            placeholderTextColor={colors.textMuted}
            value={teluguSolution}
            onChangeText={setTeluguSolution}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Image Attachment */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={styles.label}>Add Supporting Image (Optional)</Text>
          <Text style={styles.hint}>Add a photo to help explain your solution better</Text>

          <TouchableOpacity style={styles.imageButton} onPress={showImagePickerOptions}>
            <MaterialIcons name="image" size={24} color={colors.primary} />
            <Text style={styles.imageButtonText}>Add Image</Text>
          </TouchableOpacity>

          {/* Image Preview */}
          {media && (
            <View style={styles.mediaPreviewContainer}>
              <Image source={{ uri: media }} style={styles.previewImage} />
              {uploadingMedia && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              )}
              {uploadedMediaUrl && !uploadingMedia && (
                <View style={styles.uploadedBadge}>
                  <MaterialIcons name="check-circle" size={12} color="#059669" />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              )}
              <TouchableOpacity style={styles.removeMediaBtn} onPress={removeMedia}>
                <MaterialIcons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: colors.primaryLight }]}>
          <View style={styles.tipsHeader}>
            <MaterialIcons name="lightbulb" size={20} color={colors.primary} />
            <Text style={styles.tipsTitle}>Tips for a helpful solution</Text>
          </View>
          <Text style={styles.tipText}>✓ Be specific and detailed in your response</Text>
          <Text style={styles.tipText}>✓ Include step-by-step instructions if possible</Text>
          <Text style={styles.tipText}>✓ Add photos to demonstrate</Text>
          <Text style={styles.tipText}>✓ Mention any precautions or safety measures</Text>
          <Text style={styles.tipText}>✓ Be respectful and encouraging</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!solutionText.trim() || loading || uploadingMedia) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!solutionText.trim() || loading || uploadingMedia}
        >
          {(loading || uploadingMedia) ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Post Solution</Text>
            </>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  problemInfo: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 20, gap: 10 },
  problemInfoText: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '500' },
  card: { borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  hint: { fontSize: 11, color: colors.textMuted, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 12 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  imageButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 12 },
  imageButtonText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  mediaPreviewContainer: { position: 'relative', marginTop: 4, alignSelf: 'flex-start' },
  previewImage: { width: 120, height: 120, borderRadius: 12 },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: '#FFF', fontSize: 9, marginTop: 3 },
  uploadedBadge: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 3 },
  uploadedText: { color: '#059669', fontSize: 9, fontWeight: '700' },
  removeMediaBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#F44336', borderRadius: 12, padding: 4 },
  tipsCard: { borderRadius: 16, padding: 16, marginBottom: 20 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  tipText: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, lineHeight: 18 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, gap: 8 },
  submitButtonDisabled: { backgroundColor: colors.textMuted, opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  bottomSpace: { height: 20 },
});