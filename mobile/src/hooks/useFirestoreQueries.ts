/**
 * Port of the web app's src/lib/firebase-hooks.ts — TanStack Query for
 * cache/loading state, Firestore's onSnapshot pushing live updates into that
 * cache via queryClient.setQueryData. Same pattern, same query keys.
 */
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, getDocs } from '@react-native-firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, type ChatDoc, type GroupDoc, type FirestoreUser } from '../lib/firestore';
import type { SelectedConversation } from '../types/chat';

export const queryKeys = {
  chats: (uid: string) => ['chats', uid] as const,
  groups: (uid: string) => ['groups', uid] as const,
  users: () => ['users'] as const,
  chatStatus: (id: string) => ['chatStatus', id] as const,
} as const;

export function useChatsQuery(currentUserId: string | undefined): UseQueryResult<SelectedConversation[]> & { synced: boolean } {
  const queryClient = useQueryClient();
  // TanStack's own isLoading is useless here: queryFn resolves synchronously
  // with whatever is already cached (or []) the instant the query mounts, so
  // isLoading flips to false before Firestore's listener ever fires — this
  // tracks the real thing: has a snapshot actually arrived at least once.
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    setSynced(false);

    const q = query(
      collection(db, COLLECTIONS.CHATS),
      where('participants', 'array-contains', currentUserId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        // If local cache is empty, wait for the server before removing the loading skeleton
        if (snap.empty && snap.metadata.fromCache) return;

        const results = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const chat = docSnap.data() as ChatDoc;
            const otherUid = chat.participants.find((p) => p !== currentUserId)!;

            let other: FirestoreUser | null = null;
            try {
              const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, otherUid));
              if (userSnap.exists()) other = userSnap.data() as FirestoreUser;
            } catch (error) {
              console.warn(`Could not fetch user ${otherUid}:`, error);
            }

            if (!other) {
              other = {
                uid: otherUid,
                displayName: 'Unknown User',
                email: '',
                photoURL: null,
                isActivated: false,
              } as FirestoreUser;
            }

            return {
              type: 'dm',
              chatId: docSnap.id,
              other,
              participants: chat.participants,
              status: chat.status,
              requestedBy: chat.requestedBy,
              unreadCount: chat.unreadCount,
              lastRead: chat.lastRead,
              lastMessage: chat.lastMessage,
              lastMessageAt: chat.lastMessageAt,
              archivedFor: chat.archivedFor,
            } as SelectedConversation;
          })
        );

        queryClient.setQueryData(queryKeys.chats(currentUserId), results);
        setSynced(true);
      },
      (error) => {
        console.warn('useChatsQuery listener error:', error);
        setSynced(true);
      }
    );

    return unsubscribe;
  }, [currentUserId, queryClient]);

  const result = useQuery<SelectedConversation[]>({
    queryKey: queryKeys.chats(currentUserId ?? ''),
    queryFn: () => queryClient.getQueryData<SelectedConversation[]>(queryKeys.chats(currentUserId ?? '')) ?? [],
    enabled: Boolean(currentUserId),
    staleTime: Infinity,
  });
  return { ...result, synced };
}

export function useGroupsQuery(currentUserId: string | undefined): UseQueryResult<SelectedConversation[]> & { synced: boolean } {
  const queryClient = useQueryClient();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    setSynced(false);

    const q = query(collection(db, COLLECTIONS.GROUPS), where('memberIds', 'array-contains', currentUserId));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) return;

        const results: SelectedConversation[] = snap.docs.map((d) => {
          const g = d.data() as GroupDoc;
          return {
            type: 'group',
            groupId: d.id,
            name: g.name,
            photoURL: g.photoURL,
            members: g.members,
            adminId: g.adminId,
            unreadCount: g.unreadCount,
            lastRead: g.lastRead,
            lastMessage: g.lastMessage,
            lastMessageAt: g.lastMessageAt,
            description: g.description,
          };
        });
        queryClient.setQueryData(queryKeys.groups(currentUserId), results);
        setSynced(true);
      },
      (error) => {
        console.warn('useGroupsQuery listener error:', error);
        setSynced(true);
      }
    );

    return unsubscribe;
  }, [currentUserId, queryClient]);

  const result = useQuery<SelectedConversation[]>({
    queryKey: queryKeys.groups(currentUserId ?? ''),
    queryFn: () => queryClient.getQueryData<SelectedConversation[]>(queryKeys.groups(currentUserId ?? '')) ?? [],
    enabled: Boolean(currentUserId),
    staleTime: Infinity,
  });
  return { ...result, synced };
}

export function useUsersQuery(currentUserId: string | undefined): UseQueryResult<FirestoreUser[]> {
  return useQuery<FirestoreUser[]>({
    queryKey: queryKeys.users(),
    queryFn: async () => {
      const q = query(collection(db, COLLECTIONS.USERS), where('isActivated', '==', true));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as FirestoreUser).filter((u) => u.uid !== currentUserId);
    },
    enabled: Boolean(currentUserId),
    staleTime: 30_000,
  });
}

/** Live subscription to a single chat/group document — status, unread counts, etc. */
export function useLiveChatDoc(collectionName: 'chats' | 'groups', docId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!docId) return;
    const key = queryKeys.chatStatus(docId);

    const unsubscribe = onSnapshot(
      doc(db, collectionName, docId),
      (snap) => {
        if (snap.exists()) queryClient.setQueryData(key, snap.data());
      },
      (error) => console.warn(`useLiveChatDoc listener error for ${docId}:`, error)
    );

    return unsubscribe;
  }, [collectionName, docId, queryClient]);

  return useQuery({
    queryKey: queryKeys.chatStatus(docId ?? ''),
    queryFn: () => queryClient.getQueryData(queryKeys.chatStatus(docId ?? '')) ?? null,
    enabled: Boolean(docId),
    staleTime: Infinity,
  });
}
