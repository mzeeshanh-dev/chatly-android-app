import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../screens/SplashScreen';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { ChatWindowScreen } from '../screens/chat/ChatWindowScreen';
import { NewChatScreen } from '../screens/chat/NewChatScreen';
import { NewGroupScreen } from '../screens/chat/NewGroupScreen';
import { GroupSettingsScreen } from '../screens/chat/GroupSettingsScreen';
import { ContactDetailScreen } from '../screens/chat/ContactDetailScreen';
import { GroupDetailScreen } from '../screens/chat/GroupDetailScreen';
import { ArchivedChatsScreen } from '../screens/chat/ArchivedChatsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Minimum time the animated splash stays up, so it never flashes even when
// Firebase Auth resolves the session instantly on a warm start.
const MIN_SPLASH_MS = 200;

export function RootNavigator() {
  const { user, profile, loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const showSplash = loading || !minTimeElapsed;
  const isAuthenticated = Boolean(user && profile?.isActivated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showSplash ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <Stack.Group>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="ChatWindow"
            component={ChatWindowScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ContactDetail"
            component={ContactDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="GroupDetail"
            component={GroupDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ArchivedChats"
            component={ArchivedChatsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
            <Stack.Screen name="NewChat" component={NewChatScreen} />
            <Stack.Screen name="NewGroup" component={NewGroupScreen} />
            <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
          </Stack.Group>
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
