import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
}

function Digit({ char, active }: { char: string; active: boolean }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (char) {
      scale.value = withSpring(1.08, { damping: 8, stiffness: 300 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 260 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.digit,
        {
          backgroundColor: colors.input,
          borderColor: active ? colors.ring : 'transparent',
        },
        style,
      ]}
    >
      <Animated.Text style={[styles.digitText, { color: colors.foreground }]}>{char}</Animated.Text>
    </Animated.View>
  );
}

/** Six boxes visually, backed by one hidden TextInput so the keyboard/paste/autofill just works. */
export function OtpInput({ value, onChange }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const chars = value.padEnd(LENGTH, ' ').split('').slice(0, LENGTH);

  return (
    <View onTouchEnd={() => inputRef.current?.focus()}>
      <View style={styles.row}>
        {chars.map((c, i) => (
          <Digit key={i} char={c.trim()} active={focused && value.length === i} />
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={LENGTH}
        style={styles.hiddenInput}
        autoFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  digit: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: { fontSize: 22, fontFamily: 'Inter-Bold' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
