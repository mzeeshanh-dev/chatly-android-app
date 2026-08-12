import React, { useEffect } from 'react';
import { View, Modal, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import { X as XIcon } from 'phosphor-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { colorForName } from './Avatar';

const { width } = Dimensions.get('window');

interface ProfilePhotoViewerProps {
  visible: boolean;
  onClose: () => void;
  name: string;
  uri?: string | null;
}

export function ProfilePhotoViewer({ visible, onClose, name, uri }: ProfilePhotoViewerProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 20, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, opacity, scale]);

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.9, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.content, contentStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <AppText weight="bold" style={styles.title} numberOfLines={1}>
              {name}
            </AppText>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <XIcon size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Photo */}
          <View style={styles.photoWrapper}>
            {uri ? (
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            ) : (
              <View style={[styles.fallback, { backgroundColor: colorForName(name || '?') + '26' }]}>
                <AppText weight="bold" style={{ fontSize: width * 0.4, color: colorForName(name || '?') }}>
                  {name?.trim()?.[0]?.toUpperCase() ?? '?'}
                </AppText>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    flex: 1,
  },
  closeBtn: {
    padding: 8,
  },
  photoWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
