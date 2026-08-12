import type { FieldValue, Timestamp } from '@react-native-firebase/firestore';
import type { FirestoreUser, MessageDoc } from '../lib/firestore';

type LastMessageAt = Timestamp | FieldValue | null | undefined;

export type MessageWithId = MessageDoc & { id: string; pendingWrite?: boolean };

export type SelectedConversation =
  | {
      type: 'dm';
      chatId: string;
      other: FirestoreUser;
      participants: string[];
      status: 'pending' | 'active' | 'rejected';
      requestedBy: string;
      unreadCount?: Record<string, number>;
      lastRead?: Record<string, Timestamp>;
      lastMessage?: string;
      lastMessageAt?: LastMessageAt;
      archivedFor?: string[];
    }
  | {
      type: 'group';
      groupId: string;
      name: string;
      photoURL: string | null;
      adminId: string;
      members: Array<{ uid: string; status: 'pending' | 'accepted' }>;
      requestedBy?: string;
      unreadCount?: Record<string, number>;
      lastRead?: Record<string, Timestamp>;
      lastMessage?: string;
      lastMessageAt?: LastMessageAt;
      description?: string;
    };
