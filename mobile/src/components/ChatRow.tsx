import React from 'react';
import { View, Pressable } from 'react-native';
import { formatDistanceToNowStrict } from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { Avatar, type PresenceDotColor } from './Avatar';
import type { Timestamp } from '@react-native-firebase/firestore';

interface ChatRowProps {
  name: string;
  photoURL: string | null;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  unreadCount?: number;
  online?: boolean;
  dotColor?: PresenceDotColor;
  pending?: boolean;
  onPress: () => void;
  onAvatarPress?: () => void;
}

export const ChatRow = React.memo(function ChatRow({ name, photoURL, lastMessage, lastMessageAt, unreadCount, online, dotColor, pending, onPress, onAvatarPress }: ChatRowProps) {
  const { colors, isDark } = useTheme();
  const hasUnread = Boolean(unreadCount && unreadCount > 0);

  const formattedTime = lastMessageAt
    ? formatDistanceToNowStrict(lastMessageAt.toDate(), { addSuffix: false })
      .replace(/ seconds?/, 's')
      .replace(/ minutes?/, 'm')
      .replace(/ hours?/, 'h')
      .replace(/ days?/, 'd')
      .replace(/ months?/, 'mo')
      .replace(/ years?/, 'y')
    : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)') : 'transparent',
      })}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Avatar uri={photoURL} name={name} size={54} online={online} dotColor={dotColor} onPress={onAvatarPress} />
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', marginLeft: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <AppText
            weight="bold"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 16, flex: 1, minWidth: 0, letterSpacing: -0.3 }}
          >
            {name}
          </AppText>
          {lastMessageAt ? (
            <AppText
              numberOfLines={1}
              ellipsizeMode="clip"
              style={{ fontSize: 11.5, flexShrink: 0, marginLeft: 10, color: hasUnread ? colors.primary : colors.mutedForeground }}
              weight={hasUnread ? 'bold' : 'medium'}
            >
              {formattedTime}
            </AppText>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText
            numberOfLines={1}
            ellipsizeMode="tail"
            muted={!pending && !hasUnread}
            weight={hasUnread ? 'semibold' : 'regular'}
            style={{
              fontSize: 13.5,
              flex: 1,
              minWidth: 0,
              color: pending ? colors.primary : hasUnread ? colors.foreground : colors.mutedForeground,
              letterSpacing: -0.1,
            }}
          >
            {pending ? 'New message request' : lastMessage || 'No messages yet'}
          </AppText>
          {hasUnread ? (
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                minWidth: 22,
                height: 22,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 7,
                flexShrink: 0,
                marginLeft: 10,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <AppText weight="extrabold" numberOfLines={1} style={{ fontSize: 11, color: '#040d0a' }}>
                {unreadCount! > 99 ? '99+' : unreadCount}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      </View>
    </Pressable>
  );
});
