import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Video from 'react-native-video';
import { MaterialIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function VideoPlayer({ videoUrl, visible, onClose }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handlePlayPause = () => {
    setPaused(!paused);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={28} color="white" />
        </TouchableOpacity>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}
          
          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={50} color="#F44336" />
              <Text style={styles.errorText}>Failed to load video</Text>
              <Text style={styles.errorSubtext}>Please try again later</Text>
            </View>
          )}

          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            paused={paused}
            repeat={false}
            resizeMode="contain"
            onLoadStart={handleLoadStart}
            onLoad={handleLoad}
            onError={handleError}
            controls={true}
            ignoreSilentSwitch="ignore"
          />
        </View>

        {/* Play/Pause Button Overlay */}
        {!loading && !error && (
          <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
            <MaterialIcons 
              name={paused ? "play-arrow" : "pause"} 
              size={50} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  errorSubtext: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  playPauseButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    padding: 12,
  },
});