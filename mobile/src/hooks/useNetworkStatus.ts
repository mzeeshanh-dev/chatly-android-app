import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Real, event-driven connectivity status via the OS's own network state
 * (instant — no polling). Previously this polled https://google.com every
 * 12s with fetch(), which was slow to detect changes, wasted battery/data,
 * and could misreport "offline" if google.com specifically was blocked.
 *
 * isConnected: device has a network interface up (wifi/cellular associated).
 * isInternetReachable: that interface can actually reach the internet — the
 * one that matters for "can I talk to Firestore/FCM right now."
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can briefly be `null` while still probing — treat
      // that as "assume online" rather than flashing an offline banner for it.
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return { isOnline };
}
