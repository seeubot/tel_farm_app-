import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

// Conditionally import WebView with error handling
let WebViewComponent = null;
try {
  // For Expo
  const { WebView } = require('react-native-webview');
  WebViewComponent = WebView;
} catch (e) {
  console.warn('WebView not available:', e.message);
}

export default function LocationViewer({ visible, onClose, location, farmerName }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [webViewError, setWebViewError] = useState(false);
  const webViewRef = useRef(null);

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
      <meta charset="UTF-8">
      <title>Farm Location Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #map { height: 100vh; width: 100vw; position: absolute; top: 0; left: 0; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-bottom.leaflet-right { display: none !important; }
        .info-box {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 12px 16px;
          z-index: 1000;
          pointer-events: auto;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .info-title {
          color: white;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .info-address {
          color: #ccc;
          font-size: 11px;
        }
        .open-maps-btn {
          position: fixed;
          bottom: 120px;
          right: 20px;
          background: #2E7D32;
          border-radius: 40px;
          padding: 12px 20px;
          z-index: 1000;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          border: none;
        }
        .open-maps-btn span {
          color: white;
          font-size: 14px;
          font-weight: 500;
        }
        .open-maps-btn:active {
          transform: scale(0.97);
        }
        .loading {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          background: rgba(0,0,0,0.7);
          padding: 10px 20px;
          border-radius: 20px;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="info-box">
        <div class="info-title">📍 ${farmerName || 'Farm Location'}</div>
        <div class="info-address">${location?.address || 'Tap button below to open in maps'}</div>
      </div>
      <div class="open-maps-btn" onclick="openExternalMap()">
        <span>🗺️ Open in Maps</span>
      </div>
      <script>
        var map = L.map('map').setView([${location?.lat || 17.3850}, ${location?.lng || 78.4867}], 15);
        
        // Satellite view with error handling
        var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '',
          maxZoom: 19,
          errorTileUrl: ''
        }).addTo(map);
        
        // Fallback to street map if satellite fails
        satelliteLayer.on('tileerror', function() {
          L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '',
            maxZoom: 19
          }).addTo(map);
        });
        
        // Add marker
        var marker = L.marker([${location?.lat || 17.3850}, ${location?.lng || 78.4867}], {
          draggable: false
        }).addTo(map);
        
        marker.bindPopup('<b>${farmerName || 'Farm Location'}</b><br>📍 Farm Location').openPopup();
        
        function openExternalMap() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'openExternalMap',
            lat: ${location?.lat || 17.3850},
            lng: ${location?.lng || 78.4867}
          }));
        }
        
        // Hide loading after map loads
        window.onload = function() {
          setTimeout(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapLoaded'
            }));
          }, 1000);
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'openExternalMap') {
        const url = Platform.select({
          ios: `http://maps.apple.com/?ll=${data.lat},${data.lng}`,
          android: `http://maps.google.com/maps?q=${data.lat},${data.lng}`,
        });
        Linking.openURL(url).catch(() => {
          Alert.alert('Error', 'Could not open maps app. Please install Google Maps.');
        });
      } else if (data.type === 'mapLoaded') {
        setLoading(false);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  };

  const handleError = () => {
    setWebViewError(true);
    setLoading(false);
  };

  const openExternalMapsDirectly = () => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${location?.lat || 17.3850},${location?.lng || 78.4867}`,
      android: `http://maps.google.com/maps?q=${location?.lat || 17.3850},${location?.lng || 78.4867}`,
    });
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps app');
    });
  };

  const styles = getStyles(colors);

  // If WebView is not available, show fallback
  if (!WebViewComponent) {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.fallbackContainer}>
          <View style={styles.fallbackHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.fallbackTitle}>Farm Location</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.fallbackContent}>
            <MaterialIcons name="map" size={80} color={colors.primary} />
            <Text style={styles.fallbackText}>Farm Location</Text>
            <Text style={styles.fallbackAddress}>{location?.address || 'Farm location'}</Text>
            <Text style={styles.fallbackCoords}>
              Lat: {location?.lat?.toFixed(4) || '17.3850'}, Lng: {location?.lng?.toFixed(4) || '78.4867'}
            </Text>
            
            <TouchableOpacity 
              style={styles.fallbackMapButton}
              onPress={openExternalMapsDirectly}
            >
              <MaterialIcons name="directions" size={24} color="#FFF" />
              <Text style={styles.fallbackMapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {loading && !webViewError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
        
        {webViewError ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="map" size={60} color={colors.textMuted} />
            <Text style={styles.errorTitle}>Map failed to load</Text>
            <Text style={styles.errorText}>Please use the external maps option below</Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={openExternalMapsDirectly}
            >
              <Text style={styles.errorButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.errorCloseButton}
              onPress={onClose}
            >
              <Text style={styles.errorCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebViewComponent
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: leafletHTML }}
            onMessage={handleMessage}
            onError={handleError}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        )}
        
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    padding: 8,
    zIndex: 2000,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  errorCloseButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorCloseText: {
    color: colors.textMuted,
  },
  // Fallback styles (when WebView is not available)
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fallbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  fallbackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  fallbackAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  fallbackCoords: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    fontFamily: 'monospace',
  },
  fallbackMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 24,
    gap: 8,
  },
  fallbackMapButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});