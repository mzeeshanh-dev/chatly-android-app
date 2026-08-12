import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiSlash } from 'phosphor-react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { AppText } from './AppText';

/** Persistent top banner while offline — like WhatsApp's connection strip. Renders nothing when online. */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isOnline) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top,
        left: 0,
        right: 0,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        backgroundColor: '#7f1d1d',
      }}
      pointerEvents="none"
    >
      <WifiSlash size={14} color="#fecaca" weight="bold" />
      <AppText weight="semibold" style={{ fontSize: 12.5, color: '#fecaca' }}>
        No internet connection
      </AppText>
    </View>
  );
}
