import React, { useRef, useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './utils/queryClient';
import { onAuthExpired } from './utils/api';
import { clearUserData } from './utils/auth';
import { ThemeProvider, useTheme } from './utils/theme';
import { LanguageProvider } from './utils/i18n';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import CustomSplashScreen from './components/CustomSplashScreen';

// Auth & Role Screens
import LoginScreen from './screens/LoginScreen';
import LanguageSelectionScreen from './screens/LanguageSelectionScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';

// Main Screens
import HomeScreen from './screens/HomeScreen';
import WeatherScreen from './screens/WeatherScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import MyActivityScreen from './screens/MyActivity';

// Farmer Module
import FarmerDashboard from './screens/FarmerDashboard/index';

// Labour & Contractor Modules
import LabourerDashboardScreen from './screens/LabourerDashboardScreen';
import ContractorDashboardScreen from './screens/ContractorDashboardScreen';

// Equipment Rental Module
import EquipmentRentalScreen from './screens/EquipmentRentalScreen';
import PostRentalScreen from './screens/EquipmentRental/PostRentalScreen';
import EquipmentDetailScreen from './screens/EquipmentRental/EquipmentDetailScreen';

// Buyer Marketplace Module
import BuyerMarketplaceScreen from './screens/BuyerMarketplace/BuyerMarketplaceScreen';
import ProductDetailScreen from './screens/BuyerMarketplace/ProductDetailScreen';
import FarmerListingScreen from './screens/BuyerMarketplace/FarmerListingScreen';

// Revenue Calculator
import RevenueCalculatorScreen from './screens/RevenueCalculator/RevenueCalculatorScreen';

// Land Area Calculator
import LandAreaCalculatorScreen from './screens/LandAreaCalculator/LandAreaCalculatorScreen';

// Solutions Module
import SolutionsScreen from './screens/Solutions/SolutionsScreen';
import ProblemDetailScreen from './screens/Solutions/ProblemDetailScreen';
import AddProblemScreen from './screens/Solutions/AddProblemScreen';
import AddSolutionScreen from './screens/Solutions/AddSolutionScreen';

// Fertilizer Shops
import FertilizerShopsScreen from './screens/FertilizerShopsScreen';

// Promotions & Ads
import PromotionsScreen from './screens/PromotionsScreen';
import CreateAdScreen from './screens/Ads/CreateAdScreen';
import MyAdsScreen from './screens/Ads/MyAdsScreen';

// Legal Pages
import PrivacyPolicyScreen from './screens/Legal/PrivacyPolicyScreen';
import TermsScreen from './screens/Legal/TermsScreen';
import AboutScreen from './screens/Legal/AboutScreen';

const Stack = createNativeStackNavigator();

// ==================== DEEP LINK HANDLER ====================
const handleDeepLink = (url) => {
  if (!url) return;

  console.log('[DEEP LINK] Received:', url);

  if (url.includes('agriagent://auth')) {
    try {
      const paramsStr = url.split('?')[1];
      if (!paramsStr) return;

      const params = new URLSearchParams(paramsStr);

      const token = params.get('token');
      const userId = params.get('userId');
      const email = params.get('email');
      const role = params.get('role');

      console.log('[DEEP LINK] Token:', token?.substring(0, 30) + '...');

      if (token) {
        AsyncStorage.setItem('userToken', token);
        console.log('[DEEP LINK] Token saved');
      }

      if (userId) AsyncStorage.setItem('userId', userId);
      if (email) AsyncStorage.setItem('userEmail', email);
      if (role) AsyncStorage.setItem('userRole', role);
    } catch (error) {
      console.error('[DEEP LINK] Error:', error);
    }
  }
};

function AppNavigator() {
  const { colors, isDarkTheme } = useTheme();
  const navigationRef = useRef();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // ==================== NAVIGATION STATE TRACKER ====================
  const onStateChange = (state) => {
    if (state) {
      const routes = state.routes.map(r => r.name);
      const current = state.routes[state.index]?.name;
      console.log('[NAV] Screen:', current);
      console.log('[NAV] Stack:', routes.join(' -> '));
    }
  };

  // ==================== HIDE NAVIGATION BAR GLOBALLY ====================
  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setBackgroundColorAsync(colors.background || '#FFFFFF');
          await NavigationBar.setButtonStyleAsync(isDarkTheme ? 'light' : 'dark');
          
          console.log('Navigation bar hidden globally');
        } catch (error) {
          console.error('Error hiding navigation bar:', error);
        }
      }
    };

    hideNavigationBar();

    return () => {
      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible');
      }
    };
  }, [colors.background, isDarkTheme]);

  // ==================== INITIALIZE APP ====================
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('=======================================');
        console.log('[APP] Starting AgriAgent...');
        console.log('=======================================');

        const allKeys = await AsyncStorage.getAllKeys();
        const items = await AsyncStorage.multiGet(allKeys);
        console.log('[APP] AsyncStorage contents:');
        items.forEach(([key, value]) => {
          if (key === 'user') {
            try {
              const user = JSON.parse(value);
              console.log(`  user.role: ${user.role}`);
              console.log(`  user.roles: ${JSON.stringify(user.roles)}`);
            } catch (e) {
              console.log(`  user: ${value?.substring(0, 100)}`);
            }
          } else if (key === 'userToken' || key === 'idToken') {
            console.log(`  ${key}: ${value?.substring(0, 30)}...`);
          } else if (key === 'authData') {
            console.log(`  authData: ${value?.substring(0, 100)}`);
          } else {
            console.log(`  ${key}: ${value?.substring(0, 50)}`);
          }
        });
        console.log('=======================================');

        // removed artificial 500ms delay — see PR 1
        
      } catch (error) {
        console.error('[APP] Init error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initApp();
  }, []);

  // ==================== 401 GLOBAL HANDLER ====================
  useEffect(() => {
    const unsub = onAuthExpired(async () => {
      console.log('[APP] Auth expired — clearing and returning to Login');
      await clearUserData();
      queryClient.clear();
      if (navigationRef.current) {
        navigationRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    });
    return unsub;
  }, []);
  // ==================== DEEP LINK LISTENER ====================
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event?.url);
    });

    Linking.getInitialURL().then(url => {
      handleDeepLink(url);
    });

    return () => {
      if (subscription?.remove) subscription.remove();
    };
  }, []);

  // ==================== SPLASH SCREEN ====================
  if (showSplash) {
    return <CustomSplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // ==================== LOADING SCREEN ====================
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ==================== NAVIGATOR ====================
  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={onStateChange}
      theme={{
        dark: isDarkTheme,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
        initialRouteName="Login"
      >
        {/* Auth Flow */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

        {/* Main Screens */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="MyActivity" component={MyActivityScreen} />

        {/* Farmer Module */}
        <Stack.Screen name="FarmerDashboard" component={FarmerDashboard} />

        {/* Labour & Contractor */}
        <Stack.Screen name="LabourerDashboard" component={LabourerDashboardScreen} />
        <Stack.Screen name="ContractorDashboard" component={ContractorDashboardScreen} />

        {/* Equipment Rental */}
        <Stack.Screen name="EquipmentRental" component={EquipmentRentalScreen} />
        <Stack.Screen name="PostRental" component={PostRentalScreen} />
        <Stack.Screen name="EquipmentDetail" component={EquipmentDetailScreen} />

        {/* Buyer Marketplace */}
        <Stack.Screen name="BuyerMarketplace" component={BuyerMarketplaceScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="FarmerListing" component={FarmerListingScreen} />

        {/* Revenue Calculator */}
        <Stack.Screen name="RevenueCalculator" component={RevenueCalculatorScreen} />

        {/* Land Area Calculator */}
        <Stack.Screen name="LandAreaCalculator" component={LandAreaCalculatorScreen} />

        {/* Solutions */}
        <Stack.Screen name="Solutions" component={SolutionsScreen} />
        <Stack.Screen name="WeatherScreen" component={WeatherScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProblemDetail" component={ProblemDetailScreen} />
        <Stack.Screen name="AddProblem" component={AddProblemScreen} />
        <Stack.Screen name="AddSolution" component={AddSolutionScreen} />

        {/* Fertilizer Shops */}
        <Stack.Screen name="FertilizerShops" component={FertilizerShopsScreen} />

        {/* Promotions & Ads */}
        <Stack.Screen name="Promotions" component={PromotionsScreen} />
        <Stack.Screen name="CreateAd" component={CreateAdScreen} />
        <Stack.Screen name="MyAds" component={MyAdsScreen} />

        {/* Legal */}
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppNavigator />
          </LanguageProvider>
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}