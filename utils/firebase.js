import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithCredential,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

const firebaseConfig = {
  apiKey: "AIzaSyDoGCjC59lHRAHAj23tAxQON7sSaLxGTdo",
  authDomain: "agri-maya.firebaseapp.com",
  projectId: "agri-maya",
  storageBucket: "agri-maya.firebasestorage.app",
  messagingSenderId: "517509900822",
  appId: "1:517509900822:android:23ce7b21ed0e640c14e337",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const signInWithGoogle = async () => {
  try {
    // Get the redirect URL
    const redirectUrl = Linking.createURL('auth');
    console.log('Generated redirect URL:', redirectUrl);

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=517509900822-mp211egrtncurmkhkb6itf718grgns9l.apps.googleusercontent.com` +
      `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
      `&response_type=id_token` +
      `&scope=profile%20email` +
      `&nonce=${Math.random().toString(36).substring(7)}` +
      `&prompt=select_account`;

    console.log('Full auth URL:', authUrl);

    // ✅ Try-catch specifically for the browser call
    let result;
    try {
      // First try without redirectUri
      result = await WebBrowser.openAuthSessionAsync(authUrl);
    } catch (browserError) {
      console.error('Browser error:', browserError);
      
      // Fallback: try with redirectUri
      try {
        result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      } catch (secondError) {
        console.error('Second browser error:', secondError);
        return { success: false, error: 'Cannot open browser' };
      }
    }

    console.log('Result:', JSON.stringify(result));

    if (result.type === 'success' && result.url) {
      // Parse the URL for id_token
      const urlString = result.url;
      let id_token = null;
      
      // Try to get from hash fragment
      if (urlString.includes('#')) {
        const fragment = urlString.split('#')[1];
        const params = new URLSearchParams(fragment);
        id_token = params.get('id_token');
      }
      
      // Try to get from query params
      if (!id_token && urlString.includes('?')) {
        const queryString = urlString.split('?')[1];
        const params = new URLSearchParams(queryString);
        id_token = params.get('id_token');
      }

      console.log('ID Token found:', !!id_token);

      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const firebaseToken = await userCredential.user.getIdToken();
        
        return { 
          success: true, 
          user: userCredential.user,
          idToken: firebaseToken
        };
      } else {
        return { success: false, error: 'No ID token received' };
      }
    }
    
    return { success: false, error: result.type === 'cancel' ? 'Sign in cancelled' : 'Unknown error' };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return { success: false, error: error.message };
  }
};

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('idToken');
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export { auth };