/**
 * The mobile app never needs Firebase env vars in JS — @react-native-firebase
 * reads android/app/google-services.json natively, and Cloud Functions calls
 * (see ../lib/api.ts) go through the same config. There's no separate backend
 * URL to configure.
 */
export const APP_NAME = 'Chatly';
