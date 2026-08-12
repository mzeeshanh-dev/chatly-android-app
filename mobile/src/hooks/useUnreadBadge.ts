import { useEffect } from 'react';
import notifee from '@notifee/react-native';
import { collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../lib/firestore';

/**
 * Keeps the app icon's badge count in sync with the real total unread count
 * across all DMs + groups (like WhatsApp) — not the previous approach of
 * incrementing by 1 per push and zeroing on app open, which didn't reflect
 * actual unread state (e.g. reading one chat while 3 others stay unread used
 * to still zero the badge on next launch).
 *
 * Runs two lightweight listeners (just enough to sum unreadCount — not the
 * full enrichment useChatsQuery/useGroupsQuery do) so it's cheap to keep
 * mounted for the whole authenticated session.
 */
export function useUnreadBadge(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;

    let chatsTotal = 0;
    let groupsTotal = 0;
    const applyBadge = () => notifee.setBadgeCount(chatsTotal + groupsTotal).catch(() => undefined);

    const unsubChats = onSnapshot(
      query(collection(db, COLLECTIONS.CHATS), where('participants', 'array-contains', uid)),
      (snap) => {
        chatsTotal = snap.docs.reduce((sum, d) => sum + ((d.data().unreadCount as Record<string, number>)?.[uid] ?? 0), 0);
        applyBadge();
      },
      () => undefined
    );

    const unsubGroups = onSnapshot(
      query(collection(db, COLLECTIONS.GROUPS), where('memberIds', 'array-contains', uid)),
      (snap) => {
        groupsTotal = snap.docs.reduce((sum, d) => sum + ((d.data().unreadCount as Record<string, number>)?.[uid] ?? 0), 0);
        applyBadge();
      },
      () => undefined
    );

    return () => {
      unsubChats();
      unsubGroups();
      notifee.setBadgeCount(0).catch(() => undefined);
    };
  }, [uid]);
}
