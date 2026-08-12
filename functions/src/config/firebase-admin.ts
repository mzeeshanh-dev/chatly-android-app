import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Running inside Cloud Functions for Firebase, initializeApp() with no
// arguments picks up the project's own runtime service account automatically
// — there's no private key to store, rotate, or accidentally ship anywhere.
if (!getApps().length) {
  initializeApp();
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminMessaging = getMessaging();

export const COLLECTIONS = {
  USERS: "users",
  CHATS: "chats",
  GROUPS: "groups",
  OTPS: "otps",
} as const;
