import React from 'react';
import { View, Pressable, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CaretLeft } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useChatsQuery } from '../../hooks/useFirestoreQueries';
import { AppText } from '../../components/AppText';
import { ChatRow } from '../../components/ChatRow';
import { ChatRowSkeleton } from '../../components/ChatRowSkeleton';
import { Screen } from '../../components/Screen';
import { db } from '../../lib/firebase';
import { doc, updateDoc, FieldValue, COLLECTIONS } from '../../lib/firestore';
import type { RootStackParamList } from '../../navigation/types';
import type { SelectedConversation } from '../../types/chat';

const FastList: any = FlashList;

type Props = NativeStackScreenProps<RootStackParamList, 'ArchivedChats'>;

export function ArchivedChatsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { data: chats = [], synced } = useChatsQuery(profile?.uid);

  const archived = chats.filter(
    (c): c is Extract<SelectedConversation, { type: 'dm' }> => c.type === 'dm' && Boolean(c.archivedFor?.includes(profile?.uid ?? ''))
  );

  const handleUnarchive = (chatId: string, name: string) => {
    Alert.alert('Unarchive chat?', `"${name}" will move back to your main chat list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unarchive',
        onPress: () => {
          if (!profile) return;
          updateDoc(doc(db, COLLECTIONS.CHATS, chatId), { archivedFor: FieldValue.arrayRemove(profile.uid) }).catch(() => undefined);
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']} noPadding>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingEnd: 12 }}>
          <CaretLeft size={24} color={colors.foreground} />
        </Pressable>
        <AppText weight="extrabold" style={{ fontSize: 22 }}>
          Archived
        </AppText>
      </View>

      {!synced ? (
        <ChatRowSkeleton />
      ) : archived.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <AppText weight="semibold" style={{ fontSize: 16, marginBottom: 6 }}>
            No archived chats
          </AppText>
          <AppText muted style={{ fontSize: 13.5, textAlign: 'center' }}>
            Chats you archive will show up here.
          </AppText>
        </View>
      ) : (
        <FastList
          data={archived}
          estimatedItemSize={75}
          keyExtractor={(item: any) => item.chatId}
          renderItem={({ item }: { item: Extract<SelectedConversation, { type: 'dm' }> }) => (
            <Pressable onLongPress={() => handleUnarchive(item.chatId, item.other.displayName)}>
              <ChatRow
                name={item.other.displayName}
                photoURL={item.other.photoURL}
                lastMessage={item.lastMessage}
                lastMessageAt={item.lastMessageAt as never}
                unreadCount={item.unreadCount?.[profile?.uid ?? '']}
                online={item.other.status === 'online'}
                pending={item.status === 'pending' && item.requestedBy !== profile?.uid}
                onPress={() => navigation.navigate('ChatWindow', { conversation: item })}
              />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
