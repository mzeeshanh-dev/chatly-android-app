import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X as XIcon, Check } from 'phosphor-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useUsersQuery } from '../../hooks/useFirestoreQueries';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { collection, doc, setDoc, FieldValue } from '../../lib/firestore';
import { db } from '../../lib/firebase';
import { COLLECTIONS } from '../../lib/firestore';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'NewGroup'>;

export function NewGroupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const { data: users = [] } = useUsersQuery(profile?.uid);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const canCreate = name.trim().length > 0 && selected.size > 0 && !creating;

  const handleCreate = async () => {
    if (!profile || !canCreate) return;
    setCreating(true);
    try {
      const memberIds = [profile.uid, ...Array.from(selected)];
      const ref = doc(collection(db, COLLECTIONS.GROUPS));
      await setDoc(ref, {
        name: name.trim(),
        description: description.trim(),
        photoURL: null,
        adminId: profile.uid,
        memberIds,
        members: memberIds.map((uid) => ({ uid, status: 'accepted' as const })),
        createdAt: FieldValue.serverTimestamp(),
      });

      navigation.replace('ChatWindow', {
        conversation: {
          type: 'group',
          groupId: ref.id,
          name: name.trim(),
          photoURL: null,
          adminId: profile.uid,
          members: memberIds.map((uid) => ({ uid, status: 'accepted' as const })),
          description: description.trim(),
        },
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen noPadding>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 }}>
        <AppText weight="extrabold" style={{ fontSize: 22 }}>
          New group
        </AppText>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
          <XIcon size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
        <TextField label="Group name" placeholder="Weekend crew" value={name} onChangeText={setName} />
        <TextField label="Description (optional)" placeholder="What's this group about?" value={description} onChangeText={setDescription} />

        <AppText weight="medium" muted style={{ fontSize: 13, marginBottom: 10 }}>
          Add members ({selected.size} selected)
        </AppText>

        {users.map((u) => {
          const isSelected = selected.has(u.uid);
          return (
            <Pressable
              key={u.uid}
              onPress={() => toggle(u.uid)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
            >
              <Avatar uri={u.photoURL} name={u.displayName} size={44} />
              <AppText weight="medium" style={{ flex: 1, fontSize: 14.5 }}>
                {u.displayName}
              </AppText>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: isSelected ? 0 : 1.5,
                  borderColor: colors.border,
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected ? <Check size={14} color="#fff" weight="bold" /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <PrimaryButton label="Create group" onPress={handleCreate} loading={creating} disabled={!canCreate} />
      </View>
    </Screen>
  );
}
