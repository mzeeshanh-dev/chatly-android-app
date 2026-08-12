import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CaretLeft, EnvelopeSimple } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from '../../components/AppText';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { forgotOtp, ApiError } from '../../lib/api';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await forgotOtp(email.trim());
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginTop: 4, width: 36 }}>
        <CaretLeft size={22} color={colors.foreground} />
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 28 }}>
          <AppText weight="extrabold" style={{ fontSize: 24 }}>
            Reset your password
          </AppText>
          <AppText muted style={{ fontSize: 14, marginTop: 6 }}>
            Enter your account email and we&apos;ll send a reset code.
          </AppText>
        </Animated.View>

        <TextField
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          icon={<EnvelopeSimple size={18} color={colors.mutedForeground} />}
        />

        {error ? <AppText style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</AppText> : null}

        <PrimaryButton label="Send reset code" onPress={handleSubmit} loading={loading} disabled={email.trim().length < 4 || loading} />
      </View>
    </Screen>
  );
}
