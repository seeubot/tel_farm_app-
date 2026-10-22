import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language translations
export const translations = {
  en: {
    // Common
    appName: 'AgriAgent',
    selectRole: 'Select your role',
    farmer: 'Farmer',
    labourer: 'Labourer',
    contractor: 'Contractor',
    settings: 'Settings',
    language: 'Language',
    telugu: 'తెలుగు',
    english: 'English',
    
    // Weather
    weather: 'Weather',
    humidity: 'Humidity',
    windSpeed: 'Wind Speed',
    rainfall: 'Rainfall',
    feelsLike: 'Feels like',
    
    // Equipment
    rentEquipment: 'Rent Equipment',
    equipment: 'Equipment',
    pricePerDay: 'per day',
    pricePerHour: 'per hour',
    deposit: 'Deposit',
    availability: 'Availability',
    available: 'Available',
    unavailable: 'Unavailable',
    
    // Labour
    findLabour: 'Find Labour',
    nearbyLabourers: 'Nearby Labourers',
    contact: 'Contact',
    verified: 'Verified',
    rating: 'Rating',
    jobsCompleted: 'jobs completed',
    
    // Actions
    search: 'Search',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    
    // Messages
    loading: 'Loading...',
    noData: 'No data found',
    error: 'Something went wrong',
    retry: 'Retry',
    
    // Home
    welcomeBack: 'Welcome back',
    quickActions: 'Quick Actions',
    myProfile: 'My Profile',
    
    // Demo Note
    demoMode: 'Demo Mode: Manual verification badge visible on verified profiles',
  },
  te: {
    // Common
    appName: 'అగ్రిఏజెంట్',
    selectRole: 'మీ పాత్రను ఎంచుకోండి',
    farmer: 'రైతు',
    labourer: 'కూలీ',
    contractor: 'కాంట్రాక్టర్',
    settings: 'సెట్టింగులు',
    language: 'భాష',
    telugu: 'తెలుగు',
    english: 'ఆంగ్లం',
    
    // Weather
    weather: 'వాతావరణం',
    humidity: 'తేమ',
    windSpeed: 'గాలి వేగం',
    rainfall: 'వర్షపాతం',
    feelsLike: 'అనిపిస్తుంది',
    
    // Equipment
    rentEquipment: 'పరికరాల అద్దె',
    equipment: 'పరికరాలు',
    pricePerDay: 'రోజుకు',
    pricePerHour: 'గంటకు',
    deposit: 'డిపాజిట్',
    availability: 'లభ్యత',
    available: 'అందుబాటులో',
    unavailable: 'అందుబాటులో లేదు',
    
    // Labour
    findLabour: 'కూలీలను కనుగొనండి',
    nearbyLabourers: 'సమీప కూలీలు',
    contact: 'సంప్రదించండి',
    verified: 'ధృవీకరించబడింది',
    rating: 'రేటింగ్',
    jobsCompleted: 'పూర్తి చేసిన ఉద్యోగాలు',
    
    // Actions
    search: 'వెతకండి',
    confirm: 'నిర్ధారించండి',
    cancel: 'రద్దు చేయండి',
    save: 'సేవ్ చేయండి',
    edit: 'సవరించు',
    delete: 'తొలగించు',
    back: 'వెనుకకు',
    next: 'తర్వాత',
    submit: 'సమర్పించండి',
    
    // Messages
    loading: 'లోడ్ అవుతోంది...',
    noData: 'డేటా లేదు',
    error: 'ఏదో తప్పు జరిగింది',
    retry: 'మళ్లీ ప్రయత్నించండి',
    
    // Home
    welcomeBack: 'తిరిగి స్వాగతం',
    quickActions: 'శీఘ్ర చర్యలు',
    myProfile: 'నా ప్రొఫైల్',
    
    // Demo Note
    demoMode: 'డెమో మోడ్: ధృవీకరించబడిన ప్రొఫైల్లలో మాన్యువల్ ధృవీకరణ బ్యాడ్జ్ కనిపిస్తుంది',
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    setLanguage(newLanguage);
    try {
      await AsyncStorage.setItem('appLanguage', newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key) => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}