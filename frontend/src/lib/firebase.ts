import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getMessaging, getToken, Messaging, onMessage } from 'firebase/messaging';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

/**
 * Initialize Firebase app
 * @returns Firebase app instance
 */
export function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  // Check if Firebase is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
    return app;
  }

  // Validate configuration
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('⚠️  Firebase configuration incomplete. Some features may not work.');
    throw new Error('Firebase configuration is incomplete');
  }

  try {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
    return app;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}

/**
 * Get Firebase Auth instance
 * @returns Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }

  const firebaseApp = getFirebaseApp();
  auth = getAuth(firebaseApp);
  return auth;
}

/**
 * Get Firebase Cloud Messaging instance
 * @returns FCM messaging instance
 */
export function getFirebaseMessaging(): Messaging | null {
  if (messaging) {
    return messaging;
  }

  // Check if browser supports service workers (required for FCM)
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('⚠️  Service workers not supported. Push notifications disabled.');
    return null;
  }

  try {
    const firebaseApp = getFirebaseApp();
    messaging = getMessaging(firebaseApp);
    console.log('✅ Firebase Messaging initialized');
    return messaging;
  } catch (error) {
    console.error('❌ Firebase Messaging initialization failed:', error);
    return null;
  }
}

/**
 * Get Firebase Analytics instance
 * @returns Firebase Analytics instance
 */
export function getFirebaseAnalytics(): Analytics | null {
  if (analytics) {
    return analytics;
  }

  // Analytics only works in browser
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const firebaseApp = getFirebaseApp();
    analytics = getAnalytics(firebaseApp);
    console.log('✅ Firebase Analytics initialized');
    return analytics;
  } catch (error) {
    console.error('❌ Firebase Analytics initialization failed:', error);
    return null;
  }
}

/**
 * Request FCM token for push notifications
 * @returns FCM token or null if unavailable
 */
export async function requestFCMToken(): Promise<string | null> {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('⚠️  Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (token) {
      console.log('✅ FCM token obtained');
      return token;
    } else {
      console.warn('⚠️  No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to get FCM token:', error);
    return null;
  }
}

/**
 * Set up message handler for foreground notifications
 * @param callback Callback function to handle messages
 */
export function onForegroundMessage(
  callback: (payload: any) => void
): (() => void) | null {
  const messagingInstance = getFirebaseMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    return onMessage(messagingInstance, callback);
  } catch (error) {
    console.error('❌ Failed to set up message handler:', error);
    return null;
  }
}

export default {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseMessaging,
  getFirebaseAnalytics,
  requestFCMToken,
  onForegroundMessage,
};

