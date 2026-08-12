import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extrabold: 'Inter-ExtraBold',
} as const;

interface AppTextProps extends TextProps {
  weight?: keyof typeof FONTS;
  color?: string;
  muted?: boolean;
}

/** Default Text component for the app — bakes in the Inter family (no synthetic bolding) and theme color. */
export function AppText({ weight = 'regular', color, muted, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        { fontFamily: FONTS[weight], color: color ?? (muted ? colors.mutedForeground : colors.foreground) },
        style,
      ]}
      {...rest}
    />
  );
}
