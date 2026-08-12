import React, { useMemo, useState } from 'react';
import { View, Pressable, RefreshControl, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { MagnifyingGlass, Plus, Archive, CaretRight } from 'phosphor-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useChatsQuery } from '../../hooks/useFirestoreQueries';
import { AppText } from '../../components/AppText';
import { ChatRow } from '../../components/ChatRow';
import { ChatRowSkeleton } from '../../components/ChatRowSkeleton';
import { ProfilePhotoViewer } from '../../components/ProfilePhotoViewer';
import { Screen } from '../../components/Screen';
import type { RootStackParamList } from '../../navigation/types';
import type { SelectedConversation } from '../../types/chat';

type Filter = 'all' | 'pending' | 'unread';

const FastList: any = FlashList;

export function ChatsListScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: chats = [], synced, refetch, isRefetching } = useChatsQuery(profile?.uid);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [viewerPhoto, setViewerPhoto] = useState<{ uri: string | null; name: string } | null>(null);
  const fabScale = useSharedValue(1);
  const myUid = profile?.uid ?? '';

  const archivedCount = useMemo(
    () => chats.filter((c): c is Extract<SelectedConversation, { type: 'dm' }> => c.type === 'dm' && Boolean(c.archivedFor?.includes(myUid))).length,
    [chats, myUid]
  );

  const filtered = useMemo(() => {
    return chats.filter((c) => {
      // 1) Archive filtering
      if (c.type === 'dm' && c.archivedFor?.includes(myUid)) return false;

      // 2) Text search
      const nameMatch = c.type === 'dm' ? (c.other.displayName ?? '') : (c.name ?? '');
      const emailMatch = c.type === 'dm' ? (c.other.email ?? '') : '';
      if (search && !nameMatch.toLowerCase().includes(search.toLowerCase()) && !emailMatch.toLowerCase().includes(search.toLowerCase())) return false;

      // 3) Filter pills
      if (filter === 'unread') {
        const unread = c.unreadCount?.[myUid] || 0;
        return unread > 0;
      }
      if (filter === 'pending') {
        return c.type === 'dm' && c.status === 'pending';
      }

      // Default 'all'
      return true;
    });
  }, [chats, search, filter, myUid]);

  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  return (
    <Screen edges={['top', 'left', 'right']} noPadding>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <AppText weight="extrabold" style={{ fontSize: 26, marginBottom: 12 }}>
          Chats
        </AppText>
        <SearchBar value={search} onChange={setSearch} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        {(['all', 'pending', 'unread'] as Filter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filter === f ? colors.primary : colors.secondary,
            }}
          >
            <AppText weight={filter === f ? 'bold' : 'medium'} style={{ color: filter === f ? '#040d0a' : colors.foreground, textTransform: 'capitalize' }}>
              {f}
            </AppText>
          </Pressable>
        ))}
      </View>

      {!synced ? (
        <ChatRowSkeleton />
      ) : filtered.length === 0 && archivedCount === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <AppText weight="semibold" style={{ fontSize: 16, marginBottom: 6 }}>
            {search ? 'No matches' : 'No chats yet'}
          </AppText>
          <AppText muted style={{ fontSize: 13.5, textAlign: 'center' }}>
            {search ? 'Try a different name.' : 'Tap the + button to start a conversation.'}
          </AppText>
        </View>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <FastList
            data={filtered}
            estimatedItemSize={75}
            contentContainerStyle={{ paddingBottom: 90 }}
            keyExtractor={(item: any) => item.chatId}
            ListHeaderComponent={
              archivedCount > 0 ? (
                <Pressable
                  onPress={() => navigation.navigate('ArchivedChats')}
                  style={({ pressed }) => [
                    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.muted },
                  ]}
                >
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                    <Archive size={22} color={colors.mutedForeground} />
                  </View>
                  <AppText weight="semibold" style={{ flex: 1, fontSize: 15, marginLeft: 14 }}>
                    Archived
                  </AppText>
                  <AppText muted style={{ fontSize: 13, marginRight: 6 }}>
                    {archivedCount}
                  </AppText>
                  <CaretRight size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : null
            }
            renderItem={({ item }: { item: any }) => (
              <ChatRow
                name={item.other.displayName}
                photoURL={item.other.photoURL}
                lastMessage={item.lastMessage}
                lastMessageAt={item.lastMessageAt as never}
                unreadCount={item.unreadCount?.[myUid]}
                online={item.other.status === 'online'}
                pending={item.status === 'pending' && item.requestedBy !== profile?.uid}
                onPress={() => navigation.navigate('ChatWindow', { conversation: item })}
                onAvatarPress={() => setViewerPhoto({ uri: item.other.photoURL, name: item.other.displayName })}
              />
            )}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          />
        </View>
      )}

      <Animated.View style={[{ position: 'absolute', right: 20, bottom: 20 }, fabStyle]}>
        <Pressable
          onPressIn={() => (fabScale.value = withSpring(0.9, { damping: 12, stiffness: 300 }))}
          onPressOut={() => (fabScale.value = withSpring(1, { damping: 10, stiffness: 220 }))}
          onPress={() => navigation.navigate('NewChat')}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.primary,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <Plus size={26} color="#fff" weight="bold" />
        </Pressable>
      </Animated.View>

      <ProfilePhotoViewer
        visible={viewerPhoto !== null}
        onClose={() => setViewerPhoto(null)}
        name={viewerPhoto?.name ?? ''}
        uri={viewerPhoto?.uri}
      />
    </Screen>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.input,
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 44,
      }}
    >
      <MagnifyingGlass size={18} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search chats"
        placeholderTextColor={colors.mutedForeground}
        style={{ flex: 1, marginLeft: 10, fontSize: 14, color: colors.foreground, fontFamily: 'Inter-Regular' }}
      />
    </View>
  );
}
