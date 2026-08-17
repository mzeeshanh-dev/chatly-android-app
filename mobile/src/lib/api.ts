import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken,
} from '@react-native-firebase/auth';
import { doc, setDoc, updateDoc, FieldValue } from '@react-native-firebase/firestore';
import { app, auth, db } from './firebase';
import { COLLECTIONS } from './firestore';
import { WEB_API_BASE_URL } from '../config/constants';

// All core authentication is handled natively via Firebase client SDKs for
// zero-server deployments. `call()`/`functionsInstance` below back the small
// handful of Cloud-Function-based helpers still defined for reference
// (uploadAvatar/deleteAvatar/sendPush/sendRequestEmail) — none of them are
// currently invoked anywhere in the app, and none will work unless
// functions/ is actually deployed (requires Firebase's paid Blaze plan).
// The functions this app actually depends on (uploadChatMedia,
// sendRejectionEmail, message push) go through `webApi()` instead, which
// hits the Chatly web app's own Vercel-hosted Next.js API — no Firebase
// billing plan involved.
const functionsInstance = getFunctions(app);

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

async function call<T>(name: string, data?: unknown): Promise<T> {
  try {
    const fn = httpsCallable(functionsInstance, name);
    const result = await fn(data);
    return result.data as T;
  } catch (error: any) {
    throw new ApiError(error?.message ?? 'Something went wrong. Please try again.', error?.code ?? 'unknown');
  }
}

async function webApi<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Sign in required.', 'unauthenticated');
  const idToken = await getIdToken(user);

  const res = await fetch(`${WEB_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? 'Something went wrong. Please try again.', String(res.status));
  return json as T;
}

async function webApiUpload<T>(path: string, formData: FormData): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError('Sign in required.', 'unauthenticated');
  const idToken = await getIdToken(user);

  const res = await fetch(`${WEB_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error ?? 'Upload failed.', String(res.status));
  return json as T;
}

export interface RegisterResult {
  success: true;
  uid: string;
}
export async function register(email: string, displayName: string, password: string): Promise<RegisterResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), {
      uid: user.uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      photoURL: null,
      bio: '',
      phone: '',
      location: '',
      isActivated: false,
      status: 'online',
      lastSeen: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      settings: { theme: 'dark', notificationsEnabled: true },
    });
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not send initial verification email:', e);
    }
    return { success: true, uid: user.uid };
  } catch (error: any) {
    let msg = 'Could not create your account. Please try again.';
    if (error?.code === 'auth/email-already-in-use') msg = 'This email address is already registered.';
    else if (error?.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
    else if (error?.code === 'auth/weak-password') msg = 'Password is too weak. Please choose at least 6 characters.';
    else if (error?.code === 'auth/network-request-failed') msg = 'No internet connection. Please check your network and try again.';
    else if (error?.message) msg = error.message;
    throw new ApiError(msg, error?.code ?? 'unknown');
  }
}

export interface ResendOtpResult {
  success: true;
  displayName: string;
}
export async function resendOtp(_email: string): Promise<ResendOtpResult> {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
    }
    return { success: true, displayName: user?.displayName ?? 'User' };
  } catch (error: any) {
    throw new ApiError(error?.message ?? 'Could not resend verification email.', error?.code ?? 'unknown');
  }
}

export async function verifyOtp(_email: string, _code?: string): Promise<{ success: true }> {
  try {
    const user = auth.currentUser;
    if (!user) throw new ApiError('No active authentication session found.', 'auth/no-user');
    await user.reload();
    if (!user.emailVerified) {
      throw new ApiError('Email not verified yet. Please click the verification link sent to your email.', 'not-verified');
    }
    await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { isActivated: true });
    return { success: true };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error?.message ?? 'Could not verify account status.', error?.code ?? 'unknown');
  }
}

export async function forgotOtp(email: string): Promise<{ success: true }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    let msg = 'Could not send reset email.';
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-email') {
      msg = 'No account found with this email address.';
    } else if (error?.code === 'auth/network-request-failed') {
      msg = 'No internet connection. Please check your network and try again.';
    } else if (error?.message) msg = error.message;
    throw new ApiError(msg, error?.code ?? 'unknown');
  }
}

export async function resetPassword(_email: string, _code?: string, _newPassword?: string): Promise<{ success: true }> {
  // Handled automatically via Firebase secure password reset email link
  return { success: true };
}

export interface UploadAvatarResult {
  url: string;
  publicId: string;
}
export function uploadAvatar(base64: string, mimeType: string, type: 'profile' | 'group' = 'profile', id?: string) {
  return call<UploadAvatarResult>('uploadAvatar', { base64, mimeType, type, id });
}

export function deleteAvatar(publicIds: string[]) {
  return call<{ success: true }>('deleteAvatar', { publicIds });
}

export interface UploadChatMediaResult {
  url: string;
  publicId: string;
  sizeBytes: number;
}
/**
 * Hits the web app's /api/upload/chat-media route (auth-checked + chat
 * membership-checked server-side there), not a Cloud Function — see the
 * module comment above. Uploads via multipart FormData with `{ uri, name,
 * type }`, RN's standard file-upload shape, so the picked file streams
 * straight from disk instead of being base64-encoded into memory first.
 */
export function uploadChatMedia(input: {
  uri: string;
  fileName: string;
  mimeType: string;
  mediaType: 'image' | 'file' | 'voice';
  chatId: string;
  isGroup: boolean;
}) {
  const formData = new FormData();
  formData.append('file', { uri: input.uri, name: input.fileName, type: input.mimeType } as unknown as Blob);
  formData.append('chatId', input.chatId);
  formData.append('isGroup', String(input.isGroup));
  formData.append('mediaType', input.mediaType);
  return webApiUpload<UploadChatMediaResult>('/api/upload/chat-media', formData);
}

export interface SendPushInput {
  recipientId: string;
  title?: string;
  body: string;
  senderName?: string;
  senderPhotoUrl?: string;
  chatId?: string;
  collectionName?: 'chats' | 'groups';
  data?: Record<string, string>;
}
export function sendPush(input: SendPushInput) {
  return call<{ success: true }>('sendPush', input);
}

export function sendRequestEmail(toEmail: string, fromName: string) {
  return webApi<{ success: true }>('/api/notify/request', { toEmail, fromName });
}

export function sendRejectionEmail(toEmail: string, fromName: string) {
  return webApi<{ success: true }>('/api/notify/rejection', { toEmail, fromName });
}

export interface NotifyMessageInput {
  recipientId: string;
  body: string;
  senderName: string;
  senderPhotoUrl?: string;
  chatId: string;
  collectionName: 'chats' | 'groups';
}
/**
 * Message-send push notification. Mobile has no Firestore-trigger Cloud
 * Function to fire this automatically (would require the Blaze plan), so —
 * same as the web app's own sendMessage — the client calls it directly right
 * after the Firestore write succeeds.
 */
export function notifyMessage(input: NotifyMessageInput) {
  return webApi<{ success: true }>('/api/notify', input);
}
