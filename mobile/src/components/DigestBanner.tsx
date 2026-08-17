import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Sparkle, X as XIcon } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface DigestBannerProps {
  unreadCount: number;
  openQuestionsCount?: number;
  pendingTasksCount?: number;
  pendingDecisionsCount?: number;
  onDismiss: () => void;
}

/**
 * Non-AI "while you were away" summary — every number here is a plain count
 * already tracked on the parent chat/group doc (unreadCount, and the
 * denormalized openQuestionsCount/pendingTasksCount/pendingDecisionsCount
 * maintained by functions/src/functions/tags.ts). No AI, no extra reads.
 */
export function DigestBanner({ unreadCount, openQuestionsCount = 0, pendingTasksCount = 0, pendingDecisionsCount = 0, onDismiss }: DigestBannerProps) {
  const { colors } = useTheme();

  const parts = [`${unreadCount} new message${unreadCount === 1 ? '' : 's'}`];
  if (openQuestionsCount > 0) parts.push(`${openQuestionsCount} open question${openQuestionsCount === 1 ? '' : 's'}`);
  if (pendingTasksCount > 0) parts.push(`${pendingTasksCount} task${pendingTasksCount === 1 ? '' : 's'}`);
  if (pendingDecisionsCount > 0) parts.push(`${pendingDecisionsCount} decision${pendingDecisionsCount === 1 ? '' : 's'}`);

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: colors.secondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Sparkle size={18} color={colors.primary} weight="fill" />
      <View style={{ flex: 1 }}>
        <AppText weight="semibold" style={{ fontSize: 12.5 }}>
          While you were away
        </AppText>
        <AppText muted style={{ fontSize: 12 }} numberOfLines={1}>
          {parts.join(' · ')}
        </AppText>
      </View>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <XIcon size={14} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}
