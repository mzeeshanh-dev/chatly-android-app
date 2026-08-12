import React, { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: ReactNode;
  /**
   * Rendered instead of the default full-screen recovery UI when set.
   * Pass `null` for boundaries around non-critical overlays (e.g. toasts)
   * where the right behavior on error is to silently drop that overlay
   * rather than block the rest of the app.
   */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort safety net around the whole app. Without this, any uncaught
 * render/effect error in a descendant crashes the entire native process in a
 * release build (no red box there) — the user just sees "Chatly keeps
 * stopping". This turns that into a recoverable screen instead.
 *
 * Deliberately doesn't use useTheme/AppText — it must still render if theming
 * or font setup itself is what threw.
 *
 * Note: react-native's <Modal> (used by react-native-toast-message) mounts a
 * separate render root on Android, so a boundary around the main app tree
 * does NOT protect content inside a Modal — wrap that content with its own
 * <ErrorBoundary fallback={null}> instead (see App.tsx).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('Unhandled error caught by ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <View style={{ flex: 1, backgroundColor: '#030907', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#8e9e97', fontSize: 13.5, textAlign: 'center', marginBottom: 24 }}>
            Chatly hit an unexpected error. You can try again below.
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
