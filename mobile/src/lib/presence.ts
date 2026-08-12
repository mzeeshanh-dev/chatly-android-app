import { doc, updateDoc, FieldValue, Timestamp } from '@react-native-firebase/firestore';
import { db } from './firebase';

/**
 * Typing indicator, ported from the web app's "synchronized temporary
 * presence maps" idea but simplified to a single map field on the chat/group
 * document itself (`typing: { [uid]: Timestamp }`) instead of a separate
 * collection — one extra write per keystroke burst, cheap to read for every
 * other participant already subscribed to that document.
 */
const TYPING_STALE_MS = 6000;

export async function setTyping(collectionName: 'chats' | 'groups', id: string, uid: string, isTyping: boolean) {
  try {
    await updateDoc(doc(db, collectionName, id), {
      [`typing.${uid}`]: isTyping ? FieldValue.serverTimestamp() : FieldValue.delete(),
    });
  } catch {
    // Non-critical — a missed typing update never blocks messaging.
  }
}

export function getActiveTypists(typing: Record<string, Timestamp> | undefined, excludeUid: string): string[] {
  if (!typing) return [];
  const now = Date.now();
  return Object.entries(typing)
    .filter(([uid, ts]) => uid !== excludeUid && ts?.toMillis && now - ts.toMillis() < TYPING_STALE_MS)
    .map(([uid]) => uid);
}
