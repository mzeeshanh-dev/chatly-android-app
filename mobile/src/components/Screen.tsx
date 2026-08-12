import React from 'react';
import { View, StatusBar, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface ScreenProps extends ViewProps {
  edges?: Edge[];
  noPadding?: boolean;
}

/** Consistent themed background + safe area + status bar for every screen. */
export function Screen({ children, style, edges = ['top', 'left', 'right'], noPadding, ...rest }: ScreenProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
        translucent={false}
      />
      <SafeAreaView
        edges={edges}
        style={[{ flex: 1, paddingHorizontal: noPadding ? 0 : 16 }, style]}
        {...rest}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}
