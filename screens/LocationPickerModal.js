import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function LocationPickerModal({ visible, onClose, onLocationSelect }) {
  const [gettingLocation, setGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Common locations in Telangana/AP for demo
  const popularLocations = [
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Warangal', lat: 17.9689, lng: 79.5941 },
    { name: 'Karimnagar', lat: 18.4386, lng: 79.1288 },
    { name: 'Nizamabad', lat: 18.6730, lng: 78.0998 },
    { name: 'Khammam', lat: 17.2473, lng: 80.1514 },
    { name: 'Guntur', lat: 16.3067, lng: 80.4365 },
    { name: 'Vijayawada', lat: 16.5062, lng: 80.6480 },
    { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
    { name: 'Tirupati', lat: 13.6288, lng: 79.4192 },
    { name: 'Kurnool', lat: 15.8281, lng: 78.0373 },
    { name: 'Anantapur', lat: 14.6819, lng: 77.6006 },
    { name: 'Kadapa', lat: 14.4673, lng: 78.8242 },
  ];

  const getDeviceLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services to use this feature.');
        setGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      // Reverse geocode to get location name
      let reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      let locationString = reverseGeocode[0]?.city || reverseGeocode[0]?.region || 'Your Location';
      
      setSelectedLocation({ lat: latitude, lng: longitude, name: locationString });
      setLocationName(locationString);
      
      Alert.alert('Location Found', `${locationString}\nLat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Unable to get your location. Please check GPS settings.');
    } finally {
      setGettingLocation(false);
    }
  };

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Filter from popular locations
      const results = popularLocations.filter(loc => 
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
      
      // Also try to geocode using expo-location
      if (results.length === 0) {
        let geocode = await Location.geocodeAsync(query);
        if (geocode.length > 0) {
          setSearchResults([{ name: query, lat: geocode[0].latitude, lng: geocode[0].longitude }]);
        } else {
          setSearchResults([]);
        }
      } else {
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectLocation = (location) => {
    setSelectedLocation({ lat: location.lat, lng: location.lng, name: location.name });
    setLocationName(location.name);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        name: locationName || selectedLocation.name || 'Selected Location',
      });
      onClose();
    } else {
      Alert.alert('No Location Selected', 'Please select a location from the list or use GPS.');
    }
  };

  const styles = getStyles();

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Farm Location</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* GPS Button */}
          <TouchableOpacity style={styles.gpsButton} onPress={getDeviceLocation}>
            {gettingLocation ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : (
              <>
                <MaterialIcons name="my-location" size={24} color="#2E7D32" />
                <Text style={styles.gpsButtonText}>Use My Current Location</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Search Input */}
          <View style={styles.searchSection}>
            <Text style={styles.sectionLabel}>Or Search by Village/Town</Text>
            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search village, town, or city..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchLocation(text);
                }}
              />
              {searching && <ActivityIndicator size="small" color="#2E7D32" />}
            </View>
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => selectLocation(result)}
                >
                  <MaterialIcons name="location-on" size={20} color="#2E7D32" />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{result.name}</Text>
                    <Text style={styles.resultCoords}>
                      {result.lat.toFixed(4)}, {result.lng.toFixed(4)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Locations */}
          <Text style={styles.sectionLabel}>Popular Locations</Text>
          <View style={styles.popularGrid}>
            {popularLocations.slice(0, 6).map((location, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.popularItem,
                  selectedLocation?.name === location.name && styles.popularItemActive
                ]}
                onPress={() => selectLocation(location)}
              >
                <MaterialIcons 
                  name="place" 
                  size={20} 
                  color={selectedLocation?.name === location.name ? "#2E7D32" : "#666"} 
                />
                <Text style={[
                  styles.popularName,
                  selectedLocation?.name === location.name && styles.popularNameActive
                ]}>
                  {location.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected Location Display */}
          {selectedLocation && (
            <View style={styles.selectedBox}>
              <MaterialIcons name="check-circle" size={24} color="#2E7D32" />
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedTitle}>Selected Location</Text>
                <Text style={styles.selectedName}>{locationName || selectedLocation.name}</Text>
                <Text style={styles.selectedCoords}>
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </Text>
              </View>
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity 
            style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const getStyles = () => ({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E7D32',
    marginBottom: 24,
  },
  gpsButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E7D32',
    marginLeft: 10,
  },
  searchSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  resultsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resultsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultInfo: {
    marginLeft: 12,
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  resultCoords: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  popularItemActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  popularName: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  popularNameActive: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedTitle: {
    fontSize: 12,
    color: '#666',
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 2,
  },
  selectedCoords: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpace: {
    height: 30,
  },
});