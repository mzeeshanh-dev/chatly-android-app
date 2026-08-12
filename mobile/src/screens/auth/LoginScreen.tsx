import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EnvelopeSimple, LockSimple } from 'phosphor-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from '../../components/AppText';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ChatlyLogo } from '../../components/ChatlyLogo';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection detected. Please check your WiFi or mobile data and try again.';
    default:
      return 'Could not sign in. Please try again.';
  }
}

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // Perform a preliminary check for offline status
      try {
        const netCheck = await fetch('https://www.google.com', { method: 'HEAD' });
        if (netCheck.status < 200 || netCheck.status >= 400) {
          throw new Error('offline');
        }
      } catch {
        setError('No internet connection detected. Please check your WiFi or mobile data and try again.');
        setLoading(false);
        return;
      }

      await login(email.trim(), password);
      // AuthContext's onAuthStateChanged + profile listener drives navigation from here.
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setError(friendlyAuthError(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ marginBottom: 16 }}>
            <ChatlyLogo size={56} />
          </View>
          <AppText weight="extrabold" style={{ fontSize: 24 }}>
            Welcome back
          </AppText>
          <AppText muted style={{ fontSize: 14, marginTop: 4 }}>
            Sign in to keep the conversation going
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
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
            placeholder="••••••••"
            secureTextEntry
            secureToggle
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            icon={<LockSimple size={18} color={colors.mutedForeground} />}
          />

          {error ? (
            <AppText style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</AppText>
          ) : null}

          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
            <AppText weight="medium" style={{ fontSize: 13, color: colors.primary }}>
              Forgot password?
            </AppText>
          </Pressable>

          <PrimaryButton label="Sign In" onPress={handleLogin} loading={loading} disabled={!canSubmit} />

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24 }}>
            <AppText muted style={{ fontSize: 14 }}>
              Don&apos;t have an account?{' '}
            </AppText>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <AppText weight="semibold" style={{ fontSize: 14, color: colors.primary }}>
                Create one
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
