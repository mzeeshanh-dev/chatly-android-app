import React, { useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MagnifyingGlass, X as XIcon } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUsersQuery } from '../../hooks/useFirestoreQueries';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { ChatRowSkeleton } from '../../components/ChatRowSkeleton';
import { chatRef, getDMChatId, getDoc, setDoc, FieldValue, type FirestoreUser } from '../../lib/firestore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewChat'>;

export function NewChatScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { data: users = [], isLoading } = useUsersQuery(profile?.uid);
  const [search, setSearch] = useState('');
  const [startingUid, setStartingUid] = useState<string | null>(null);

  const filtered = users.filter((u) => u.displayName?.toLowerCase().includes(search.trim().toLowerCase()));

  const handleSelect = async (other: FirestoreUser) => {
    if (!profile) return;
    setStartingUid(other.uid);
    try {
      const chatId = getDMChatId(profile.uid, other.uid);
      const ref = chatRef(chatId);
      const existing = await getDoc(ref);

      if (!existing.exists()) {
        await setDoc(ref, {
          participants: [profile.uid, other.uid],
          status: 'pending',
          requestedBy: profile.uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      navigation.replace('ChatWindow', {
        conversation: {
          type: 'dm',
          chatId,
          other,
          participants: [profile.uid, other.uid],
          status: existing.exists() ? (existing.data() as { status: 'pending' | 'active' | 'rejected' }).status : 'pending',
          requestedBy: existing.exists() ? (existing.data() as { requestedBy: string }).requestedBy : profile.uid,
        },
      });
    } finally {
      setStartingUid(null);
    }
  };

  return (
    <Screen noPadding>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 }}>
        <AppText weight="extrabold" style={{ fontSize: 22 }}>
          New chat
        </AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
          <XIcon size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, borderRadius: 14, paddingHorizontal: 14, height: 44 }}>
          <MagnifyingGlass size={18} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people"
            placeholderTextColor={colors.mutedForeground}
            style={{ flex: 1, marginLeft: 10, fontSize: 14, color: colors.foreground, fontFamily: 'Inter-Regular' }}
          />
        </View>
      </View>

      {isLoading ? (
        <ChatRowSkeleton />
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <AppText muted style={{ fontSize: 13.5, textAlign: 'center' }}>
            No one matches that search yet.
          </AppText>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(u) => u.uid}
          // @ts-expect-error React 19 typings issue with FlashList
          estimatedItemSize={66}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              disabled={startingUid !== null}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.muted : 'transparent',
              })}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}>
                <Avatar uri={item.photoURL} name={item.displayName} size={46} online={item.status === 'online'} />
              <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                <AppText weight="semibold" numberOfLines={1} style={{ fontSize: 15 }}>
                  {item.displayName}
                </AppText>
                <AppText muted style={{ fontSize: 12.5 }} numberOfLines={1}>
                  {item.bio || item.email}
                </AppText>
              </View>
            </View>
          </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
