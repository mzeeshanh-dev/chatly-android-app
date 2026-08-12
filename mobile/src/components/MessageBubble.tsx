import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { CheckCircle } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';
import { TickIcon } from './TickIcon';
import { sharedColors } from '../theme/tokens';

interface MessageBubbleProps {
  text: string;
  sent: boolean;
  time: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read';
  type?: 'text' | 'system';
  senderName?: string;
  showSenderName?: boolean;
  forwarded?: boolean;
  edited?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
}

export const MessageBubble = React.memo(function MessageBubble({
  text,
  sent,
  time,
  status,
  type,
  senderName,
  showSenderName,
  forwarded,
  edited,
  selected,
  selectionMode,
  onLongPress,
  onPress,
}: MessageBubbleProps) {
  const { colors } = useTheme();

  if (type === 'system') {
    return (
      <View style={{ alignItems: 'center', marginVertical: 12, paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: colors.muted, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <AppText muted style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {text}
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18).mass(0.6)}
      style={{ flexDirection: 'row', justifyContent: sent ? 'flex-end' : 'flex-start', paddingHorizontal: 12, marginVertical: 2 }}
    >
      <Pressable onLongPress={onLongPress} onPress={onPress} style={{ maxWidth: '82%' }}>
        <View
          style={[
            {
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 18,
              position: 'relative',
            },
            sent
              ? { backgroundColor: sharedColors.bubbleSent, borderBottomRightRadius: 4 }
              : {
                  backgroundColor: colors.bubbleReceivedBg,
                  borderWidth: 1,
                  borderColor: colors.bubbleReceivedBorder,
                  borderBottomLeftRadius: 4,
                },
            selected && { borderWidth: 2, borderColor: '#10b981' },
            selectionMode && !selected && { opacity: 0.7 },
          ]}
        >
          {selected ? (
            <View
              style={{
                position: 'absolute',
                top: -8,
                [sent ? 'left' : 'right']: -8,
                backgroundColor: '#10b981',
                borderRadius: 999,
                width: 18,
                height: 18,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={13} weight="fill" color="#fff" />
            </View>
          ) : null}

          {showSenderName && senderName ? (
            <AppText weight="bold" style={{ fontSize: 11, color: '#10b981', marginBottom: 2 }}>
              {senderName}
            </AppText>
          ) : null}

          {forwarded ? (
            <AppText style={{ fontSize: 10.5, fontStyle: 'italic', opacity: 0.6, color: sent ? '#fff' : colors.mutedForeground, marginBottom: 2 }}>
              Forwarded
            </AppText>
          ) : null}

          <AppText style={{ fontSize: 15, lineHeight: 20, color: sent ? '#ffffff' : colors.bubbleReceivedText }}>
            {text}
          </AppText>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 5 }}>
            {edited ? (
              <AppText style={{ fontSize: 10, opacity: 0.6, color: sent ? '#fff' : colors.mutedForeground }}>Edited</AppText>
            ) : null}
            <AppText style={{ fontSize: 10.5, opacity: 0.7, color: sent ? '#fff' : colors.mutedForeground }}>{time}</AppText>
            {sent ? <TickIcon status={status} /> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});
