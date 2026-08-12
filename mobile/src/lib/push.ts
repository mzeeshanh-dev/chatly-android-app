import { Platform, PermissionsAndroid } from 'react-native';
import notifee from '@notifee/react-native';
import {
  getToken,
  onTokenRefresh,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { doc, updateDoc, FieldValue } from '@react-native-firebase/firestore';
import { db, messaging } from './firebase';
import { COLLECTIONS } from './firestore';

let refreshUnsubscribe: (() => void) | null = null;

/**
 * Requests notification permission and registers this device's native FCM
 * token to users/{uid}.fcmTokens — the exact array the sendPush Cloud
 * Function (ported from the web app's api/notify/route.ts) reads from.
 */
export async function registerPushToken(uid: string): Promise<string | null> {
  try {
    // Proactively invoke Android 13+ (API 33+) POST_NOTIFICATIONS prompts
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
        await notifee.requestPermission();
      } catch (permErr) {
        console.warn('Android 13+ notification permission prompt error:', permErr);
      }
    }

    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;
    if (!enabled && Platform.OS !== 'android') return null;

    const token = await getToken(messaging);
    if (token) {
      await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
        fcmTokens: FieldValue.arrayUnion(token),
      });
    }

    // Set up auto-rotation listener for token refreshes
    if (!refreshUnsubscribe) {
      refreshUnsubscribe = onTokenRefresh(messaging, async (newToken) => {
        try {
          await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
            fcmTokens: FieldValue.arrayUnion(newToken),
          });
        } catch (err) {
          console.warn('Could not save refreshed FCM token:', err);
        }
      });
    }

    return token || null;
  } catch (error) {
    console.warn('registerPushToken failed:', error, Platform.OS);
    return null;
  }
}
