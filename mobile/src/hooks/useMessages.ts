import { useEffect, useState } from 'react';
import { query, orderBy, onSnapshot } from '@react-native-firebase/firestore';
import { messagesRef, type MessageDoc } from '../lib/firestore';
import type { MessageWithId } from '../types/chat';

/** Realtime message list for a chat/group, newest last (chronological). Hides messages the given user has cleared (matches the web app's `deletedFor` semantics). */
export function useMessages(collectionName: 'chats' | 'groups', id: string | undefined, myUid?: string) {
  const [messages, setMessages] = useState<MessageWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const q = query(messagesRef(collectionName, id), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty && snap.metadata.fromCache) return;

        // hasPendingWrites: this device wrote it locally but Firestore hasn't
        // confirmed the server has it yet (e.g. sent while offline, still
        // queued) — surfaced so the UI can show a "pending" clock instead of
        // a sent checkmark until it's actually round-tripped.
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MessageDoc), pendingWrite: d.metadata.hasPendingWrites }));
        setMessages(myUid ? all.filter((m) => !m.deletedFor?.includes(myUid)) : all);
        setLoading(false);
      },
      (error) => {
        console.warn('useMessages listener error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [collectionName, id, myUid]);

  return { messages, loading };
}
