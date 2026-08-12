import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChatCircle, UsersThree, GearSix } from 'phosphor-react-native';
import type { MainTabParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { AppText } from '../components/AppText';
import { ChatsListScreen } from '../screens/chat/ChatsListScreen';
import { GroupsListScreen } from '../screens/chat/GroupsListScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.secondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabel: ({ focused, children }) => (
          <AppText
            weight={focused ? 'semibold' : 'medium'}
            style={{ fontSize: 11, color: focused ? colors.primary : colors.mutedForeground }}
          >
            {children}
          </AppText>
        ),
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatsListScreen}
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, focused }) => <ChatCircle size={24} color={color} weight={focused ? 'fill' : 'regular'} style={{ marginBottom: 4 }} />,
        }}
      />
      <Tab.Screen
        name="GroupsTab"
        component={GroupsListScreen}
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => <UsersThree size={24} color={color} weight={focused ? 'fill' : 'regular'} style={{ marginBottom: 4 }} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <GearSix size={24} color={color} weight={focused ? 'fill' : 'regular'} style={{ marginBottom: 4 }} />,
        }}
      />
    </Tab.Navigator>
  );
}
