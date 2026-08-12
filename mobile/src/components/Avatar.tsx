import React, { useEffect, useState } from 'react';
import { View, Image, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  onPress?: () => void;
}

const PALETTE = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export const Avatar = React.memo(function Avatar({ uri, name, size = 44, online, onPress }: AvatarProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';

  // Avatar instances get recycled across list items (FlashList/FlatList) —
  // reset the broken-image fallback whenever the uri actually changes so a
  // dead link on one user doesn't stick around after the component is
  // reused for a different user with a working photo.
  useEffect(() => setFailed(false), [uri]);

  const content = (
    <View style={{ width: size, height: size }}>
      {uri && !failed ? (
        <Image source={{ uri }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colorForName(name || '?') + '26',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText weight="bold" style={{ fontSize: size * 0.4, color: colorForName(name || '?') }}>
            {initial}
          </AppText>
        </View>
      )}
      {online ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(12, size * 0.28),
            height: Math.max(12, size * 0.28),
            borderRadius: 999,
            backgroundColor: '#10b981',
            borderWidth: 2,
            borderColor: colors.background,
            zIndex: 10,
          }}
        />
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
});
