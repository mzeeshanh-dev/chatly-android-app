import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { X as XIcon, ShareNetwork, Trash, TagSimple } from 'phosphor-react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from './AppText';

interface MessageActionBarProps {
  visible: boolean;
  onClose: () => void;
  onForward: () => void;
  onDelete: () => void;
  onTag: () => void;
  isSender: boolean;
  selectedCount?: number;
}

export function MessageActionBar({ visible, onClose, onForward, onDelete, onTag, isSender, selectedCount = 1 }: MessageActionBarProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-60, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.container, { backgroundColor: colors.primary }, animatedStyle]}>
      <View style={styles.content}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.iconBtn}>
          <XIcon size={24} color="#fff" />
        </Pressable>
        <AppText weight="bold" style={styles.title}>
          {selectedCount} Selected
        </AppText>
        <View style={styles.actions}>
          {selectedCount === 1 ? (
            <Pressable onPress={onTag} hitSlop={12} style={styles.iconBtn}>
              <TagSimple size={24} color="#fff" weight="fill" />
            </Pressable>
          ) : null}
          <Pressable onPress={onForward} hitSlop={12} style={styles.iconBtn}>
            <ShareNetwork size={24} color="#fff" weight="fill" />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={12} style={styles.iconBtn}>
            <Trash size={24} color="#fff" weight="fill" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 16,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
});
