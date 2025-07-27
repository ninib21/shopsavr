// Authentication utility functions

const TOKEN_KEY = 'shopsavr_token';
const USER_KEY = 'shopsavr_user';

// Token management
export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// User data management
export const getStoredUser = () => {
  try {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting stored user:', error);
    return null;
  }
};

export const setStoredUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

// Token validation
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getStoredToken();
  return token && !isTokenExpired(token);
};

// Get user role from token
export const getUserRole = (token = null) => {
  const authToken = token || getStoredToken();
  
  if (!authToken) return null;
  
  try {
    const payload = JSON.parse(atob(authToken.split('.')[1]));
    return payload.role || 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Check if user has specific permission
export const hasPermission = (permission, userRole = null) => {
  const role = userRole || getUserRole();
  
  const permissions = {
    admin: ['*'], // Admin has all permissions
    pro: ['view_analytics', 'unlimited_wishlist', 'priority_support'],
    user: ['basic_features']
  };
  
  if (!role || !permissions[role]) return false;
  
  return permissions[role].includes('*') || permissions[role].includes(permission);
};

// Format user display name
export const formatUserName = (user) => {
  if (!user) return 'User';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.firstName) {
    return user.firstName;
  }
  
  if (user.name) {
    return user.name;
  }
  
  return user.email?.split('@')[0] || 'User';
};

// Get user initials for avatar
export const getUserInitials = (user) => {
  if (!user) return 'U';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  
  if (user.firstName) {
    return user.firstName[0].toUpperCase();
  }
  
  if (user.name) {
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
  
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  
  return 'U';
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength score
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length bonus
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety bonus
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  // Complexity bonus
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) score += 1;
  if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(password)) score += 1;
  
  if (score <= 3) return 'weak';
  if (score <= 6) return 'medium';
  return 'strong';
};

// Generate secure random password
export const generateSecurePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Session management
export const extendSession = () => {
  const token = getStoredToken();
  if (token && !isTokenExpired(token)) {
    // Refresh the token timestamp in localStorage
    setAuthToken(token);
    return true;
  }
  return false;
};

// Clear all auth data
export const clearAuthData = () => {
  removeAuthToken();
  // Clear any other auth-related data
  try {
    localStorage.removeItem('shopsavr_preferences');
    localStorage.removeItem('shopsavr_cache');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

// Auto-logout on token expiration
export const setupAutoLogout = (callback) => {
  const checkTokenExpiration = () => {
    const token = getStoredToken();
    if (token && isTokenExpired(token)) {
      clearAuthData();
      if (callback) callback();
    }
  };
  
  // Check every minute
  const interval = setInterval(checkTokenExpiration, 60000);
  
  // Return cleanup function
  return () => clearInterval(interval);
};