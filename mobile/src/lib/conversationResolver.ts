import { getDoc, getUser, chatRef, groupRef, type ChatDoc, type GroupDoc } from './firestore';
import type { SelectedConversation } from '../types/chat';

/**
 * Rebuilds a full SelectedConversation from just {chatId, collectionName} —
 * all a push notification payload carries. Needed because ChatWindowScreen
 * expects the richer shape (the other user's profile / group metadata) that
 * a bare chat id doesn't include.
 */
export async function resolveConversation(
  collectionName: 'chats' | 'groups',
  id: string,
  myUid: string
): Promise<SelectedConversation | null> {
  if (collectionName === 'chats') {
    const snap = await getDoc(chatRef(id));
    if (!snap.exists()) return null;
    const chat = snap.data() as ChatDoc;
    const otherUid = chat.participants.find((p) => p !== myUid);
    if (!otherUid) return null;
    const other = await getUser(otherUid);
    if (!other) return null;

    return {
      type: 'dm',
      chatId: id,
      other,
      participants: chat.participants,
      status: chat.status,
      requestedBy: chat.requestedBy,
      unreadCount: chat.unreadCount,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt as never,
    };
  }

  const snap = await getDoc(groupRef(id));
  if (!snap.exists()) return null;
  const group = snap.data() as GroupDoc;

  return {
    type: 'group',
    groupId: id,
    name: group.name,
    photoURL: group.photoURL,
    adminId: group.adminId,
    members: group.members,
    unreadCount: group.unreadCount,
    lastMessage: group.lastMessage,
    lastMessageAt: group.lastMessageAt as never,
    description: group.description,
  };
}
