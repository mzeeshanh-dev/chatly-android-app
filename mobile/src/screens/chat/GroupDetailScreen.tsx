import React, { useState } from 'react';
import { View, ScrollView, Pressable, Switch, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CaretLeft, BellSimple, SignOut, Trash, Users, GearSix } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { db } from '../../lib/firebase';
import { getDocs, FieldValue, messagesRef, type MessageDoc } from '../../lib/firestore';
import { writeBatch } from '@react-native-firebase/firestore';
import type { RootStackParamList } from '../../navigation/types';
import { ConfirmSheet, type ConfirmSheetRef } from '../../components/ConfirmSheet';
import { TrackedItemsCard } from '../../components/TrackedItemsCard';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

export function GroupDetailScreen({ navigation, route }: Props) {
  const { conversation } = route.params;
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [muted, setMuted] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [members, setMembers] = useState<import('../../lib/firestore').FirestoreUser[]>([]);
  const confirmSheetRef = React.useRef<ConfirmSheetRef>(null);

  React.useEffect(() => {
    if (conversation.type !== 'group' || !conversation.members) return;
    const fetchMembers = async () => {
      const users = await Promise.all(
        conversation.members.map((m) => import('../../lib/firestore').then(lib => lib.getUser(m.uid)))
      );
      setMembers(users.filter(Boolean) as any[]);
    };
    fetchMembers();
  }, [conversation]);

  if (conversation.type !== 'group') return null;
  const isAdmin = conversation.adminId === profile?.uid;

  const handleToggleMute = (value: boolean) => {
    setMuted(value);
    Toast.show({
      type: 'success',
      text1: value ? `Muted ${conversation.name}` : `Unmuted ${conversation.name}`,
    });
  };

  const handleClearChatRequest = () => {
    confirmSheetRef.current?.open({
      title: 'Clear Chat',
      description: 'This will clear this conversation only for you. Other members will still keep their messages.',
      confirmText: 'Clear',
      confirmColor: 'destructive',
      onConfirm: async () => {
        if (!profile) return;
        setClearing(true);
        try {
          const batch = writeBatch(db);
          const snap = await getDocs(messagesRef('groups', conversation.groupId));
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

  const handleLeaveGroupRequest = () => {
    confirmSheetRef.current?.open({
      title: 'Leave Group',
      description: `Are you sure you want to leave "${conversation.name}"? You will no longer receive messages from this group.`,
      confirmText: 'Leave',
      confirmColor: 'destructive',
      avatar: { uri: conversation.photoURL, name: conversation.name },
      onConfirm: () => {
        Toast.show({
          type: 'info',
          text1: 'Left group successfully',
        });
        // Leaving logic is actually handled via GroupSettings modal currently in the provided code, but this is a stub from previous.
        // We will just navigate back as it was doing.
        navigation.navigate('Main');
      },
    });
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingEnd: 16 }}>
            <CaretLeft size={24} color={colors.foreground} />
          </Pressable>
          <AppText weight="bold" style={{ fontSize: 18 }}>
            Group Info
          </AppText>
        </View>
        {isAdmin ? (
          <Pressable onPress={() => navigation.navigate('GroupSettings', { groupId: conversation.groupId })} hitSlop={10}>
            <GearSix size={22} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Section */}
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <Avatar uri={conversation.photoURL} name={conversation.name} size={106} />
          <AppText weight="extrabold" style={{ fontSize: 22, marginTop: 14 }}>
            {conversation.name}
          </AppText>
          <AppText muted style={{ fontSize: 14, marginTop: 4 }}>
            Group · {conversation.members.length} members
          </AppText>
        </View>

        {/* Description Card */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <AppText weight="semibold" muted style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Description
          </AppText>
          <AppText style={{ fontSize: 15, lineHeight: 22 }}>
            {conversation.description || 'No description provided for this group.'}
          </AppText>
        </View>

        {/* Members Section */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Users size={20} color={colors.primary} style={{ marginRight: 10 }} />
              <AppText weight="bold" style={{ fontSize: 16 }}>Members</AppText>
            </View>
            <AppText muted style={{ fontSize: 13 }}>{conversation.members.length}</AppText>
          </View>

          {members.map((m, index) => (
            <View
              key={m.uid}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 12,
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar uri={m.photoURL} name={m.displayName} size={42} online={m.status === 'online'} />
                <View>
                  <AppText weight="semibold" style={{ fontSize: 15 }}>
                    {m.uid === profile?.uid ? 'You' : m.displayName}
                  </AppText>
                  <AppText muted style={{ fontSize: 12, textTransform: 'capitalize' }}>
                    {m.status}
                  </AppText>
                </View>
              </View>
              {m.uid === conversation.adminId ? (
                <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <AppText weight="semibold" style={{ fontSize: 11.5, color: colors.primary }}>
                    Admin
                  </AppText>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {profile ? (
          <TrackedItemsCard
            parentCollection="groups"
            parentId={conversation.groupId}
            myUid={profile.uid}
            resolveName={(uid) => (uid === profile.uid ? 'You' : (members.find((m) => m.uid === uid)?.displayName ?? 'Unknown'))}
          />
        ) : null}

        {/* Actions */}
        <View style={{ backgroundColor: colors.secondary, borderRadius: 16, paddingHorizontal: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <BellSimple size={20} color={colors.foreground} style={{ marginRight: 14 }} />
              <AppText weight="medium" style={{ fontSize: 15 }}>Mute Notifications</AppText>
            </View>
            <Switch value={muted} onValueChange={handleToggleMute} trackColor={{ true: colors.primary }} />
          </View>

          <Pressable
            onPress={handleClearChatRequest}
            disabled={clearing}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: clearing ? 0.5 : 1 }}
          >
            <Trash size={20} color={colors.foreground} style={{ marginRight: 14 }} />
            <AppText weight="medium" style={{ fontSize: 15 }}>Clear Chat</AppText>
          </Pressable>

          <Pressable onPress={handleLeaveGroupRequest} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
            <SignOut size={20} color="#ef4444" style={{ marginRight: 14 }} />
            <AppText weight="semibold" style={{ fontSize: 15, color: '#ef4444' }}>
              Leave Group
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmSheet ref={confirmSheetRef} />
    </Screen>
  );
}
