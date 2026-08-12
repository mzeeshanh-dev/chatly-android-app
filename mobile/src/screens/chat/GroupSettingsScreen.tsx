import React, { useEffect, useState, useRef } from 'react';
import { View, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X as XIcon, SignOut, Crown } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Screen } from '../../components/Screen';
import { ConfirmSheet, type ConfirmSheetRef } from '../../components/ConfirmSheet';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { onSnapshot, updateDoc, getUser, FieldValue, groupRef, type FirestoreUser, type GroupDoc } from '../../lib/firestore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupSettings'>;

export function GroupSettingsScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [members, setMembers] = useState<FirestoreUser[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const confirmSheetRef = useRef<ConfirmSheetRef>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(groupRef(groupId), (snap) => {
      setGroup(snap.exists() ? (snap.data() as GroupDoc) : null);
    });
    return unsubscribe;
  }, [groupId]);

  useEffect(() => {
    if (!group) return;
    Promise.all(group.memberIds.map((uid) => getUser(uid))).then((results) => {
      setMembers(results.filter(Boolean) as FirestoreUser[]);
    });
    if (!isEditing && !newName) {
      setNewName(group.name);
      setNewDesc(group.description || '');
    }
  }, [group, isEditing]);

  if (!group || !profile) return null;

  const isAdmin = group.adminId === profile.uid;

  const handleLeave = () => {
    confirmSheetRef.current?.open({
      title: 'Leave Group',
      description: `Leave "${group.name}"? You won't receive new messages.`,
      confirmText: 'Leave',
      confirmColor: 'destructive',
      onConfirm: async () => {
        await updateDoc(groupRef(groupId), {
          memberIds: FieldValue.arrayRemove(profile.uid),
          members: group.members.filter((m) => m.uid !== profile.uid),
        });
        navigation.getParent()?.goBack();
        navigation.goBack();
      },
    });
  };

  const handlePickImage = async () => {
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
      formData.append('id', groupId);
      formData.append('type', 'group');

      const res = await fetch('https://chatly-stream.vercel.app/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const { url, publicId } = await res.json();
      await updateDoc(groupRef(groupId), { photoURL: url, photoPublicId: publicId });
      Toast.show({ type: 'success', text1: 'Group photo updated' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to upload photo' });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveInfo = async () => {
    await updateDoc(groupRef(groupId), {
      name: newName.trim(),
      description: newDesc.trim(),
    });
    setIsEditing(false);
    Toast.show({ type: 'success', text1: 'Group info updated' });
  };

  return (
    <Screen noPadding>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 }}>
        <AppText weight="extrabold" style={{ fontSize: 20 }}>
          {isEditing ? 'Edit Info' : 'Group info'}
        </AppText>
        {isEditing ? (
          <Pressable onPress={handleSaveInfo} style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <AppText weight="bold" style={{ color: '#fff', fontSize: 13 }}>Save</AppText>
          </Pressable>
        ) : (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
            <XIcon size={16} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ position: 'relative' }}>
            <Avatar uri={group.photoURL} name={group.name} size={84} />
            {isAdmin && !isEditing ? (
              <Pressable
                onPress={handlePickImage}
                disabled={uploading}
                style={{ position: 'absolute', bottom: 0, right: -4, backgroundColor: colors.primary, padding: 6, borderRadius: 12, opacity: uploading ? 0.5 : 1 }}
              >
                <AppText weight="bold" style={{ color: '#fff', fontSize: 10 }}>EDIT</AppText>
              </Pressable>
            ) : null}
          </View>
          
          {isEditing ? (
            <View style={{ width: '100%', marginTop: 20, gap: 12 }}>
              <View style={{ backgroundColor: colors.input, borderRadius: 12, padding: 12 }}>
                <AppText muted style={{ fontSize: 11, marginBottom: 4 }}>Group Name</AppText>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  style={{ color: colors.foreground, fontSize: 16, fontFamily: 'Inter-Medium' }}
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ backgroundColor: colors.input, borderRadius: 12, padding: 12 }}>
                <AppText muted style={{ fontSize: 11, marginBottom: 4 }}>Description</AppText>
                <TextInput
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                  style={{ color: colors.foreground, fontSize: 15, fontFamily: 'Inter-Regular', minHeight: 60 }}
                  placeholderTextColor={colors.mutedForeground}
                  placeholder="Add a description"
                />
              </View>
              <Pressable onPress={() => setIsEditing(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <AppText style={{ color: colors.primary }}>Cancel</AppText>
              </Pressable>
            </View>
          ) : (
            <>
              <AppText weight="bold" style={{ fontSize: 19, marginTop: 14 }}>
                {group.name}
              </AppText>
              {group.description ? (
                <AppText muted style={{ fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                  {group.description}
                </AppText>
              ) : null}
              <AppText muted style={{ fontSize: 12, marginTop: 6 }}>
                {group.memberIds.length} members {isAdmin ? '· You are the admin' : ''}
              </AppText>
              {isAdmin ? (
                <Pressable onPress={() => setIsEditing(true)} style={{ marginTop: 12 }}>
                  <AppText weight="semibold" style={{ color: colors.primary, fontSize: 13 }}>Edit Info</AppText>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <AppText weight="semibold" muted style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          Members
        </AppText>
        {members.map((m) => (
          <View key={m.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <Avatar uri={m.photoURL} name={m.displayName} size={40} online={m.status === 'online'} />
            <AppText weight="medium" style={{ flex: 1, fontSize: 14.5 }}>
              {m.uid === profile.uid ? `${m.displayName} (you)` : m.displayName}
            </AppText>
            {m.uid === group.adminId ? <Crown size={16} color={colors.primary} weight="fill" /> : null}
          </View>
        ))}

        <Pressable onPress={handleLeave} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18, marginTop: 16 }}>
          <SignOut size={18} color="#ef4444" />
          <AppText weight="semibold" style={{ color: '#ef4444', fontSize: 14.5 }}>
            Leave group
          </AppText>
        </Pressable>
      </ScrollView>

      <ConfirmSheet ref={confirmSheetRef} />
    </Screen>
  );
}
