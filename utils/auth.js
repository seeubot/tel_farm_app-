import AsyncStorage from '@react-native-async-storage/async-storage';

let _cachedAuthData = null;
const AUTH_KEY = 'authData';

const invalidateCache = () => {
  _cachedAuthData = null;
};

export const storeUserData = async (userData, token, googleUserInfo = null) => {
  try {
    const completeUserData = {
      _id: userData._id || userData.id || 'demo_' + Date.now(),
      id: userData._id || userData.id || 'demo_' + Date.now(),
      email: userData.email || googleUserInfo?.email || 'demo@agriagent.com',
      role: userData.role || 'farmer',
      roles: userData.roles || ['farmer'],        // ✅ ADDED: All roles array
      name: googleUserInfo?.name || userData.name || '',
      profile: {
        name: googleUserInfo?.name || userData.name || userData.profile?.name || 'User',
        email: userData.email || googleUserInfo?.email || '',
        profileImage: googleUserInfo?.picture || userData.profile?.profileImage || '',
        phone: userData.phone || userData.profile?.phone || '',
        teluguName: userData.teluguName || userData.profile?.teluguName || '',
        location: userData.profile?.location || userData.location || null,
      },
      verification: userData.verification || { isVerified: false },
      googleInfo: googleUserInfo,
      labourerDetails: userData.labourerDetails || null,
      contractorDetails: userData.contractorDetails || null,
      createdAt: userData.createdAt || new Date().toISOString(),
    };

    const authData = {
      user: completeUserData,
      token: token || null,
      isLoggedIn: true,
    };

    // Save to multiple keys for compatibility
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));
    await AsyncStorage.setItem('user', JSON.stringify(completeUserData));
    await AsyncStorage.setItem('idToken', token);
    
    invalidateCache();
    console.log('✅ [AUTH] User saved. Role:', completeUserData.role, 'Roles:', completeUserData.roles);
    return true;
  } catch (error) {
    console.error('Error storing user data:', error);
    return false;
  }
};

export const getUserData = async (forceRefresh = false) => {
  try {
    if (_cachedAuthData && !forceRefresh) {
      return _cachedAuthData;
    }

    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.user && parsed?.isLoggedIn === true) {
      _cachedAuthData = parsed;
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const getUserName = async () => {
  try {
    const data = await getUserData();
    return data?.user?.profile?.name || data?.user?.googleInfo?.name || data?.user?.name || 'User';
  } catch {
    return 'User';
  }
};

export const getUserFirstName = async () => {
  try {
    const data = await getUserData();
    const fullName = data?.user?.profile?.name || data?.user?.googleInfo?.name || data?.user?.name || '';
    return fullName.split(' ')[0] || 'User';
  } catch {
    return 'User';
  }
};

export const getUserEmail = async () => {
  try {
    const data = await getUserData();
    return data?.user?.email || data?.user?.profile?.email || data?.user?.googleInfo?.email || '';
  } catch {
    return '';
  }
};

export const getUserProfileImage = async () => {
  try {
    const data = await getUserData();
    return data?.user?.profile?.profileImage || data?.user?.googleInfo?.picture || '';
  } catch {
    return '';
  }
};

export const getUserPhone = async () => {
  try {
    const data = await getUserData();
    return data?.user?.profile?.phone || '';
  } catch {
    return '';
  }
};

export const getUserRole = async () => {
  try {
    const data = await getUserData();
    return data?.user?.role || null;
  } catch {
    return null;
  }
};

export const getUserRoles = async () => {
  try {
    const data = await getUserData();
    return data?.user?.roles || [data?.user?.role || 'farmer'];
  } catch {
    return ['farmer'];
  }
};

export const getAuthToken = async () => {
  try {
    const data = await getUserData();
    return data?.token || null;
  } catch {
    return null;
  }
};

export const getUserId = async () => {
  try {
    const data = await getUserData();
    return data?.user?._id || data?.user?.id || null;
  } catch {
    return null;
  }
};

export const getUserTeluguName = async () => {
  try {
    const data = await getUserData();
    return data?.user?.profile?.teluguName || '';
  } catch {
    return '';
  }
};

export const isUserVerified = async () => {
  try {
    const data = await getUserData();
    return data?.user?.verification?.isVerified || false;
  } catch {
    return false;
  }
};

export const getUserProfile = async () => {
  try {
    const data = await getUserData();
    const user = data?.user || {};
    return {
      id: user._id || user.id || null,
      name: user.profile?.name || user.googleInfo?.name || user.name || 'User',
      firstName: (user.profile?.name || user.name || '').split(' ')[0] || 'User',
      email: user.email || user.profile?.email || '',
      profileImage: user.profile?.profileImage || user.googleInfo?.picture || '',
      phone: user.profile?.phone || '',
      teluguName: user.profile?.teluguName || '',
      role: user.role || null,
      roles: user.roles || [],
      isVerified: user.verification?.isVerified || false,
      token: data?.token || null,
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return {
      id: null, name: 'User', firstName: 'User', email: '',
      profileImage: '', phone: '', teluguName: '',
      role: null, roles: [], isVerified: false, token: null,
    };
  }
};

export const updateLocalUserProfile = async (updatedData) => {
  try {
    const data = await getUserData(true);
    if (data?.user) {
      const updatedUser = {
        ...data.user,
        ...updatedData,
        roles: updatedData.roles || data.user.roles || ['farmer'],  // ✅ Preserve roles
        profile: {
          ...data.user.profile,
          ...(updatedData.profile || {}),
          name: updatedData.name || updatedData.profile?.name || data.user.profile?.name,
          phone: updatedData.phone || updatedData.profile?.phone || data.user.profile?.phone,
          teluguName: updatedData.teluguName || updatedData.profile?.teluguName || data.user.profile?.teluguName,
        },
        labourerDetails: updatedData.labourerDetails || data.user.labourerDetails,
        contractorDetails: updatedData.contractorDetails || data.user.contractorDetails,
      };

      const authData = {
        user: updatedUser,
        token: data.token || null,
        isLoggedIn: true,
      };

      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      invalidateCache();
      return updatedUser;
    }
    return null;
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
};

export const updateUserRole = async (role) => {
  try {
    const data = await getUserData(true);
    if (data?.user) {
      const currentRoles = data.user.roles || ['farmer'];
      if (!currentRoles.includes(role)) {
        currentRoles.push(role);
      }
      
      const updatedUser = { 
        ...data.user, 
        role: role,
        roles: currentRoles  // ✅ Update roles array
      };
      
      const authData = {
        user: updatedUser,
        token: data.token || null,
        isLoggedIn: true,
      };

      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      invalidateCache();
      console.log('✅ [AUTH] Role updated to:', role, 'Roles:', currentRoles);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating role:', error);
    return false;
  }
};

export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove([
      AUTH_KEY,
      'user',
      'idToken',
      'userId',
      'userEmail',
      'userRole',
    ]);
    invalidateCache();
    console.log('✅ [AUTH] All user data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing user data:', error);
    return false;
  }
};

export const isUserLoggedIn = async () => {
  try {
    const data = await getUserData();
    return data?.isLoggedIn === true;
  } catch {
    return false;
  }
};

export default {
  storeUserData,
  getUserData,
  getUserName,
  getUserFirstName,
  getUserEmail,
  getUserProfileImage,
  getUserPhone,
  getUserRole,
  getUserRoles,
  getAuthToken,
  getUserId,
  getUserTeluguName,
  isUserVerified,
  getUserProfile,
  updateLocalUserProfile,
  updateUserRole,
  clearUserData,
  isUserLoggedIn,
};