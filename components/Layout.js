import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '../utils/theme';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 44;

export default function Layout({ 
  children, 
  refreshControl,
  scrollable = true,
}) {
  const { colors, isDarkTheme } = useTheme();

  const ContentWrapper = scrollable ? ScrollView : View;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      <ContentWrapper
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {children}
      </ContentWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
});