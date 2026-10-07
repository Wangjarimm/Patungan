import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { pickAvatarColor } from '@/lib/avatar';
import { createId } from '@/lib/id';
import { validateGroupName, validateParticipantName, type Parsed } from '@/lib/validation';
import type { Group } from '@/types/bill';

type GroupsState = {
  groups: Record<string, Group>;
  // Saves people (usually a bill's participants) as a new group, keeping their colors.
  createGroup: (name: string, members: { name: string; color: string }[]) => Parsed<string>;
  renameGroup: (groupId: string, name: string) => Parsed<string>;
  addMember: (groupId: string, name: string) => Parsed<string>;
  removeMember: (groupId: string, memberId: string) => void;
  deleteGroup: (groupId: string) => void;
};

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => {
      const updateGroup = (groupId: string, update: (group: Group) => Group) => {
        set((state) => {
          const group = state.groups[groupId];
          if (!group) return state;
          return { groups: { ...state.groups, [groupId]: update(group) } };
        });
      };

      return {
        groups: {},

        createGroup: (name, members) => {
          const validName = validateGroupName(name);
          if (!validName.ok) return validName;
          if (members.length === 0) {
            return { ok: false, error: 'Grup butuh minimal satu anggota.' };
          }
          const group: Group = {
            id: createId(),
            name: validName.value,
            members: members.map((m) => ({ id: createId(), name: m.name, color: m.color })),
            createdAt: Date.now(),
          };
          set((state) => ({ groups: { ...state.groups, [group.id]: group } }));
          return { ok: true, value: group.id };
        },

        renameGroup: (groupId, name) => {
          if (!get().groups[groupId]) return { ok: false, error: 'Grup tidak ditemukan.' };
          const valid = validateGroupName(name);
          if (!valid.ok) return valid;
          updateGroup(groupId, (g) => ({ ...g, name: valid.value }));
          return { ok: true, value: groupId };
        },

        addMember: (groupId, name) => {
          const group = get().groups[groupId];
          if (!group) return { ok: false, error: 'Grup tidak ditemukan.' };
          const valid = validateParticipantName(name, group.members);
          if (!valid.ok) return valid;
          const member = {
            id: createId(),
            name: valid.value,
            color: pickAvatarColor(group.members.map((m) => m.color)),
          };
          updateGroup(groupId, (g) => ({ ...g, members: [...g.members, member] }));
          return { ok: true, value: member.id };
        },

        removeMember: (groupId, memberId) => {
          updateGroup(groupId, (g) => ({
            ...g,
            members: g.members.filter((m) => m.id !== memberId),
          }));
        },

        deleteGroup: (groupId) => {
          set((state) => {
            const { [groupId]: _removed, ...rest } = state.groups;
            return { groups: rest };
          });
        },
      };
    },
    {
      name: 'patungan-groups',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ groups: state.groups }),
    },
  ),
);

// Oldest first, so groups keep a stable order on the home screen.
export function sortGroups(groups: Record<string, Group>): Group[] {
  return Object.values(groups).sort((a, b) => a.createdAt - b.createdAt);
}
