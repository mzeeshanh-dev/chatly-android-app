/**
 * Port of the web app's src/lib/firestore.ts — identical collection names,
 * document shapes, and helper semantics so the mobile app reads/writes the
 * exact same Firestore documents the web app does.
 *
 * One real API difference from the web `firebase/firestore` package:
 * `serverTimestamp()` / `arrayUnion()` are static methods on the `FieldValue`
 * class here (`FieldValue.serverTimestamp()`), not standalone functions.
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  FieldValue,
  Timestamp,
  type UpdateData,
} from '@react-native-firebase/firestore';
import { db } from './firebase';

export const COLLECTIONS = {
  USERS: 'users',
  CHATS: 'chats',
  GROUPS: 'groups',
  OTPS: 'otps',
} as const;

export interface FirestoreUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  photoPublicId?: string | null;
  bio: string;
  phone: string;
  designation?: string;
  location: string;
  isActivated: boolean;
  isSuspended?: boolean;
  status: 'online' | 'offline';
  lastSeen: Timestamp | FieldValue | null;
  createdAt: Timestamp | FieldValue | null;
  fcmTokens?: string[];
  settings?: { theme: 'dark' | 'light'; notificationsEnabled: boolean };
  blockedUsers?: string[];
  acceptedContacts?: string[];
}

export interface ChatDoc {
  participants: [string, string];
  status: 'pending' | 'active' | 'rejected';
  requestedBy: string;
  createdAt: Timestamp | FieldValue | null;
  lastMessage?: string;
  lastMessageAt?: Timestamp | FieldValue | null;
  unreadCount?: Record<string, number>;
  lastRead?: Record<string, Timestamp>;
  /** Per-user archive, mirrors deletedFor's semantics — archiving only hides it for you. */
  archivedFor?: string[];
}

export interface GroupDoc {
  name: string;
  description: string;
  photoURL: string | null;
  photoPublicId?: string | null;
  adminId: string;
  members: Array<{ uid: string; status: 'pending' | 'accepted' }>;
  memberIds: string[];
  createdAt: Timestamp | FieldValue | null;
  lastMessage?: string;
  lastMessageAt?: Timestamp | FieldValue | null;
  unreadCount?: Record<string, number>;
  lastRead?: Record<string, Timestamp>;
}

export interface MessageDoc {
  text: string;
  senderId: string;
  timestamp: Timestamp | FieldValue | null;
  type: 'text' | 'system';
  status?: 'sent' | 'delivered' | 'read';
  deletedFor?: string[];
  forwarded?: boolean;
  edited?: boolean;
  editedAt?: Timestamp | FieldValue | null;
}

// ─── User helpers ─────────────────────────────────────────────────────────────
export async function getUser(uid: string): Promise<FirestoreUser | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  return snap.exists() ? (snap.data() as FirestoreUser) : null;
}

export async function updateUser(uid: string, data: Partial<Omit<FirestoreUser, 'uid' | 'email' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), data as UpdateData<FirestoreUser>);
}

export async function getActivatedUsers(excludeUid?: string): Promise<FirestoreUser[]> {
  const q = query(collection(db, COLLECTIONS.USERS), where('isActivated', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as FirestoreUser).filter((u) => u.uid !== excludeUid);
}

// ─── Chat helpers ─────────────────────────────────────────────────────────────
/** Deterministic DM id — same two UIDs always produce the same document id. */
export function getDMChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export function chatRef(chatId: string) {
  return doc(db, COLLECTIONS.CHATS, chatId);
}

export function groupRef(groupId: string) {
  return doc(db, COLLECTIONS.GROUPS, groupId);
}

export function messagesRef(parentCollection: 'chats' | 'groups', parentId: string) {
  return collection(db, parentCollection, parentId, 'messages');
}

export {
  FieldValue,
  setDoc,
  doc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
};
