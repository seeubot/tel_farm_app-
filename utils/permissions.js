import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

/**
 * Request Camera Permission
 * Returns: boolean (true if granted, false if denied)
 */
export const requestCameraPermission = async () => {
  if (Platform.OS === 'ios') {
    // iOS permissions are handled via info.plist
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Access Required',
        message: 'AgriAgent needs camera access to take photos of:\n\n• Profile pictures\n• Equipment for rent\n• Produce for marketplace\n• Farming problems',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Camera permission error:', err);
    return false;
  }
};

/**
 * Request Location Permission
 * Returns: boolean (true if granted, false if denied)
 */
export const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Access Required',
        message: 'AgriAgent needs location access to show you:\n\n• Nearby fertilizer shops\n• Local labourers and services\n• Equipment available in your area',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Location permission error:', err);
    return false;
  }
};

/**
 * Request Multiple Permissions at Once
 * Returns: object { cameraGranted, locationGranted }
 */
export const requestAllPermissions = async () => {
  if (Platform.OS === 'ios') {
    return { cameraGranted: true, locationGranted: true };
  }

  const permissions = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ];

  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    
    const cameraGranted = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
    const locationGranted = results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
    
    return { cameraGranted, locationGranted };
  } catch (err) {
    console.warn('Multiple permissions error:', err);
    return { cameraGranted: false, locationGranted: false };
  }
};

/**
 * Check Current Permission Status (without requesting)
 * Returns: object { camera, location }
 */
export const checkPermissions = async () => {
  if (Platform.OS === 'ios') {
    return { camera: true, location: true };
  }

  try {
    const camera = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    const location = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return { camera, location };
  } catch (err) {
    console.warn('Check permissions error:', err);
    return { camera: false, location: false };
  }
};

/**
 * Show Dialog to Guide User to Settings if Permission Permanently Denied
 */
export const showPermissionDeniedDialog = (permissionName, onRetry) => {
  Alert.alert(
    `${permissionName} Permission Denied`,
    `AgriAgent needs ${permissionName} access to provide full functionality. Please enable it in settings.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Retry', onPress: onRetry },
    ],
    { cancelable: false }
  );
};

/**
 * Check if Permission is Permanently Denied
 * Note: This requires checking if user checked "Never ask again"
 */
export const isPermissionPermanentlyDenied = async (permission) => {
  if (Platform.OS === 'ios') return false;
  
  try {
    // This is a workaround - actual permanent denial check varies by Android version
    const granted = await PermissionsAndroid.check(permission);
    return !granted;
  } catch {
    return false;
  }
};