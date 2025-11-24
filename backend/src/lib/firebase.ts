import { initializeApp, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import env from '../config/env';

let firebaseApp: App | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase Admin SDK
 * @returns Firebase Admin app instance
 */
export function getFirebaseApp(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if Firebase credentials are provided
  if (!env.FIREBASE_PROJECT_ID) {
    console.warn('⚠️  Firebase credentials not configured. Push notifications will be disabled.');
    throw new Error('Firebase credentials not configured');
  }

  try {
    // Initialize Firebase Admin
    // Note: In production, use service account JSON file or environment variables
    // For now, we'll use environment variables
    firebaseApp = initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
      // Service account credentials should be provided via:
      // 1. GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account JSON
      // 2. Or via credential object (not recommended for production)
    });

    console.log('✅ Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    throw error;
  }
}

/**
 * Get Firebase Cloud Messaging instance
 * @returns FCM messaging instance
 */
export function getMessagingInstance(): Messaging {
  if (messaging) {
    return messaging;
  }

  const app = getFirebaseApp();
  messaging = getMessaging(app);
  return messaging;
}

/**
 * Send push notification
 * @param token FCM device token
 * @param title Notification title
 * @param body Notification body
 * @param data Optional data payload
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const messagingInstance = getMessagingInstance();

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    await messagingInstance.send(message);
    console.log('✅ Push notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send push notification:', error);
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 * @param tokens Array of FCM device tokens
 * @param title Notification title
 * @param body Notification body
 * @param data Optional data payload
 */
export async function sendMulticastPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const messagingInstance = getMessagingInstance();

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await messagingInstance.sendEachForMulticast(message);
    console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);
  } catch (error) {
    console.error('❌ Failed to send multicast push notification:', error);
    throw error;
  }
}

export default {
  getFirebaseApp,
  getMessagingInstance,
  sendPushNotification,
  sendMulticastPushNotification,
};

