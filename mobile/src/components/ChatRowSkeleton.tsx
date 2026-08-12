import React, { useEffect } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROW_HEIGHT = 75;

function ShimmerBlock({ style }: { style: any }) {
  const { colors, isDark } = useTheme();
  const translateX = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 1200, easing: Easing.linear }),
      -1,
      false
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const shimmerColors = isDark
    ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
    : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.06)', 'rgba(0,0,0,0)'];

  return (
    <View style={[{ backgroundColor: colors.muted, overflow: 'hidden' }, style]}>
      <AnimatedLinearGradient
        colors={shimmerColors}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { width: SCREEN_WIDTH }, animatedStyle]}
      />
    </View>
  );
}

function SkeletonRow() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <ShimmerBlock style={{ width: 54, height: 54, borderRadius: 27 }} />
      <View style={{ flex: 1, minWidth: 0, marginLeft: 14 }}>
        <ShimmerBlock style={{ width: '55%', height: 14, borderRadius: 7, marginBottom: 8 }} />
        <ShimmerBlock style={{ width: '75%', height: 12, borderRadius: 6 }} />
      </View>
    </View>
  );
}

export function ChatRowSkeleton() {
  const count = Math.max(6, Math.ceil(Dimensions.get('window').height / ROW_HEIGHT));
  return (
    <View style={{ flex: 1 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}
