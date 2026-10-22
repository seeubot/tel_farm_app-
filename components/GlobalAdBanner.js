import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import AdBanner from './AdBanner';

export default function GlobalAdBanner({ navigation }) {
  const [expanded, setExpanded] = useState(true);
  const [heightAnim] = useState(new Animated.Value(100));

  const toggleExpand = () => {
    if (expanded) {
      Animated.timing(heightAnim, {
        toValue: 40,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(heightAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
    setExpanded(!expanded);
  };

  return (
    <Animated.View style={[styles.container, { height: heightAnim }]}>
      {expanded ? (
        <>
          <AdBanner placement="global" navigation={navigation} />
          <TouchableOpacity style={styles.collapseButton} onPress={toggleExpand}>
            <Text style={styles.collapseText}>−</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.collapsedView} onPress={toggleExpand}>
          <Text style={styles.collapsedText}>📢 Tap to see ad</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  collapseButton: {
    position: 'absolute',
    top: 5,
    right: 10,
    zIndex: 1001,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  collapsedView: {
    flex: 1,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});