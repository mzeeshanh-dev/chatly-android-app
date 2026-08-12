import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from '@react-native-firebase/auth';
import { doc, setDoc, updateDoc, FieldValue } from '@react-native-firebase/firestore';
import { app, auth, db } from './firebase';
import { COLLECTIONS } from './firestore';

// Optional server-side functions for avatar processing and notifications.
// All core authentication is handled natively via Firebase client SDKs for zero-server deployments.
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
  return call<{ success: true }>('sendRequestEmail', { toEmail, fromName });
}

export function sendRejectionEmail(toEmail: string, fromName: string) {
  return call<{ success: true }>('sendRejectionEmail', { toEmail, fromName });
}
