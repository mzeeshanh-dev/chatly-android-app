import React, { useState } from 'react';
import { View, ScrollView, Pressable, Switch, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CaretLeft, BellSimple, Prohibit, Trash, Archive, Image, EnvelopeSimple, Phone, MapPin } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { db } from '../../lib/firebase';
import { doc, updateDoc, getDocs, FieldValue, messagesRef, type MessageDoc } from '../../lib/firestore';
import { writeBatch } from '@react-native-firebase/firestore';
import { COLLECTIONS } from '../../lib/firestore';
import type { RootStackParamList } from '../../navigation/types';
import { ConfirmSheet, type ConfirmSheetRef } from '../../components/ConfirmSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactDetail'>;

export function ContactDetailScreen({ navigation, route }: Props) {
  const { conversation } = route.params;
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [muted, setMuted] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [archived, setArchived] = useState(
    conversation.type === 'dm' && Boolean(conversation.archivedFor?.includes(profile?.uid ?? ''))
  );
  const confirmSheetRef = React.useRef<ConfirmSheetRef>(null);

  if (conversation.type !== 'dm') return null;
  const { other } = conversation;
  const blocked = profile?.blockedUsers?.includes(other.uid) ?? false;

  const handleToggleMute = (value: boolean) => {
    setMuted(value);
    Toast.show({
      type: 'success',
      text1: value ? `Muted notifications for ${other.displayName}` : `Unmuted ${other.displayName}`,
    });
  };

  const handleBlockRequest = () => {
    const next = !blocked;
    if (!next) {
      handleToggleBlock(); // direct unblock
      return;
    }
    confirmSheetRef.current?.open({
      title: 'Block User',
      description: `Are you sure you want to block ${other.displayName}? They won't be able to send you messages or see your status.`,
      confirmText: 'Block',
      confirmColor: 'destructive',
      avatar: { uri: other.photoURL, name: other.displayName },
      onConfirm: handleToggleBlock,
    });
  };

  const handleToggleBlock = async () => {
    if (!profile) return;
    const next = !blocked;
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, profile.uid), {
        blockedUsers: next ? FieldValue.arrayUnion(other.uid) : FieldValue.arrayRemove(other.uid),
      });
      Toast.show({
        type: 'info',
        text1: next ? `${other.displayName} is now blocked` : `Unblocked ${other.displayName}`,
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not update block status', text2: 'Please try again.' });
    }
  };

  const handleToggleArchive = async () => {
    if (!profile) return;
    const next = !archived;
    setArchived(next);
    try {
      await updateDoc(doc(db, COLLECTIONS.CHATS, conversation.chatId), {
        archivedFor: next ? FieldValue.arrayUnion(profile.uid) : FieldValue.arrayRemove(profile.uid),
      });
      Toast.show({ type: 'success', text1: next ? 'Chat archived' : 'Chat unarchived' });
    } catch {
      setArchived(!next);
      Toast.show({ type: 'error', text1: 'Could not update chat', text2: 'Please try again.' });
    }
  };

  const handleClearChatRequest = () => {
    confirmSheetRef.current?.open({
      title: 'Clear Chat',
      description: 'This will clear this conversation only for you. Other people will still keep their messages.',
      confirmText: 'Clear',
      confirmColor: 'destructive',
      onConfirm: async () => {
        if (!profile) return;
        setClearing(true);
        try {
          const batch = writeBatch(db);
          const snap = await getDocs(messagesRef('chats', conversation.chatId));
          snap.forEach((d) => {
            const msg = d.data() as MessageDoc;
            if (!msg.deletedFor?.includes(profile.uid)) {
              batch.update(d.ref, { deletedFor: FieldValue.arrayUnion(profile.uid) });
            }
          });
          await batch.commit();
          Toast.show({ type: 'success', text1: 'Chat cleared' });
        } catch {
          Toast.show({ type: 'error', text1: 'Could not clear chat', text2: 'Please try again.' });
        } finally {
          setClearing(false);
        }
      },
    });
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingEnd: 16 }}>
          <CaretLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText weight="bold" style={{ fontSize: 18 }}>
          Contact Info
        </AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Section */}
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Avatar uri={other.photoURL} name={other.displayName} size={106} online={other.status === 'online'} />
          <AppText weight="extrabold" style={{ fontSize: 22, marginTop: 14 }}>
            {other.displayName}
          </AppText>
          <AppText muted style={{ fontSize: 14, marginTop: 4 }}>
            {other.status === 'online' ? '● Active Now' : 'Offline'}
          </AppText>
        </View>

        {/* About Card */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <AppText weight="semibold" muted style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            About
          </AppText>
          <AppText style={{ fontSize: 15, lineHeight: 22 }}>
            {other.bio || 'Hey there! I am using Chatly.'}
          </AppText>
        </View>

        {/* Details List */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, paddingHorizontal: 18, marginBottom: 20 }}>
          {other.email ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <EnvelopeSimple size={20} color={colors.mutedForeground} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <AppText muted style={{ fontSize: 12 }}>Email</AppText>
                <AppText weight="medium" style={{ fontSize: 15, marginTop: 2 }}>{other.email}</AppText>
              </View>
            </View>
          ) : null}

          {other.phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Phone size={20} color={colors.mutedForeground} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <AppText muted style={{ fontSize: 12 }}>Phone</AppText>
                <AppText weight="medium" style={{ fontSize: 15, marginTop: 2 }}>{other.phone}</AppText>
              </View>
            </View>
          ) : null}

          {other.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
              <MapPin size={20} color={colors.mutedForeground} style={{ marginRight: 14 }} />
              <View style={{ flex: 1 }}>
                <AppText muted style={{ fontSize: 12 }}>Location</AppText>
                <AppText weight="medium" style={{ fontSize: 15, marginTop: 2 }}>{other.location}</AppText>
              </View>
            </View>
          ) : null}
        </View>

        {/* Shared Media */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 18, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image size={22} color={colors.primary} style={{ marginRight: 14 }} />
            <AppText weight="semibold" style={{ fontSize: 15 }}>Shared Media & Docs</AppText>
          </View>
          <AppText muted style={{ fontSize: 13 }}>0 items</AppText>
        </View>

        {/* Settings & Actions */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, paddingHorizontal: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <BellSimple size={20} color={colors.foreground} style={{ marginRight: 14 }} />
              <AppText weight="medium" style={{ fontSize: 15 }}>Mute Notifications</AppText>
            </View>
            <Switch value={muted} onValueChange={handleToggleMute} trackColor={{ true: colors.primary }} />
          </View>

          <Pressable
            onPress={handleToggleArchive}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}
          >
            <Archive size={20} color={colors.foreground} style={{ marginRight: 14 }} />
            <AppText weight="medium" style={{ fontSize: 15 }}>{archived ? 'Unarchive Chat' : 'Archive Chat'}</AppText>
          </Pressable>

          <Pressable
            onPress={handleClearChatRequest}
            disabled={clearing}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: clearing ? 0.5 : 1 }}
          >
            <Trash size={20} color={colors.foreground} style={{ marginRight: 14 }} />
            <AppText weight="medium" style={{ fontSize: 15 }}>Clear Chat</AppText>
          </Pressable>

          <Pressable onPress={handleBlockRequest} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
            <Prohibit size={20} color="#ef4444" style={{ marginRight: 14 }} />
            <AppText weight="semibold" style={{ fontSize: 15, color: '#ef4444' }}>
              {blocked ? `Unblock ${other.displayName}` : `Block ${other.displayName}`}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmSheet ref={confirmSheetRef} />
    </Screen>
  );
}
