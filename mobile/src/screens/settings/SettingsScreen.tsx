import React, { useState } from 'react';
import { View, Pressable, Switch, ScrollView, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, Moon, Sun, BellSimple, SignOut, PencilSimple } from 'phosphor-react-native';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { Screen } from '../../components/Screen';
import { uploadAvatar } from '../../lib/api';
import { updateUser } from '../../lib/firestore';

function SettingsRow({ icon, label, right }: { icon: React.ReactNode; label: string; right: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 32 }}>{icon}</View>
      <AppText weight="medium" style={{ flex: 1, fontSize: 14.5 }}>
        {label}
      </AppText>
      {right}
    </View>
  );
}

export function SettingsScreen() {
  const { colors, isDark, toggle } = useTheme();
  const { profile, logout } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [notifsEnabled, setNotifsEnabled] = useState(profile?.settings?.notificationsEnabled ?? true);

  if (!profile) return null;

  const handlePickAvatar = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
      } as any);
      formData.append('id', profile.uid);
      formData.append('type', 'profile');

      const res = await fetch('https://chatly-stream.vercel.app/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { url, publicId } = await res.json();
      await updateUser(profile.uid, { photoURL: url, photoPublicId: publicId });
      Toast.show({ type: 'success', text1: 'Profile photo updated' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not update photo', text2: 'Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBio = async () => {
    await updateUser(profile.uid, { bio: bio.trim() });
    setEditing(false);
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotifsEnabled(value);
    await updateUser(profile.uid, { settings: { theme: profile.settings?.theme ?? 'dark', notificationsEnabled: value } });
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppText weight="extrabold" style={{ fontSize: 26, marginTop: 8, marginBottom: 20 }}>
          Settings
        </AppText>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Pressable onPress={handlePickAvatar} disabled={uploading}>
            <Avatar uri={profile.photoURL} name={profile.displayName} size={92} />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.background,
              }}
            >
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={14} color="#fff" weight="fill" />}
            </View>
          </Pressable>
          <AppText weight="bold" style={{ fontSize: 18, marginTop: 12 }}>
            {profile.displayName}
          </AppText>
          <AppText muted style={{ fontSize: 13 }}>
            {profile.email}
          </AppText>
        </View>

        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <AppText weight="semibold" muted style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              About
            </AppText>
            <Pressable onPress={() => (editing ? handleSaveBio() : setEditing(true))} hitSlop={8}>
              <PencilSimple size={15} color={colors.primary} />
            </Pressable>
          </View>
          {editing ? (
            <TextField value={bio} onChangeText={setBio} placeholder="Add a short bio" multiline onBlur={handleSaveBio} />
          ) : (
            <AppText style={{ fontSize: 14 }} muted={!bio}>
              {bio || 'No bio yet — tap the pencil to add one.'}
            </AppText>
          )}
        </View>

        <SettingsRow
          icon={isDark ? <Moon size={19} color={colors.foreground} /> : <Sun size={19} color={colors.foreground} />}
          label="Dark theme"
          right={<Switch value={isDark} onValueChange={toggle} trackColor={{ true: colors.primary }} />}
        />
        <SettingsRow
          icon={<BellSimple size={19} color={colors.foreground} />}
          label="Notifications"
          right={<Switch value={notifsEnabled} onValueChange={handleToggleNotifications} trackColor={{ true: colors.primary }} />}
        />

        <Pressable
          onPress={logout}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18, marginTop: 12 }}
        >
          <SignOut size={19} color="#ef4444" />
          <AppText weight="semibold" style={{ color: '#ef4444', fontSize: 14.5 }}>
            Sign out
          </AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
