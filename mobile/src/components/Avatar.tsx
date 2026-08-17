import React, { useEffect, useState } from 'react';
import { View, Image, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

export type PresenceDotColor = 'green' | 'red' | 'yellow';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  /** Overrides the default green online dot — see getPresenceDotColor(). */
  dotColor?: PresenceDotColor;
  onPress?: () => void;
}

const PALETTE = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6'];
const DOT_COLORS: Record<PresenceDotColor, string> = { green: '#10b981', red: '#ef4444', yellow: '#f59e0b' };

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * DM presence dot color. Pending always shows yellow regardless of online
 * status (there's nothing to be "present" about yet); once active, the dot
 * only appears while the other user is online, red taking priority over
 * green when either side has blocked the other.
 */
export function getPresenceDotColor({
  status,
  isBlocked,
  isOnline,
}: {
  status: 'pending' | 'active' | 'rejected';
  isBlocked: boolean;
  isOnline: boolean;
}): PresenceDotColor | null {
  if (status === 'pending') return 'yellow';
  if (status !== 'active' || !isOnline) return null;
  return isBlocked ? 'red' : 'green';
}

export const Avatar = React.memo(function Avatar({ uri, name, size = 44, online, dotColor, onPress }: AvatarProps) {
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
      {dotColor || online ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(12, size * 0.28),
            height: Math.max(12, size * 0.28),
            borderRadius: 999,
            backgroundColor: dotColor ? DOT_COLORS[dotColor] : '#10b981',
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
