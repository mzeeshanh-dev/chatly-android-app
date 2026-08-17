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
  FOLLOW_UPS: 'followUps',
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

export interface MessageMediaMeta {
  fileName?: string;
  sizeBytes: number;
  mimeType: string;
  /** Voice notes only. */
  durationMs?: number;
  /** Cloudinary public id, needed to delete the asset later. */
  publicId: string;
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
  /** Present when this message carries an attachment; `text` doubles as an optional caption for image/file. */
  mediaType?: 'image' | 'file' | 'voice';
  mediaUrl?: string;
  mediaMeta?: MessageMediaMeta;
}

/** A message tagged as a Question — one per source message. */
export interface QuestionDoc {
  sourceMessageId: string;
  sourceText: string;
  askedBy: string;
  status: 'open' | 'answered';
  answerText?: string;
  answeredBy?: string;
  createdAt: Timestamp | FieldValue | null;
  answeredAt?: Timestamp | FieldValue | null;
}

/** A message tagged as a Decision. */
export interface DecisionDoc {
  sourceMessageId: string;
  sourceText: string;
  summary: string;
  decidedBy: string[];
  createdBy: string;
  createdAt: Timestamp | FieldValue | null;
}

/** A message turned into a Task. */
export interface TaskDoc {
  sourceMessageId: string;
  sourceText: string;
  title: string;
  assignedTo: string;
  createdBy: string;
  dueAt: Timestamp | FieldValue | null;
  status: 'pending' | 'done';
  createdAt: Timestamp | FieldValue | null;
  completedAt?: Timestamp | FieldValue | null;
}

/**
 * A personal reminder attached to a message — owned by the user who set it,
 * not shared with the rest of the conversation. Lives in a top-level
 * collection (not nested under the chat) so the scheduled Cloud Function that
 * delivers due reminders can run one flat query instead of a collectionGroup.
 */
export interface FollowUpDoc {
  uid: string;
  chatId: string;
  isGroup: boolean;
  messageId: string;
  sourceText: string;
  remindAt: Timestamp | FieldValue | null;
  status: 'pending' | 'sent' | 'dismissed';
  createdAt: Timestamp | FieldValue | null;
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

export function questionsRef(parentCollection: 'chats' | 'groups', parentId: string) {
  return collection(db, parentCollection, parentId, 'questions');
}

export function decisionsRef(parentCollection: 'chats' | 'groups', parentId: string) {
  return collection(db, parentCollection, parentId, 'decisions');
}

export function tasksRef(parentCollection: 'chats' | 'groups', parentId: string) {
  return collection(db, parentCollection, parentId, 'tasks');
}

/** Top-level — see `FollowUpDoc` for why this isn't nested under the chat. */
export function followUpsRef() {
  return collection(db, COLLECTIONS.FOLLOW_UPS);
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
