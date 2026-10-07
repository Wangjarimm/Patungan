import AsyncStorage from '@react-native-async-storage/async-storage';

import { avatarColors } from '@/theme/colors';

import { useBillsStore } from './bills';
import { sortGroups, useGroupsStore } from './groups';

const groups = () => useGroupsStore.getState();

function ok<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function group(id: string) {
  const found = groups().groups[id];
  if (!found) throw new Error('group missing');
  return found;
}

const members = [
  { name: 'Raka', color: avatarColors[0] },
  { name: 'Dinda', color: avatarColors[1] },
];

beforeEach(async () => {
  useGroupsStore.setState({ groups: {} });
  useBillsStore.setState({ bills: {} });
  await AsyncStorage.clear();
});

describe('groups store (F-09)', () => {
  it('saves people as a group, keeping their colors', () => {
    const id = ok(groups().createGroup(' Kantor  lantai 3 ', members));
    expect(group(id).name).toBe('Kantor lantai 3');
    expect(group(id).members.map((m) => [m.name, m.color])).toEqual([
      ['Raka', avatarColors[0]],
      ['Dinda', avatarColors[1]],
    ]);
  });

  it('rejects an empty name or no members', () => {
    expect(groups().createGroup('', members).ok).toBe(false);
    expect(groups().createGroup('Kos', []).ok).toBe(false);
    expect(groups().groups).toEqual({});
  });

  it('renames, adds and removes members, rejecting duplicate names', () => {
    const id = ok(groups().createGroup('Kos', members));
    expect(groups().renameGroup(id, ' ').ok).toBe(false);
    ok(groups().renameGroup(id, 'Kos Melati'));
    expect(group(id).name).toBe('Kos Melati');

    expect(groups().addMember(id, 'raka').ok).toBe(false);
    const wulan = ok(groups().addMember(id, 'Wulan'));
    expect(group(id).members.at(-1)).toMatchObject({ name: 'Wulan', color: avatarColors[2] });

    groups().removeMember(id, wulan);
    expect(group(id).members.map((m) => m.name)).toEqual(['Raka', 'Dinda']);
  });

  it('reports a missing group', () => {
    expect(groups().renameGroup('nope', 'X').ok).toBe(false);
    expect(groups().addMember('nope', 'X').ok).toBe(false);
  });

  it('deletes a group without touching bills made from it', () => {
    const id = ok(groups().createGroup('Kos', members));
    const billId = ok(
      useBillsStore
        .getState()
        .createBill({ title: 'Belanja', payerName: 'Dinda', members: group(id).members }),
    );
    groups().deleteGroup(id);
    expect(groups().groups).toEqual({});
    expect(useBillsStore.getState().bills[billId]?.participants).toHaveLength(2);
  });

  it('persists groups', async () => {
    ok(groups().createGroup('Kos', members));
    expect(await AsyncStorage.getItem('patungan-groups')).toContain('Kos');
  });

  it('sorts groups oldest first', () => {
    const a = ok(groups().createGroup('A', members));
    const b = ok(groups().createGroup('B', members));
    useGroupsStore.setState((s) => ({
      groups: {
        ...s.groups,
        [a]: { ...group(a), createdAt: 2 },
        [b]: { ...group(b), createdAt: 1 },
      },
    }));
    expect(sortGroups(groups().groups).map((g) => g.name)).toEqual(['B', 'A']);
  });
});

describe('createBill from a group (F-09)', () => {
  it('fills every member as a participant at once, with the chosen payer', () => {
    const billId = ok(
      useBillsStore
        .getState()
        .createBill({ title: 'Kedai', date: '2026-10-03', payerName: 'dinda', members }),
    );
    const bill = useBillsStore.getState().bills[billId]!;
    expect(bill.participants.map((p) => [p.name, p.color, p.paidAt])).toEqual([
      ['Raka', avatarColors[0], null],
      ['Dinda', avatarColors[1], null],
    ]);
    expect(bill.payerId).toBe(bill.participants[1]?.id);
  });

  it('requires the payer to be a member', () => {
    const result = useBillsStore
      .getState()
      .createBill({ title: 'Kedai', payerName: 'Bima', members });
    expect(result.ok).toBe(false);
    expect(useBillsStore.getState().bills).toEqual({});
  });
});
