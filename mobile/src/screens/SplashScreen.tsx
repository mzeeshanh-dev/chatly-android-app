import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Rect, Path, Circle, Defs, LinearGradient as SvgLinearGradient, RadialGradient, Stop } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { AppText } from '../components/AppText';
import { ChatlyLogo } from '../components/ChatlyLogo';

/**
 * Simple by design: no infinite loops, no copy beyond the wordmark. Sequence
 * is logo-first, glow-second — the glow is a separate animated layer that
 * only starts building in once the logo has mostly settled, rather than
 * both fading in together.
 */
export function SplashScreen() {
  const markOpacity = useSharedValue(0);
  const markScale = useSharedValue(0.85);
  const glowOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    markOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    markScale.value = withSpring(1, { damping: 15, stiffness: 180, mass: 0.7 });
    // Glow builds in gradually after the logo has landed, not alongside it.
    glowOpacity.value = withDelay(280, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    titleOpacity.value = withTiming(1, { duration: 260 });
  }, [markOpacity, markScale, glowOpacity, titleOpacity]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));

  return (
    <LinearGradient colors={['#030907', '#081410', '#030907']} style={styles.fill}>
      <View style={styles.center}>
        <View style={styles.markContainer}>
          <Animated.View style={[styles.glowBox, glowStyle]}>
            <Svg width={180} height={180} viewBox="0 0 180 180">
              <Defs>
                <RadialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                  <Stop offset="55%" stopColor="#10b981" stopOpacity={0.22} />
                  <Stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx="90" cy="90" r="90" fill="url(#glow-grad)" />
            </Svg>
          </Animated.View>

          <Animated.View style={[styles.markPlate, markStyle]}>
            <ChatlyLogo size={56} />
          </Animated.View>
        </View>

        <Animated.View style={titleStyle}>
          <AppText weight="extrabold" style={styles.headline}>
            Chatly
          </AppText>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  markContainer: { marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  glowBox: {
    position: 'absolute',
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markPlate: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 30,
    color: '#ffffff',
    letterSpacing: -1,
    textAlign: 'center',
  },
});
