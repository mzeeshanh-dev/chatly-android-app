import React, { useEffect, useState } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { CaretLeft, EnvelopeOpen } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { verifyOtp, resendOtp, ApiError } from '../../lib/api';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

const RESEND_COOLDOWN_S = 30;

export function VerifyOtpScreen({ navigation, route }: Props) {
  const { email, displayName, password } = route.params;
  const { colors } = useTheme();
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email, code);
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Incorrect or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      await resendOtp(email);
      setCooldown(RESEND_COOLDOWN_S);
      setError('A new verification code has been sent!');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginBottom: 12, width: 36 }}>
          <CaretLeft size={22} color={colors.foreground} />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 28, marginTop: 20 }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <EnvelopeOpen size={34} color={colors.primary} weight="duotone" />
          </View>
          <AppText weight="extrabold" style={{ fontSize: 24, textAlign: 'center' }}>
            Verify your email
          </AppText>
          <AppText muted style={{ fontSize: 14.5, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
            Hey {displayName.split(' ')[0]}, we sent a 6-digit code to{'\n'}
            <AppText weight="semibold" style={{ color: colors.foreground }}>
              {email}
            </AppText>
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TextField
            label="Verification Code"
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/[^0-9]/g, ''));
              setError(null);
            }}
            style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 'bold' }}
          />

          {error ? (
            <AppText style={{ color: error.includes('new') ? colors.primary : '#ef4444', fontSize: 13.5, textAlign: 'center', marginBottom: 12 }}>
              {error}
            </AppText>
          ) : null}

          <PrimaryButton
            label="Verify Account"
            onPress={handleVerify}
            loading={loading}
            disabled={code.length < 6}
            style={{ marginTop: 12 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <AppText muted style={{ fontSize: 14 }}>
              Didn&apos;t get the code?{' '}
            </AppText>
            <Pressable onPress={handleResend} disabled={cooldown > 0 || resending}>
              <AppText weight="semibold" style={{ fontSize: 14, color: cooldown > 0 ? colors.mutedForeground : colors.primary }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend code'}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
