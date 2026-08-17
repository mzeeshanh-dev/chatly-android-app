import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, Pressable, KeyboardAvoidingView, Platform, TextInput as RNTextInput, ActivityIndicator, Image, Keyboard } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { formatDistanceToNow, isSameDay } from 'date-fns';
import { CaretLeft, PaperPlaneRight, DotsThreeVertical, Check, X as XIcon, Paperclip, Microphone, Stop, FileText } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { Avatar, getPresenceDotColor } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { MessageBubble } from '../../components/MessageBubble';
import { MessageActionBar } from '../../components/MessageActionBar';
import { ForwardMessageSheet, type ForwardMessageSheetRef } from '../../components/ForwardMessageSheet';
import { AttachMenuSheet, type AttachMenuSheetRef } from '../../components/AttachMenuSheet';
import { MessageTagSheet, type MessageTagSheetRef } from '../../components/MessageTagSheet';
import { ConfirmSheet, type ConfirmSheetRef } from '../../components/ConfirmSheet';
import { ProfilePhotoViewer } from '../../components/ProfilePhotoViewer';
import { ChatLoadingSkeleton } from '../../components/ChatLoadingSkeleton';
import { DigestBanner } from '../../components/DigestBanner';
import { useMessages } from '../../hooks/useMessages';
import { useTrackedItemCounts } from '../../hooks/useTrackedItemCounts';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { setTyping, getActiveTypists } from '../../lib/presence';
import { sendRejectionEmail, notifyMessage } from '../../lib/api';
import { pickImage, pickFile, startVoiceRecording, stopVoiceRecording, cancelVoiceRecording, uploadPickedMedia, type PickedMedia } from '../../lib/media';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc, addDoc, FieldValue, messagesRef, getUser, type FirestoreUser } from '../../lib/firestore';
import type { Timestamp } from '@react-native-firebase/firestore';
import type { RootStackParamList } from '../../navigation/types';
import type { SelectedConversation, MessageWithId } from '../../types/chat';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatWindow'>;

