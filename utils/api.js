// utils/api.js — v2
// Central HTTP client with timeout, retry, 401 handling, and typed endpoints.
// All URLs come from config/env.js — no more hardcoded duplicates.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
// ---------- Auth ----------
const getToken = async () => {
  try {
    return await AsyncStorage.getItem('idToken');
  } catch {
    return null;
  }
};
// ---------- 401 handler (fire-and-forget) ----------
const _authExpiredListeners = new Set();
export const onAuthExpired = (cb) => {
  _authExpiredListeners.add(cb);
  return () => _authExpiredListeners.delete(cb);
};
const _emitAuthExpired = () => {
  _authExpiredListeners.forEach((cb) => {
    try { cb(); } catch (e) { console.error('[api] auth listener error', e); }
  });
};
// ---------- Core request helper ----------
async function request(path, options = {}, { base = ENV.API_BASE_URL, timeout = ENV.REQUEST_TIMEOUT_MS, retries = ENV.RETRY_ON_5XX } = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.status === 401) {
      _emitAuthExpired();
      throw new Error('Session expired. Please sign in again.');
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!response.ok && retries > 0) {
        return request(path, options, { base, timeout, retries: retries - 1 });
      }
      throw new Error(`Server error (${response.status}). Please try again.`);
    }
    const data = await response.json();
    if (!response.ok) {
      if (response.status >= 500 && retries > 0) {
        return request(path, options, { base, timeout, retries: retries - 1 });
      }
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      if (retries > 0) return request(path, options, { base, timeout, retries: retries - 1 });
      throw new Error('Request timed out. Please check your connection.');
    }
    if (retries > 0 && (err.message === 'Network request failed' || err.message?.includes('Network'))) {
      return request(path, options, { base, timeout, retries: retries - 1 });
    }
    if (__DEV__) console.warn(`[api] ${path} →`, err.message);
    throw err;
  }
}
// ---------- Upload helper (multipart, Render) ----------
async function uploadRequest(path, formData) {
  const token = await getToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(`${ENV.IMAGE_SERVER_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('Upload timed out.');
    throw err;
  }
}
// ==================== UPLOAD ====================
export const uploadAPI = {
  uploadImage: async (fileUri) => {
    const formData = new FormData();
    formData.append('file', { uri: fileUri, type: 'image/jpeg', name: `upload_${Date.now()}.jpg` });
    return uploadRequest('/api/upload/image', formData);
  },
  uploadImages: async (fileUris) => {
    const formData = new FormData();
    fileUris.forEach((uri, i) => {
      formData.append('files', { uri, type: 'image/jpeg', name: `upload_${i}_${Date.now()}.jpg` });
    });
    return uploadRequest('/api/upload/images', formData);
  },
  deleteImage: async (imageUrl) =>
    request('/api/images/delete', {
      method: 'DELETE',
      body: JSON.stringify({ url: imageUrl }),
    }, { base: ENV.IMAGE_SERVER_URL }),
};
// ==================== AUTH ====================
export const authAPI = {
  googleSignIn: (idToken, email, name, picture, googleId) =>
    request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, email, name, picture, googleId }),
    }),
  getMe: () => request('/api/auth/me'),
  getSession: () => request('/api/auth/session'),
  updateRole: (role) =>
    request('/api/auth/role', { method: 'PUT', body: JSON.stringify({ role }) }),
  updateProfile: (p) =>
    request('/api/auth/profile', { method: 'PUT', body: JSON.stringify(p) }),
  verifyAge: (age) =>
    request('/api/auth/verify-age', { method: 'POST', body: JSON.stringify({ age }) }),
};
// ==================== EQUIPMENT ====================
export const equipmentAPI = {
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/api/equipment${q ? `?${q}` : ''}`);
  },
  getById: (id) => request(`/api/equipment/${id}`),
  create: (data) => request('/api/equipment', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/equipment/${id}`, { method: 'DELETE' }),
  setListingType: (id, listingType, pricing) =>
    request(`/api/equipment/${id}/listing-type`, {
      method: 'PUT',
      body: JSON.stringify({ listingType, pricing }),
    }),
};
// ==================== PRODUCE ====================
export const produceAPI = {
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/api/produce${q ? `?${q}` : ''}`);
  },
  getById: (id) => request(`/api/produce/${id}`),
  create: (data) => request('/api/produce', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/produce/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/produce/${id}`, { method: 'DELETE' }),
};
// ==================== BOOKINGS ====================
export const bookingAPI = {
  getMyBookings: () => request('/api/bookings'),
  create: (data) => request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) =>
    request(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
};
// ==================== DASHBOARD ====================
export const dashboardAPI = {
  getStats: () => request('/api/dashboard/stats'),
};
// ==================== REPORTS ====================
export const reportAPI = {
  create: (data) => request('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
};
// ==================== USER ====================
export const userAPI = {
  deleteAccount: () => request('/api/users/delete-account', { method: 'DELETE' }),
};
// ==================== LABOURERS ====================
export const labourerAPI = {
  getNearby: (lat, lng, radius = 10, crop = null) => {
    const p = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
    if (crop && crop !== 'all' && crop !== '') p.append('crop', crop);
    return request(`/api/labourers/nearby?${p.toString()}`);
  },
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/api/labourers${q ? `?${q}` : ''}`);
  },
  getById: (id) => request(`/api/labourers/${id}`),
};
// ==================== CONTRACTORS ====================
export const contractorAPI = {
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/api/contractors${q ? `?${q}` : ''}`);
  },
  getById: (id) => request(`/api/contractors/${id}`),
};
// ==================== SOLUTIONS ====================
export const solutionsAPI = {
  getAllProblems: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/api/problems${q ? `?${q}` : ''}`);
  },
  getProblem: (id) => request(`/api/problems/${id}`),
  createProblem: (data) => request('/api/problems', { method: 'POST', body: JSON.stringify(data) }),
  updateProblem: (id, data) => request(`/api/problems/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProblem: (id) => request(`/api/problems/${id}`, { method: 'DELETE' }),
  addSolution: (problemId, data) =>
    request(`/api/problems/${problemId}/solutions`, { method: 'POST', body: JSON.stringify(data) }),
  updateSolution: (id, data) =>
    request(`/api/solutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSolution: (id) => request(`/api/solutions/${id}`, { method: 'DELETE' }),
  upvoteProblem: (id) => request(`/api/problems/${id}/upvote`, { method: 'POST' }),
  upvoteSolution: (id) => request(`/api/solutions/${id}/upvote`, { method: 'POST' }),
};
// ==================== FERTILIZER SHOPS ====================
export const fertilizerShopAPI = {
  getNearby: (lat, lng, radius = 10, search = '') => {
    const p = new URLSearchParams({
      lat: lat?.toString() || '',
      lng: lng?.toString() || '',
      radius: String(radius),
    });
    if (search) p.append('search', search);
    return request(`/api/fertilizer-shops/nearby?${p.toString()}`);
  },
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return request(`/api/fertilizer-shops${q ? `?${q}` : ''}`);
  },
  getById: (id) => request(`/api/fertilizer-shops/${id}`),
  create: (data) => request('/api/fertilizer-shops', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/fertilizer-shops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  rate: (id, rating) =>
    request(`/api/fertilizer-shops/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating }) }),
};
// ==================== ADS ====================
export const adsAPI = {
  getMyAds: () => request('/api/ads/my-ads'),
  getActive: (placement = 'all', limit = 5) => {
    const p = new URLSearchParams({ placement, limit: String(limit) });
    return request(`/api/ads/active?${p.toString()}`);
  },
  create: (data) => request('/api/ads', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id, status) =>
    request(`/api/ads/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  trackClick: (id) => request(`/api/ads/${id}/click`, { method: 'POST' }),
};
// ==================== PAYMENTS ====================
export const paymentAPI = {
  getUpiDetails: () => request('/api/payments/upi-details'),
  initiateUpiPayment: (adId, amount) =>
    request('/api/payments/upi', { method: 'POST', body: JSON.stringify({ adId, amount }) }),
  confirmPayment: (adId, utrNumber) =>
    request('/api/payments/confirm-payment', { method: 'POST', body: JSON.stringify({ adId, utrNumber }) }),
};
// ==================== WEATHER (external, no auth) ====================
export const weatherAPI = {
  getByCoords: async (lat, lng) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`
      );
      const data = await res.json();
      return {
        temperature: Math.round(data.current?.temperature_2m || 0),
        feelsLike: Math.round(data.current?.apparent_temperature || 0),
        humidity: data.current?.relative_humidity_2m || 0,
        windSpeed: data.current?.wind_speed_10m || 0,
        precipitation: data.current?.precipitation || 0,
        weatherCode: data.current?.weather_code || 0,
      };
    } catch {
      return null;
    }
  },
};
// ==================== DEFAULT EXPORT ====================
export default {
  authAPI, equipmentAPI, produceAPI, bookingAPI, dashboardAPI, reportAPI,
  userAPI, labourerAPI, contractorAPI, solutionsAPI, fertilizerShopAPI,
  adsAPI, paymentAPI, uploadAPI, weatherAPI,
};
