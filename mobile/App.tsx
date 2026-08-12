/**
 * Chatly — Android chat app
 * @format
 */
import './global.css';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/ToastConfig';
import { queryClient } from './src/lib/queryClient';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { setupPushHandlers } from './src/lib/notifications';
import { useUnreadBadge } from './src/hooks/useUnreadBadge';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';

// Note: there's no global default-font mechanism here on purpose. React 19
// dropped `defaultProps` support for function components, and RN's <Text> is
// one — setting Text.defaultProps silently no-ops. Every <Text> in this app
// goes through <AppText> (src/components/AppText.tsx), which sets the Inter
// family explicitly per weight; every raw <TextInput> sets fontFamily inline.

function ThemedNavigation() {
  const { colors, isDark } = useTheme();
  const { profile } = useAuth();
  const uidRef = useRef<string | undefined>(profile?.uid);
  uidRef.current = profile?.uid;

  // Set up once — reads the latest uid via the ref rather than resubscribing on every login/logout.
  useEffect(() => {
    return setupPushHandlers(() => uidRef.current);
  }, []);

  // App-icon badge — live total unread count across all chats + groups.
  useUnreadBadge(profile?.uid);

  const navigationTheme: Theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.secondary,
      text: colors.foreground,
      border: colors.border,
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <OfflineBanner />
    </View>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <ThemedNavigation />
              </AuthProvider>
              {/* Must stay inside ThemeProvider: every toast renders <AppText>, which calls
                  useTheme(). Rendered here (outside SafeAreaProvider's <ThemeProvider>
                  subtree previously) it crashed on the very first toast in release builds —
                  debug only showed a recoverable LogBox, so it went unnoticed until release.
                  Also locally boundary-wrapped: react-native-toast-message renders through
                  <Modal>, which mounts a separate root on Android that the outer app-level
                  ErrorBoundary can't reach — a future error here should drop the toast, not
                  take down the app. */}
              <ErrorBoundary fallback={null}>
                <Toast config={toastConfig} />
              </ErrorBoundary>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

export default App;