export function ChatWindowScreen({ route, navigation }: Props) {
  const { conversation } = route.params;
  const { colors } = useTheme();
  const { profile } = useAuth();
  const myUid = profile?.uid ?? '';

  const collectionName = conversation.type === 'dm' ? 'chats' : 'groups';
  const docId = conversation.type === 'dm' ? conversation.chatId : conversation.groupId;

  const [liveDoc, setLiveDoc] = useState<Record<string, unknown> | null>(null);
  const [otherUser, setOtherUser] = useState<FirestoreUser | null>(conversation.type === 'dm' ? conversation.other : null);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<MessageWithId[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<PickedMedia | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [unreadOnOpen, setUnreadOnOpen] = useState<number | null>(null);
  const [digestDismissed, setDigestDismissed] = useState(false);

  const confirmSheetRef = useRef<ConfirmSheetRef>(null);
  const forwardSheetRef = useRef<ForwardMessageSheetRef>(null);
  const attachSheetRef = useRef<AttachMenuSheetRef>(null);
  const tagSheetRef = useRef<MessageTagSheetRef>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { messages, loading } = useMessages(collectionName, docId, myUid);
  const { isOnline } = useNetworkStatus();
  const { openQuestionsCount, pendingTasksCount, pendingDecisionsCount } = useTrackedItemCounts(collectionName, docId);
  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only warn once per offline stretch, not on every single send attempt.
  const hasWarnedOfflineRef = useRef(false);

  useEffect(() => {
    if (isOnline) hasWarnedOfflineRef.current = false;
  }, [isOnline]);

  const highlightMessageId = route.params?.highlightMessageId as string | undefined;

  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      const index = messages.findIndex(m => m.id === highlightMessageId);
      if (index !== -1 && listRef.current) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }, 500);
      }
    }
  }, [highlightMessageId, messages]);

  const title = conversation.type === 'dm' ? conversation.other.displayName : conversation.name;
  const photoURL = conversation.type === 'dm' ? conversation.other.photoURL : conversation.photoURL;

  // ─── Live chat/group doc (status, typing, unread) ───────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, collectionName, docId), (snap) => {
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      setLiveDoc(data);
      // Snapshot the "while you were away" digest numbers exactly once, before
      // the read-receipt effect below zeroes unreadCount for this device.
      setUnreadOnOpen((prev) => (prev !== null ? prev : ((data?.unreadCount as Record<string, number> | undefined)?.[myUid] ?? 0)));
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, docId]);

  // ─── Live "other" user profile for DMs (online status) ──────────────────
  useEffect(() => {
    if (conversation.type !== 'dm') return;
    const unsubscribe = onSnapshot(doc(db, 'users', conversation.other.uid), (snap) => {
      if (snap.exists()) setOtherUser(snap.data() as FirestoreUser);
    });
    return unsubscribe;
  }, [conversation]);

  // ─── Group member display names (message bubbles show names, not UIDs) ──
  useEffect(() => {
    if (conversation.type !== 'group') return;
    Promise.all(conversation.members.map((m) => getUser(m.uid))).then((users) => {
      const map: Record<string, string> = {};
      users.forEach((u, i) => {
        if (u) map[u.uid] = u.displayName;
        else map[conversation.members[i].uid] = 'Unknown';
      });
      setMemberNames(map);
    });
  }, [conversation]);

  const status = (liveDoc?.status as 'pending' | 'active' | 'rejected' | undefined) ?? (conversation.type === 'dm' ? conversation.status : 'active');
  const requestedBy = (liveDoc?.requestedBy as string | undefined) ?? (conversation.type === 'dm' ? conversation.requestedBy : undefined);
  const iAmRecipientOfPendingRequest = conversation.type === 'dm' && status === 'pending' && requestedBy !== myUid;
  const iAmSenderOfPendingRequest = conversation.type === 'dm' && status === 'pending' && requestedBy === myUid;
  // Symmetric: blocked if either side has blocked the other (matches web ChatWindow.tsx).
  const isBlocked =
    conversation.type === 'dm' && (profile?.blockedUsers?.includes(conversation.other.uid) || otherUser?.blockedUsers?.includes(myUid));
  const headerDotColor =
    conversation.type === 'dm'
      ? getPresenceDotColor({ status, isBlocked: Boolean(isBlocked), isOnline: otherUser?.status === 'online' })
      : null;
  const composerDisabled = iAmRecipientOfPendingRequest || (iAmSenderOfPendingRequest && messages.length > 0) || status === 'rejected' || isBlocked;

  const typists = useMemo(
    () => getActiveTypists(liveDoc?.typing as Record<string, Timestamp> | undefined, myUid),
    [liveDoc, myUid]
  );

  const assignees = useMemo(() => {
    if (conversation.type === 'dm') {
      return [
        { uid: myUid, name: 'You' },
        { uid: conversation.other.uid, name: conversation.other.displayName },
      ];
    }
    return conversation.members.map((m) => ({ uid: m.uid, name: m.uid === myUid ? 'You' : (memberNames[m.uid] ?? 'Unknown') }));
  }, [conversation, myUid, memberNames]);

  // ─── Mark unread-for-me messages as read + clear my unread counter ──────
  useEffect(() => {
    if (!liveDoc) return; // Wait for doc to exist before updating read status
    const unread = messages.filter((m) => m.senderId !== myUid && m.status !== 'read' && m.type === 'text');
    unread.forEach((m) => {
      updateDoc(doc(messagesRef(collectionName, docId), m.id), { status: 'read' }).catch((e) => console.log('Silently failed to mark read:', e));
    });
    if (unread.length > 0 || (liveDoc?.unreadCount as Record<string, number>)?.[myUid]) {
      updateDoc(doc(db, collectionName, docId), {
        [`unreadCount.${myUid}`]: 0,
        [`lastRead.${myUid}`]: FieldValue.serverTimestamp(),
      }).catch((e) => console.log('Silently failed to clear unreadCount:', e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, docId, liveDoc !== null]);

  useEffect(() => {
    if (messages.length > 0) requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [messages.length]);

  const otherUid = conversation.type === 'dm' ? conversation.other.uid : undefined;

  const handleChangeText = (value: string) => {
    setText(value);
    setTyping(collectionName, docId, myUid, value.length > 0);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTyping(collectionName, docId, myUid, false), 4000);
  };

  // ─── Push notification fan-out ──────────────────────────────────────────────
  // Client-triggered (not a Cloud Functions Firestore trigger) — mobile has no
  // Cloud Functions backend of its own (staying on Firebase's free Spark
  // plan). Hits the web app's own /api/notify route instead — same "server"
  // the web app uses for itself, no Firebase billing plan involved. See root
  // README's "Server architecture" section.
  const notifyRecipients = async (body: string) => {
    try {
      const senderName = profile?.displayName ?? 'Someone';
      const senderPhotoUrl = profile?.photoURL ?? undefined;
      if (conversation.type === 'dm') {
        if (!otherUid) return;
        await notifyMessage({ recipientId: otherUid, body, senderName, senderPhotoUrl, chatId: docId, collectionName: 'chats' });
      } else {
        await Promise.all(
          conversation.members
            .filter((m) => m.uid !== myUid)
            .map((m) =>
              notifyMessage({
                recipientId: m.uid,
                body,
                senderName: `${senderName} in ${conversation.name}`,
                senderPhotoUrl,
                chatId: docId,
                collectionName: 'groups',
              })
            )
        );
      }
    } catch (error) {
      console.warn('Notify error:', error);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !pendingMedia) || composerDisabled) return;

    if (pendingMedia) {
      const caption = trimmed;
      const mediaToSend = pendingMedia;
      setText('');
      setPendingMedia(null);
      await handleSendMedia(mediaToSend, caption);
      return;
    }

    setText('');
    setTyping(collectionName, docId, myUid, false);

    if (!isOnline && !hasWarnedOfflineRef.current) {
      hasWarnedOfflineRef.current = true;
      Toast.show({
        type: 'info',
        text1: 'No internet connection',
        text2: "Your message will send automatically once you're back online.",
      });
    }

    try {
      await addDoc(messagesRef(collectionName, docId), {
        text: trimmed,
        senderId: myUid,
        timestamp: FieldValue.serverTimestamp(),
        type: 'text',
        status: 'sent',
      });

      const update: Record<string, unknown> = {
        lastMessage: trimmed,
        lastMessageAt: FieldValue.serverTimestamp(),
      };
      if (otherUid) update[`unreadCount.${otherUid}`] = FieldValue.increment(1);
      await updateDoc(doc(db, collectionName, docId), update);
      notifyRecipients(trimmed);
    } catch (error: any) {
      console.warn('Message send error:', error);
      Toast.show({
        type: 'error',
        text1: 'Message not sent',
        text2: error.message?.includes('permission') ? "You don't have permission to message this chat." : 'An unexpected error occurred.',
      });
    }
  };

  const handleSendMedia = async (picked: PickedMedia, caption?: string) => {
    if (composerDisabled) return;
    setUploading(true);
    try {
      const uploaded = await uploadPickedMedia(picked, docId, conversation.type === 'group');
      await addDoc(messagesRef(collectionName, docId), {
        text: caption ?? '',
        senderId: myUid,
        timestamp: FieldValue.serverTimestamp(),
        type: 'text',
        status: 'sent',
        mediaType: uploaded.mediaType,
        mediaUrl: uploaded.mediaUrl,
        mediaMeta: uploaded.mediaMeta,
      });

      const preview =
        uploaded.mediaType === 'image' ? '📷 Photo' : uploaded.mediaType === 'voice' ? '🎤 Voice message' : `📎 ${uploaded.mediaMeta.fileName ?? 'File'}`;
      const update: Record<string, unknown> = { lastMessage: preview, lastMessageAt: FieldValue.serverTimestamp() };
      if (otherUid) update[`unreadCount.${otherUid}`] = FieldValue.increment(1);
      await updateDoc(doc(db, collectionName, docId), update);
      notifyRecipients(preview);
    } catch (error: any) {
      console.warn('Media send error:', error);
      Toast.show({ type: 'error', text1: 'Upload failed', text2: error?.message ?? 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    const picked = await pickImage();
    if (picked) setPendingMedia(picked);
  };

  const handlePickFile = async () => {
    const picked = await pickFile();
    if (picked) setPendingMedia(picked);
  };

  const handleStartRecording = async () => {
    try {
      await startVoiceRecording();
      setRecording(true);
      setRecordMs(0);
      recordTimerRef.current = setInterval(() => setRecordMs((ms) => ms + 1000), 1000);
    } catch (error) {
      console.warn('Could not start recording:', error);
      Toast.show({ type: 'error', text1: 'Microphone unavailable', text2: 'Check microphone permission in system Settings.' });
    }
  };

  const handleStopRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    const picked = await stopVoiceRecording(recordMs);
    if (picked) await handleSendMedia(picked);
  };

  const handleCancelRecording = async () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    await cancelVoiceRecording();
  };

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const handleAccept = async () => {
    await updateDoc(doc(db, 'chats', docId), { status: 'active' });
  };

  const handleDecline = async () => {
    await updateDoc(doc(db, 'chats', docId), { status: 'rejected' });
    if (otherUser) {
      sendRejectionEmail(otherUser.email, profile?.displayName ?? '').catch(() => undefined);
    }
  };

  const handleForwardMessage = async (conv: SelectedConversation, textToForward: string) => {
    const col = conv.type === 'dm' ? 'chats' : 'groups';
    const id = conv.type === 'dm' ? conv.chatId : conv.groupId;
    
    await addDoc(messagesRef(col, id), {
      text: textToForward,
      senderId: myUid,
      timestamp: FieldValue.serverTimestamp(),
      type: 'text',
      status: 'sent',
      forwarded: true,
    });
    
    Toast.show({ type: 'success', text1: 'Message forwarded' });
    setSelectedMessages([]);
  };

  const handleDeleteRequest = () => {
    if (selectedMessages.length === 0) return;
    const canDeleteForEveryone = selectedMessages.every(m => {
      const isMine = m.senderId === myUid;
      const within3Mins = Date.now() - ((m.timestamp as Timestamp)?.toMillis?.() ?? Date.now()) < 3 * 60 * 1000;
      return isMine && within3Mins;
    });

    if (canDeleteForEveryone) {
      confirmSheetRef.current?.open({
        title: `Delete ${selectedMessages.length} Message(s)`,
        description: 'Delete for yourself, or for everyone?',
        confirmText: 'Delete for Everyone',
        thirdText: 'Delete for Me',
        confirmColor: 'destructive',
        thirdColor: 'destructive',
        onConfirm: async () => {
          for (const m of selectedMessages) {
            await deleteDoc(doc(messagesRef(collectionName, docId), m.id));
          }
          setSelectedMessages([]);
        },
        onThirdAction: async () => {
          for (const m of selectedMessages) {
            await updateDoc(doc(messagesRef(collectionName, docId), m.id), {
              deletedFor: FieldValue.arrayUnion(myUid)
            });
          }
          setSelectedMessages([]);
        },
      });
    } else {
      confirmSheetRef.current?.open({
        title: `Delete ${selectedMessages.length} Message(s)`,
        description: 'Are you sure you want to delete for yourself?',
        confirmText: 'Delete for Me',
        confirmColor: 'destructive',
        onConfirm: async () => {
          for (const m of selectedMessages) {
            await updateDoc(doc(messagesRef(collectionName, docId), m.id), {
              deletedFor: FieldValue.arrayUnion(myUid)
            });
          }
          setSelectedMessages([]);
        },
      });
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']} noPadding>
      <MessageActionBar
        visible={selectedMessages.length > 0}
        selectedCount={selectedMessages.length}
        onClose={() => setSelectedMessages([])}
        onForward={() => forwardSheetRef.current?.open(selectedMessages.map(m => m.text).filter(Boolean).join('\n\n'))}
        onDelete={handleDeleteRequest}
        onTag={() => selectedMessages.length === 1 && tagSheetRef.current?.open(selectedMessages[0])}
        isSender={selectedMessages.length === 1 && selectedMessages[0].senderId === myUid}
      />
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 10,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <CaretLeft size={22} color={colors.foreground} />
        </Pressable>
        <Pressable
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          onPress={() => {
            if (conversation.type === 'dm') {
              navigation.navigate('ContactDetail', { conversation });
            } else {
              navigation.navigate('GroupDetail', { conversation });
            }
          }}
        >
          <Avatar uri={photoURL} name={title} size={38} dotColor={headerDotColor ?? undefined} onPress={() => setViewerVisible(true)} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" numberOfLines={1} style={{ fontSize: 15.5 }}>
              {title}
            </AppText>
            <AppText muted style={{ fontSize: 11.5 }}>
              {typists.length > 0
                ? 'typing…'
                : conversation.type === 'dm'
                  ? otherUser?.status === 'online'
                    ? 'Online'
                    : otherUser?.lastSeen
                      ? `Last seen ${formatDistanceToNow((otherUser.lastSeen as Timestamp).toDate?.() ?? new Date(), { addSuffix: true })}`
                      : ''
                  : `${conversation.members.length} members`}
            </AppText>
          </View>
        </Pressable>
        {openQuestionsCount > 0 || pendingTasksCount > 0 ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {openQuestionsCount > 0 ? (
              <View style={{ backgroundColor: colors.muted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <AppText style={{ fontSize: 10.5, color: colors.mutedForeground }}>❓ {openQuestionsCount}</AppText>
              </View>
            ) : null}
            {pendingTasksCount > 0 ? (
              <View style={{ backgroundColor: colors.muted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <AppText style={{ fontSize: 10.5, color: colors.mutedForeground }}>📋 {pendingTasksCount}</AppText>
              </View>
            ) : null}
          </View>
        ) : null}
        {conversation.type === 'group' ? (
          <Pressable onPress={() => navigation.navigate('GroupSettings', { groupId: conversation.groupId })} hitSlop={10}>
            <DotsThreeVertical size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>

      {unreadOnOpen !== null && unreadOnOpen >= 3 && !digestDismissed ? (
        <DigestBanner
          unreadCount={unreadOnOpen}
          openQuestionsCount={openQuestionsCount}
          pendingTasksCount={pendingTasksCount}
          pendingDecisionsCount={pendingDecisionsCount}
          onDismiss={() => setDigestDismissed(true)}
        />
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {loading && messages.length === 0 ? (
          <ChatLoadingSkeleton />
        ) : (
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 20 }}
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const showDateSeparator =
              !prev || !isSameDay((item.timestamp as Timestamp)?.toDate?.() ?? new Date(), (prev.timestamp as Timestamp)?.toDate?.() ?? new Date());
            const time = (item.timestamp as Timestamp)?.toDate
              ? (item.timestamp as Timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <View>
                {showDateSeparator ? (
                  <MessageBubble type="system" sent={false} time="" text={((item.timestamp as Timestamp)?.toDate?.() ?? new Date()).toDateString()} />
                ) : null}
                <MessageBubble
                  text={item.text}
                  sent={item.senderId === myUid}
                  time={time}
                  status={item.pendingWrite && item.status === 'sent' ? 'pending' : item.status}
                  type={item.type}
                  forwarded={item.forwarded}
                  edited={item.edited}
                  mediaType={item.mediaType}
                  mediaUrl={item.mediaUrl}
                  mediaMeta={item.mediaMeta}
                  selected={selectedMessages.some(sm => sm.id === item.id)}
                  selectionMode={selectedMessages.length > 0}
                  onLongPress={() => {
                    if (!selectedMessages.some(sm => sm.id === item.id)) {
                      setSelectedMessages([...selectedMessages, item as MessageWithId]);
                    }
                  }}
                  onPress={() => {
                    if (selectedMessages.length > 0) {
                      if (selectedMessages.some(sm => sm.id === item.id)) {
                        setSelectedMessages(selectedMessages.filter(sm => sm.id !== item.id));
                      } else {
                        setSelectedMessages([...selectedMessages, item as MessageWithId]);
                      }
                    }
                  }}
                  showSenderName={conversation.type === 'group' && item.senderId !== myUid}
                  senderName={memberNames[item.senderId] ?? item.senderId}
                />
              </View>
            );
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
        )}

        {iAmRecipientOfPendingRequest ? (
          <Animated.View
            entering={FadeIn}
            style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.secondary }}
          >
            <AppText style={{ flex: 1, fontSize: 13.5 }} muted>
              {title} wants to start a conversation with you.
            </AppText>
            <Pressable onPress={handleDecline} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }}>
              <XIcon size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={handleAccept} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
              <Check size={16} color="#fff" weight="bold" />
            </Pressable>
          </Animated.View>
        ) : iAmSenderOfPendingRequest && messages.length > 0 ? (
          <View style={{ padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }}>
            <AppText muted style={{ fontSize: 13, textAlign: 'center' }}>
              You have sent a message request. You can send more messages once they accept.
            </AppText>
          </View>
        ) : status === 'rejected' ? (
          <View style={{ padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }}>
            <AppText muted style={{ fontSize: 13 }}>
              This conversation request was declined.
            </AppText>
          </View>
        ) : isBlocked ? (
          <View style={{ padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border }}>
            <AppText muted style={{ fontSize: 13 }}>
              You can&apos;t message this contact.
            </AppText>
          </View>
        ) : recording ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            <Pressable
              onPress={handleCancelRecording}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }}
            >
              <XIcon size={19} color={colors.mutedForeground} />
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
              <AppText style={{ fontSize: 15, color: colors.foreground }}>
                Recording… {Math.floor(recordMs / 60000)}:{String(Math.floor((recordMs % 60000) / 1000)).padStart(2, '0')}
              </AppText>
            </View>
            <Pressable
              onPress={handleStopRecording}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}
            >
              <Stop size={19} color="#fff" weight="fill" />
            </Pressable>
          </View>
        ) : (
          <View>
            {pendingMedia && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: colors.secondary, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {pendingMedia.mediaType === 'image' ? (
                    <Image source={{ uri: pendingMedia.uri }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <FileText size={20} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 13 }} numberOfLines={1}>
                    {pendingMedia.fileName ?? 'Attachment'}
                  </AppText>
                  {pendingMedia.sizeBytes && (
                    <AppText muted style={{ fontSize: 11 }}>
                      {Math.round(pendingMedia.sizeBytes / 1024)} KB
                    </AppText>
                  )}
                </View>
                <Pressable onPress={() => setPendingMedia(null)} style={{ padding: 8 }}>
                  <XIcon size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: 8,
                padding: 10,
                borderTopWidth: pendingMedia ? 0 : 1,
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              }}
            >
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                attachSheetRef.current?.open();
              }}
              disabled={uploading}
              hitSlop={8}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}
            >
              {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Paperclip size={22} color={colors.mutedForeground} />}
            </Pressable>
            <View style={{ flex: 1, backgroundColor: colors.input, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120 }}>
              <RNTextInput
                value={text}
                onChangeText={handleChangeText}
                placeholder="Message"
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={{ fontSize: 15, color: colors.foreground, fontFamily: 'Inter-Regular', maxHeight: 100 }}
              />
            </View>
            {text.trim() || pendingMedia ? (
              <Pressable
                onPress={handleSend}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}
              >
                <PaperPlaneRight size={19} color="#fff" weight="fill" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleStartRecording}
                disabled={uploading}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }}
              >
                <Microphone size={19} color={colors.primary} weight="fill" />
              </Pressable>
            )}
          </View>
        </View>
        )}
      </KeyboardAvoidingView>

      <ProfilePhotoViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        name={title}
        uri={photoURL}
      />

      <ConfirmSheet ref={confirmSheetRef} />
      <ForwardMessageSheet ref={forwardSheetRef} onForward={handleForwardMessage} />
      <AttachMenuSheet
        ref={attachSheetRef}
        onPickImage={handlePickImage}
        onPickFile={handlePickFile}
        onRecordVoice={handleStartRecording}
      />
      <MessageTagSheet ref={tagSheetRef} parentCollection={collectionName} parentId={docId} myUid={myUid} assignees={assignees} />
    </Screen>
  );
}
