import React from 'react';
import { View, Pressable, Platform, Dimensions } from 'react-native';
import type { ToastConfig } from 'react-native-toast-message';
import { AppText } from './AppText';
import { Avatar } from './Avatar';

const { width } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(width - 32, 400);

export const toastConfig: ToastConfig = {
  info: ({ text1, text2, props, onPress }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: TOAST_WIDTH,
          backgroundColor: '#18181b', // Zinc 900
          borderRadius: 16,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderWidth: 1,
          borderColor: '#27272a', // Zinc 800
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 10,
          marginTop: Platform.OS === 'android' ? 10 : 0,
        },
        pressed && { backgroundColor: '#27272a' },
      ]}
    >
      {props.avatar ? (
        <Avatar uri={props.avatar} name={text1 ?? 'User'} size={40} />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3f3f46', alignItems: 'center', justifyContent: 'center' }}>
          <AppText weight="bold" style={{ color: '#fff', fontSize: 16 }}>
            {text1?.charAt(0)?.toUpperCase() ?? '?'}
          </AppText>
        </View>
      )}
      <View style={{ marginLeft: 12, flex: 1 }}>
        <AppText weight="bold" style={{ color: '#fafafa', fontSize: 15, marginBottom: 2 }}>
          {text1}
        </AppText>
        <AppText style={{ color: '#a1a1aa', fontSize: 14 }} numberOfLines={2}>
          {text2}
        </AppText>
      </View>
    </Pressable>
  ),
  success: ({ text1, text2 }) => (
    <View style={{
      width: TOAST_WIDTH,
      backgroundColor: '#064e3b',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#047857',
    }}>
      <AppText weight="bold" style={{ color: '#fff', fontSize: 14 }}>{text1}</AppText>
      {text2 ? <AppText style={{ color: '#a7f3d0', fontSize: 13, marginTop: 4 }}>{text2}</AppText> : null}
    </View>
  ),
  error: ({ text1, text2 }) => (
    <View style={{
      width: TOAST_WIDTH,
      backgroundColor: '#7f1d1d',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#b91c1c',
    }}>
      <AppText weight="bold" style={{ color: '#fff', fontSize: 14 }}>{text1}</AppText>
      {text2 ? <AppText style={{ color: '#fecaca', fontSize: 13, marginTop: 4 }}>{text2}</AppText> : null}
    </View>
  ),
};
