import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../utils/theme';

export default function MapPointSelector({ visible, onClose, onPointsSelected, isDarkTheme }) {
  const { colors } = useTheme();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [pointCount, setPointCount] = useState(0);

  // Synchronize theme mapping and colors dynamically
  const tileLayerUrl = isDarkTheme
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const primaryColor = '#2E7D32';
  const primaryFill = '#4CAF50';

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { height: 100%; width: 100vw; background-color: ${isDarkTheme ? '#121212' : '#F5F5F5'}; }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-bar { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important; }
        .leaflet-bar a { background-color: ${isDarkTheme ? '#1E1E1E' : '#FFFFFF'} !important; color: ${isDarkTheme ? '#FFFFFF' : '#000000'} !important; border-bottom: 1px solid ${isDarkTheme ? '#333' : '#E0E0E0'} !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([17.3850, 78.4867], 15);
        
        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('${tileLayerUrl}', { maxZoom: 19 }).addTo(map);
        
        var markers = [];
        var points = [];
        var polygon = null;
        
        function drawPolygon() {
          if (polygon) { map.removeLayer(polygon); }
          if (points.length >= 3) {
            polygon = L.polygon(points, {
              color: '${primaryColor}',
              weight: 3,
              fillColor: '${primaryFill}',
              fillOpacity: 0.25
            }).addTo(map);
          }
        }
        
        map.on('click', function(e) {
          var marker = L.marker(e.latlng, { draggable: true }).addTo(map);
          markers.push(marker);
          points.push([e.latlng.lat, e.latlng.lng]);
          
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'updateCount', count: points.length }));
          drawPolygon();
          
          marker.on('dragend', function() {
            var newPos = marker.getLatLng();
            var index = markers.indexOf(marker);
            points[index] = [newPos.lat, newPos.lng];
            drawPolygon();
          });
        });
        
        window.addEventListener('message', function(event) {
          var message = JSON.parse(event.data);
          if (message.type === 'clear') {
            markers.forEach(function(m) { map.removeLayer(m); });
            markers = [];
            points = [];
            if (polygon) { map.removeLayer(polygon); polygon = null; }
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'updateCount', count: 0 }));
          } else if (message.type === 'requestConfirm') {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'confirmData', points: points }));
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'updateCount') {
        setPointCount(data.count);
      } else if (data.type === 'confirmData') {
        if (data.points.length >= 3) {
          const formattedPoints = data.points.map(point => ({
            lat: point[0],
            lng: point[1],
          }));
          onPointsSelected(formattedPoints);
          onClose();
        } else {
          Alert.alert('Required Action', 'Please tap at least 3 points on the map to define the layout boundaries.');
        }
      }
    } catch (e) {
      console.warn("Message parsing error: ", e);
    }
  };

  const triggerWebClear = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'clear' }));
  };

  const triggerWebConfirm = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'requestConfirm' }));
  };

  const styles = getStyles(colors, isDarkTheme);

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={styles.loadingText}>Configuring Live Map Canvas...</Text>
          </View>
        )}

        {/* Global Floating Notification Indicator */}
        <View style={styles.instructionFloatingCard}>
          <MaterialIcons name="touch-app" size={16} color="#FFF" />
          <Text style={styles.instructionText}>Tap map corners to build boundary layout</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
          <MaterialIcons name="close" size={22} color={isDarkTheme ? colors.text : '#000'} />
        </TouchableOpacity>

        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
        />

        {/* Dynamic Action Overlay Box */}
        <SafeAreaView style={styles.bottomControlTray}>
          <View style={styles.actionCardWrapper}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: pointCount >= 3 ? primaryColor : '#FF9800' }]} />
                <Text style={styles.statusBadgeText}>Boundary Graph</Text>
              </View>
              <Text style={styles.counterText}>{pointCount} Points Connected</Text>
            </View>

            <View style={styles.buttonActionGrid}>
              <TouchableOpacity 
                style={[styles.trayButton, styles.clearBtn, { borderColor: colors.border }]} 
                onPress={triggerWebClear}
                activeOpacity={0.7}
              >
                <MaterialIcons name="layers-clear" size={18} color={isDarkTheme ? '#FF6B6B' : '#D32F2F'} />
                <Text style={[styles.clearBtnText, { color: isDarkTheme ? '#FF6B6B' : '#D32F2F' }]}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.trayButton, styles.confirmBtn, { backgroundColor: primaryColor }]} 
                onPress={triggerWebConfirm}
                activeOpacity={0.8}
              >
                <MaterialIcons name="analytics" size={18} color="#FFF" />
                <Text style={styles.confirmBtnText}>Confirm Metrics</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const getStyles = (colors, isDarkTheme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: isDarkTheme ? '#121212' : '#F5F5F5' 
  },
  webview: { 
    flex: 1 
  },
  loadingContainer: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: isDarkTheme ? '#121212' : '#F5F5F5', 
    zIndex: 1000 
  },
  loadingText: { 
    color: isDarkTheme ? '#AAA' : '#555', 
    marginTop: 12, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  closeButton: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? 54 : 30, 
    left: 16, 
    backgroundColor: isDarkTheme ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)', 
    borderRadius: 12, 
    padding: 10, 
    zIndex: 2000,
    borderWidth: 1,
    borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
      android: { elevation: 4 }
    })
  },
  instructionFloatingCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 36,
    left: 76,
    right: 16,
    backgroundColor: 'rgba(20,20,20,0.85)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    zIndex: 1900,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bottomControlTray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
  },
  actionCardWrapper: {
    backgroundColor: isDarkTheme ? '#1E1E1E' : '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 8 }
    })
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDarkTheme ? '#AAA' : '#666',
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
    color: isDarkTheme ? '#FFF' : '#111',
  },
  buttonActionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  trayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  clearBtn: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    ...Platform.select({
      ios: { shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
      android: { elevation: 3 }
    })
  },
  confirmBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});