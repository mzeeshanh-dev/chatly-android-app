import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

const SKELETON_BUBBLES = [
  { sent: false, width: '55%' },
  { sent: true, width: '40%' },
  { sent: false, width: '70%' },
  { sent: false, width: '35%' },
  { sent: true, width: '65%' },
  { sent: true, width: '45%' },
  { sent: false, width: '50%' },
];

export function ChatLoadingSkeleton() {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      {SKELETON_BUBBLES.map((item, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bubbleWrapper,
            { justifyContent: item.sent ? 'flex-end' : 'flex-start' },
          ]}
        >
          <Animated.View
            style={[
              styles.bubble,
              {
                width: item.width as unknown as number,
                backgroundColor: item.sent
                  ? colors.muted + '80'
                  : colors.bubbleReceivedBg,
                borderColor: colors.border,
                borderWidth: item.sent ? 0 : 1,
              },
              animatedStyle,
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginVertical: 6,
  },
  bubble: {
    height: 42,
    borderRadius: 18,
  },
});
