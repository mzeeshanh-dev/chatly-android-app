import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EnvelopeSimple, LockSimple, User } from 'phosphor-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { CaretLeft } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from '../../components/AppText';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { register, ApiError } from '../../lib/api';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = displayName.trim().length > 0 && email.trim().length > 3 && password.length >= 6 && !loading;

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), displayName.trim(), password);
      navigation.navigate('VerifyOtp', { email: email.trim(), displayName: displayName.trim(), password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 12 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginBottom: 12, width: 36 }}>
          <CaretLeft size={22} color={colors.foreground} />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 28 }}>
          <AppText weight="extrabold" style={{ fontSize: 24 }}>
            Create your account
          </AppText>
          <AppText muted style={{ fontSize: 14, marginTop: 4 }}>
            Join Chatly — real-time messaging, zero-trust security
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <TextField
            label="Full name"
            placeholder="Jordan Lee"
            autoCapitalize="words"
            value={displayName}
            onChangeText={setDisplayName}
            icon={<User size={18} color={colors.mutedForeground} />}
          />
          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            icon={<EnvelopeSimple size={18} color={colors.mutedForeground} />}
          />
          <TextField
            label="Password"
            placeholder="At least 6 characters"
            secureTextEntry
            secureToggle
            value={password}
            onChangeText={setPassword}
            icon={<LockSimple size={18} color={colors.mutedForeground} />}
          />

          {error ? <AppText style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</AppText> : null}

          <PrimaryButton label="Continue" onPress={handleRegister} loading={loading} disabled={!canSubmit} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <AppText muted style={{ fontSize: 14 }}>
              Already have an account?{' '}
            </AppText>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <AppText weight="semibold" style={{ fontSize: 14, color: colors.primary }}>
                Sign in
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
