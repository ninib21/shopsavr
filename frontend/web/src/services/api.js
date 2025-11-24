import axios from 'axios';
import { getStoredToken, removeAuthToken } from '../utils/auth';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  refreshToken: () => api.post('/auth/refresh'),
};

// Coupons API
export const couponsAPI = {
  search: (domain, params = {}) => api.get(`/coupons/search/${domain}`, { params }),
  getAll: (params = {}) => api.get('/coupons', { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  validate: (code, domain) => api.post('/coupons/validate', { code, domain }),
  apply: (data) => api.post('/coupons/apply', data),
  getStats: () => api.get('/coupons/stats'),
};

// Wishlist API
export const wishlistAPI = {
  getAll: (params = {}) => api.get('/wishlist', { params }),
  add: (productData) => api.post('/wishlist', productData),
  remove: (id) => api.delete(`/wishlist/${id}`),
  update: (id, data) => api.put(`/wishlist/${id}`, data),
  getPriceUpdates: () => api.get('/wishlist/price-updates'),
};

// Savings API
export const savingsAPI = {
  getSummary: () => api.get('/savings/summary'),
  getHistory: (params = {}) => api.get('/savings/history', { params }),
  getStats: () => api.get('/savings/stats'),
  apply: (data) => api.post('/savings/apply', data),
};

// Price Tracking API
export const priceTrackingAPI = {
  scan: (barcode) => api.post('/price/scan', { barcode }),
  compare: (productId) => api.get(`/price/compare/${productId}`),
  track: (productId) => api.post('/price/track', { productId }),
  getAlerts: () => api.get('/price/alerts'),
  updateAlert: (id, data) => api.put(`/price/alerts/${id}`, data),
  deleteAlert: (id) => api.delete(`/price/alerts/${id}`),
};

// Products API
export const productsAPI = {
  search: (query, params = {}) => api.get('/products/search', { params: { q: query, ...params } }),
  getById: (id) => api.get(`/products/${id}`),
  identify: (data) => api.post('/products/identify', data),
  getPriceHistory: (id) => api.get(`/products/${id}/price-history`),
};

// Subscription API
export const subscriptionAPI = {
  getPlans: () => api.get('/subscription/plans'),
  getCurrent: () => api.get('/subscription/current'),
  create: (data) => api.post('/subscription/create', data),
  update: (data) => api.put('/subscription/update', data),
  cancel: (data) => api.post('/subscription/cancel', data),
  getPaymentMethods: () => api.get('/subscription/payment-methods'),
  createSetupIntent: () => api.post('/subscription/setup-intent'),
  getBillingHistory: () => api.get('/subscription/billing-history'),
};

// Referral API
export const referralAPI = {
  getCode: () => api.get('/referral/code'),
  getStats: () => api.get('/referral/stats'),
  claim: (code) => api.post('/referral/claim', { code }),
  getHistory: () => api.get('/referral/history'),
};

// Analytics API
export const analyticsAPI = {
  track: (event, data) => api.post('/analytics/track', { event, data }),
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getUserStats: () => api.get('/analytics/user'),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (data) => api.put('/notifications/settings', data),
};

// Feedback API
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
  getTypes: () => api.get('/feedback/types'),
};

// Admin API (for admin users)
export const adminAPI = {
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getStats: () => api.get('/admin/stats'),
  getCoupons: (params = {}) => api.get('/admin/coupons', { params }),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  getSystemHealth: () => api.get('/admin/health'),
};

// Export the main api instance for custom requests
export default api;