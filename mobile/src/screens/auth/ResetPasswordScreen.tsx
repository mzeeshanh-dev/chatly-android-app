import React from 'react';
import { View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CaretLeft, EnvelopeSimple } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { colors } = useTheme();

  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ marginTop: 4, width: 36 }}>
        <CaretLeft size={22} color={colors.foreground} />
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 8 }}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <EnvelopeSimple size={34} color={colors.primary} weight="duotone" />
          </View>
          <AppText weight="extrabold" style={{ fontSize: 24, textAlign: 'center' }}>
            Check your inbox
          </AppText>
          <AppText muted style={{ fontSize: 14.5, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
            We have sent a secure password reset link to{'\n'}
            <AppText weight="semibold" style={{ color: colors.foreground }}>
              {email}
            </AppText>
            {'\n'}Click the link in your email to choose a new password, then return here to sign in.
          </AppText>
        </Animated.View>

        <PrimaryButton
          label="Back to sign in"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
          style={{ width: '100%', marginTop: 12 }}
        />
      </View>
    </Screen>
  );
}
