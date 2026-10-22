import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../utils/theme';

export default function VerificationModal({ visible, onClose, onVerify }) {
  const { colors } = useTheme();
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [aadharImage, setAadharImage] = useState(null);
  const [panImage, setPanImage] = useState(null);
  
  const handlePhoneVerify = () => {
    Alert.alert('Demo', 'OTP sent to +91 XXXXXXX123');
    setStep(2);
  };
  
  const handleOtpVerify = () => {
    if (otp === '123456') {
      Alert.alert('Success', 'Phone number verified!');
      setStep(3);
    } else {
      Alert.alert('Error', 'Invalid OTP. Demo OTP: 123456');
    }
  };
  
  const pickDocument = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      if (type === 'aadhar') {
        setAadharImage(result.assets[0].uri);
      } else {
        setPanImage(result.assets[0].uri);
      }
    }
  };
  
  const handleDocumentSubmit = () => {
    if (aadharImage) {
      Alert.alert(
        'Documents Submitted',
        'Your documents have been submitted for verification. Admin will verify within 24-48 hours.',
        [{ text: 'OK', onPress: () => {
          onVerify();
          onClose();
          setStep(1);
          setAadharImage(null);
          setPanImage(null);
        }}]
      );
    } else {
      Alert.alert('Error', 'Please upload Aadhar card');
    }
  };
  
  const styles = getStyles(colors);
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Verification</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
              <Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text>
              <Text style={styles.progressLabel}>Phone</Text>
            </View>
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
              <Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text>
              <Text style={styles.progressLabel}>OTP</Text>
            </View>
            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
            <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
              <Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text>
              <Text style={styles.progressLabel}>Documents</Text>
            </View>
          </View>
          
          <ScrollView>
            {step === 1 && (
              <View style={styles.stepContent}>
                <MaterialIcons name="phone-android" size={50} color={colors.primary} style={styles.stepIcon} />
                <Text style={styles.stepTitle}>Verify Your Phone Number</Text>
                <Text style={styles.stepDesc}>
                  We'll send an OTP to verify your identity. This helps prevent fraud.
                </Text>
                <TouchableOpacity style={styles.verifyPhoneBtn} onPress={handlePhoneVerify}>
                  <Text style={styles.verifyPhoneBtnText}>Send OTP</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {step === 2 && (
              <View style={styles.stepContent}>
                <MaterialIcons name="vpn-key" size={50} color={colors.primary} style={styles.stepIcon} />
                <Text style={styles.stepTitle}>Enter OTP</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor={colors.textMuted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <Text style={styles.demoHint}>Demo OTP: 123456</Text>
                <TouchableOpacity style={styles.verifyBtn} onPress={handleOtpVerify}>
                  <Text style={styles.verifyBtnText}>Verify OTP</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {step === 3 && (
              <View style={styles.stepContent}>
                <MaterialIcons name="assignment-ind" size={50} color={colors.primary} style={styles.stepIcon} />
                <Text style={styles.stepTitle}>Upload ID Proof</Text>
                
                <Text style={styles.docLabel}>Aadhar Card (Required)</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={() => pickDocument('aadhar')}>
                  {aadharImage ? (
                    <Image source={{ uri: aadharImage }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={30} color={colors.primary} />
                      <Text style={styles.uploadText}>Tap to upload Aadhar</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.docLabel}>PAN Card (Optional)</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={() => pickDocument('pan')}>
                  {panImage ? (
                    <Image source={{ uri: panImage }} style={styles.uploadPreview} />
                  ) : (
                    <>
                      <MaterialIcons name="cloud-upload" size={30} color={colors.primary} />
                      <Text style={styles.uploadText}>Tap to upload PAN card</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <Text style={styles.noteText}>
                  Your documents are secure and will only be used for verification.
                  Verified users get a trusted badge.
                </Text>
                
                <TouchableOpacity style={styles.submitDocsBtn} onPress={handleDocumentSubmit}>
                  <Text style={styles.submitDocsBtnText}>Submit for Verification</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressStepActive: {
    opacity: 1,
  },
  progressNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    textAlign: 'center',
    lineHeight: 30,
    color: colors.textMuted,
    marginBottom: 4,
  },
  progressNumberActive: {
    backgroundColor: colors.primary,
    color: '#FFF',
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  stepContent: {
    padding: 20,
    alignItems: 'center',
  },
  stepIcon: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  verifyPhoneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  verifyPhoneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  otpInput: {
    width: '80%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: colors.inputBg,
    color: colors.text,
    marginBottom: 8,
  },
  demoHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 20,
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    alignSelf: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },
  uploadBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
    minHeight: 120,
  },
  uploadPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  uploadText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  noteText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  submitDocsBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  submitDocsBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});