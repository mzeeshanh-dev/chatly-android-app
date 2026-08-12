import React from 'react';
import { View, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Plus } from 'phosphor-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useGroupsQuery } from '../../hooks/useFirestoreQueries';
import { AppText } from '../../components/AppText';
import { ChatRow } from '../../components/ChatRow';
import { ChatRowSkeleton } from '../../components/ChatRowSkeleton';
import { Screen } from '../../components/Screen';
import type { RootStackParamList } from '../../navigation/types';

const FastList: any = FlashList;

export function GroupsListScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { data: groups = [], synced } = useGroupsQuery(profile?.uid);
  const fabScale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));

  return (
    <Screen edges={['top', 'left', 'right']} noPadding>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <AppText weight="extrabold" style={{ fontSize: 26 }}>
          Groups
        </AppText>
      </View>

      {!synced ? (
        <ChatRowSkeleton />
      ) : groups.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <AppText weight="semibold" style={{ fontSize: 16, marginBottom: 6 }}>
            No groups yet
          </AppText>
          <AppText muted style={{ fontSize: 13.5, textAlign: 'center' }}>
            Tap the + button to create a group with your contacts.
          </AppText>
        </View>
      ) : (
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <FastList
            data={groups}
            estimatedItemSize={80}
            contentContainerStyle={{ paddingBottom: 90 }}
            keyExtractor={(item: any) => (item.type === 'group' ? item.groupId : '')}
            renderItem={({ item }: { item: any }) =>
              item.type === 'group' ? (
                <ChatRow
                  name={item.name}
                  photoURL={item.photoURL}
                  lastMessage={item.lastMessage}
                  lastMessageAt={item.lastMessageAt as never}
                  unreadCount={item.unreadCount?.[profile?.uid ?? '']}
                  onPress={() => navigation.navigate('ChatWindow', { conversation: item })}
                />
              ) : null
            }
          />
        </View>
      )}

      <Animated.View style={[{ position: 'absolute', right: 20, bottom: 20 }, fabStyle]}>
        <Pressable
          onPressIn={() => (fabScale.value = withSpring(0.9, { damping: 12, stiffness: 300 }))}
          onPressOut={() => (fabScale.value = withSpring(1, { damping: 10, stiffness: 220 }))}
          onPress={() => navigation.navigate('NewGroup')}
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
    </Screen>
  );
}
