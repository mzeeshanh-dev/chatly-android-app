import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getMessaging } from '@react-native-firebase/messaging';

/**
 * Port of the web app's src/lib/firebase.ts. Unlike the web SDK, there's no
 * config object to pass here — @react-native-firebase reads android/app/
 * google-services.json natively and auto-initializes the default app, so we
 * just grab handles to it. Same project (chatly-ec08f) as the web app, so
 * both clients read/write identical Firestore data.
 */
export const app = getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
