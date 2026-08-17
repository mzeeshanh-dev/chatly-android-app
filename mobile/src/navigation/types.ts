import type { SelectedConversation } from '../types/chat';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  ChatWindow: { conversation: SelectedConversation; highlightMessageId?: string };
  NewChat: undefined;
  NewGroup: undefined;
  GroupSettings: { groupId: string };
  ContactDetail: { conversation: SelectedConversation };
  GroupDetail: { conversation: SelectedConversation };
  ArchivedChats: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: { email: string; displayName: string; password: string };
  ForgotPassword: undefined;
  ResetPassword: { email: string };
};

export type MainTabParamList = {
  ChatsTab: undefined;
  GroupsTab: undefined;
  SettingsTab: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
