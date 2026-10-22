import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StatusBar, Image } from 'react-native';
import { useTheme } from '../utils/theme';

const CustomSplashScreen = ({ onFinish }) => {
  const { colors } = useTheme();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Show splash for 2.5 seconds then fade out
    Animated.sequence([
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) {
        onFinish();
      }
    });
  }, []);

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary || '#2E7D32'} />
      
      <Image 
        source={require('../assets/sp.png')}
        style={styles.fullScreenImage}
        resizeMode="cover"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default CustomSplashScreen;