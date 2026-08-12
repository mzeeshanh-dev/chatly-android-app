import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { MagnifyingGlass, PaperPlaneRight } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useChatsQuery, useGroupsQuery } from '../hooks/useFirestoreQueries';
import { AppText } from './AppText';
import { Avatar } from './Avatar';
import type { SelectedConversation } from '../types/chat';

export interface ForwardMessageSheetRef {
  open: (text: string) => void;
  close: () => void;
}

interface ForwardProps {
  onForward: (conversation: SelectedConversation, text: string) => void;
}

export const ForwardMessageSheet = forwardRef<ForwardMessageSheetRef, ForwardProps>(({ onForward }, ref) => {
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [textToForward, setTextToForward] = useState('');
  const [search, setSearch] = useState('');

  const { data: chats = [] } = useChatsQuery(profile?.uid);
  const { data: groups = [] } = useGroupsQuery(profile?.uid);

  useImperativeHandle(ref, () => ({
    open: (text) => {
      setTextToForward(text);
      bottomSheetRef.current?.expand();
    },
    close: () => {
      bottomSheetRef.current?.close();
    },
  }));

  const allConversations = useMemo(() => {
    return [...chats, ...groups].filter(c => {
      if (c.type === 'dm' && c.archivedFor?.includes(profile?.uid ?? '')) return false;
      
      const title = c.type === 'dm' ? c.other.displayName : c.name;
      if (search && !title.toLowerCase().includes(search.toLowerCase())) return false;

      return true;
    });
  }, [chats, groups, search, profile?.uid]);

  const handleSelect = (conv: SelectedConversation) => {
    onForward(conv, textToForward);
    bottomSheetRef.current?.close();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['75%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.background, borderRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.6} />
      )}
      onClose={() => {
        setTextToForward('');
        setSearch('');
      }}
    >
      <View style={styles.header}>
        <AppText weight="bold" style={[styles.title, { color: colors.foreground }]}>
          Forward to...
        </AppText>
        <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
          <MagnifyingGlass size={18} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      <BottomSheetFlatList
        data={allConversations}
        keyExtractor={(item) => item.type === 'dm' ? item.chatId : item.groupId}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const title = item.type === 'dm' ? item.other.displayName : item.name;
          const photoURL = item.type === 'dm' ? item.other.photoURL : item.photoURL;

          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.muted },
              ]}
            >
              <Avatar uri={photoURL} name={title} size={44} online={item.type === 'dm' && item.other.status === 'online'} />
              <AppText weight="semibold" style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                {title}
              </AppText>
              <View style={[styles.sendIcon, { backgroundColor: colors.primary }]}>
                <PaperPlaneRight size={16} color="#fff" weight="fill" />
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <AppText muted>No conversations found.</AppText>
          </View>
        }
      />
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    marginLeft: 14,
    marginRight: 12,
  },
  sendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
