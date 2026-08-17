/**
 * The mobile app never needs Firebase env vars in JS — @react-native-firebase
 * reads android/app/google-services.json natively, and Cloud Functions calls
 * (see ../lib/api.ts) go through the same config. There's no separate backend
 * URL to configure.
 */
export const APP_NAME = 'Chatly';

/** Shared with the server-side cap in the web app's /api/upload/chat-media route — keep both in sync. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Mobile has no Cloud Functions backend of its own — staying on Firebase's
 * free Spark plan (Cloud Functions requires the paid Blaze plan). Privileged
 * operations (media upload, push notifications, transactional email) go
 * through the Chatly web app's own Vercel-hosted Next.js API routes instead,
 * which already exist for the web app and don't touch Firebase billing at
 * all. See root README's "Server architecture" section.
 */
export const WEB_API_BASE_URL = 'https://chatly-stream.vercel.app';
