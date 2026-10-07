import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { PlusIcon, TrashIcon } from '@/components/icons';
import { PillButton } from '@/components/PillButton';
import { ReceiptCard } from '@/components/ReceiptCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { useGroupsStore } from '@/stores/groups';
import { fonts, fontSizes, lineHeights, minTouchTarget, spacing, useTheme } from '@/theme';

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Use a saved group for a new bill, or manage it: rename, add or remove members, delete.
export default function GroupScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = useGroupsStore((state) => state.groups[id]);
  const renameGroup = useGroupsStore((state) => state.renameGroup);
  const addMember = useGroupsStore((state) => state.addMember);
  const removeMember = useGroupsStore((state) => state.removeMember);
  const deleteGroup = useGroupsStore((state) => state.deleteGroup);

  const [name, setName] = useState(group?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [newMember, setNewMember] = useState('');
  const [memberError, setMemberError] = useState<string | null>(null);

  if (!group) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Grup tidak ditemukan" onBack={goBack} />
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Grup ini sudah dihapus. Kembali ke Beranda.
        </Text>
      </SafeAreaView>
    );
  }

  const saveName = () => {
    if (name.trim() === group.name) return;
    const result = renameGroup(group.id, name);
    setNameError(result.ok ? null : result.error);
  };

  const add = () => {
    const result = addMember(group.id, newMember);
    if (!result.ok) return setMemberError(result.error);
    setNewMember('');
    setMemberError(null);
  };

  const confirmRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(`Hapus ${memberName} dari grup?`, 'Tagihan yang sudah dibuat tidak berubah.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => removeMember(group.id, memberId) },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      `Hapus grup ${group.name}?`,
      'Tagihan yang sudah dibuat dengan grup ini tetap ada.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus grup',
          style: 'destructive',
          onPress: () => {
            deleteGroup(group.id);
            goBack();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
        <ScreenHeader
          title={group.name}
          subtitle={`Grup · ${group.members.length} orang`}
          onBack={goBack}
        />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ReceiptCard contentStyle={styles.card}>
            <TextField
              label="Nama grup"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (nameError) setNameError(null);
              }}
              onEndEditing={saveName}
              onSubmitEditing={saveName}
              error={nameError}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <View style={styles.members}>
              <Text accessibilityRole="header" style={[styles.label, { color: colors.text }]}>
                Anggota
              </Text>
              {group.members.length === 0 ? (
                <Text style={[styles.hint, { color: colors.textMutedPaper }]}>
                  Belum ada anggota. Tambahkan minimal satu orang sebelum memakai grup ini.
                </Text>
              ) : (
                group.members.map((member) => (
                  <View key={member.id} style={styles.member}>
                    <Avatar name={member.name} color={member.color} size="sm" />
                    <Text style={[styles.memberName, { color: colors.text }]}>{member.name}</Text>
                    <IconButton
                      accessibilityLabel={`Hapus ${member.name} dari grup`}
                      icon={(color) => <TrashIcon color={color} size={20} />}
                      onPress={() => confirmRemoveMember(member.id, member.name)}
                    />
                  </View>
                ))
              )}
            </View>

            <View style={styles.addRow}>
              <View style={styles.flex}>
                <TextField
                  label="Anggota baru"
                  placeholder="Nama"
                  value={newMember}
                  onChangeText={(text) => {
                    setNewMember(text);
                    if (memberError) setMemberError(null);
                  }}
                  error={memberError}
                  autoCapitalize="words"
                  returnKeyType="done"
                  submitBehavior="submit"
                  onSubmitEditing={add}
                />
              </View>
              <IconButton
                accessibilityLabel="Tambah anggota"
                bordered
                icon={(color) => <PlusIcon color={color} size={20} />}
                onPress={add}
                style={styles.addButton}
              />
            </View>
          </ReceiptCard>

          <PillButton label="Hapus grup" onPress={confirmDelete} />
        </ScrollView>

        <SafeAreaView
          edges={['bottom']}
          style={[styles.bottomBar, { backgroundColor: colors.surface }]}>
          <PillButton
            variant="primary"
            label="Buat tagihan dengan grup ini"
            disabled={group.members.length === 0}
            onPress={() =>
              router.push({ pathname: '/tagihan/baru', params: { groupId: group.id } })
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
    paddingHorizontal: spacing.xl,
  },
  card: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  members: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: fonts.bodyStrong,
    fontSize: fontSizes.body,
  },
  member: {
    minHeight: minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.small,
    lineHeight: lineHeights.small,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  addButton: {
    marginTop: spacing.xl,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
