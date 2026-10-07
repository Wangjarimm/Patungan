export type DiscountType = 'amount' | 'percent';

export type RoundingStep = 1 | 100 | 500 | 1000;

export type Participant = {
  id: string;
  name: string;
  color: string;
  // When the payer marked this person as paid; null while still owing.
  paidAt: number | null;
  // Account that claimed this name online (F-14); null for names nobody claimed yet.
  profileId: string | null;
};

export type Item = {
  id: string;
  name: string;
  // Whole Rupiah.
  unitPrice: number;
  qty: number;
  eaterIds: string[];
};

export type BillSettings = {
  servicePct: number;
  taxPct: number;
  taxAfterService: boolean;
  discountType: DiscountType;
  // Rupiah when discountType is 'amount', percent when 'percent'.
  discountValue: number;
  // Delivery or other fee, split evenly across all participants.
  extraFee: number;
  roundingStep: RoundingStep;
};

// 'owner': created on this account, fully editable. 'participant': joined with a code (F-13).
export type BillRole = 'owner' | 'participant';

export type Bill = {
  id: string;
  title: string;
  // Local calendar date, YYYY-MM-DD.
  date: string;
  payerId: string | null;
  participants: Participant[];
  items: Item[];
  settings: BillSettings;
  createdAt: number;
  role: BillRole;
  // Server account that owns the bill. Null for bills that only live on this device so far
  // (made before v0.3 or before the account existed); those move online in the migration.
  ownerId: string | null;
  // Assigned by the server once the bill is uploaded.
  joinCode: string | null;
  // The participant that is the current user, when known.
  myParticipantId: string | null;
  // When the server last confirmed this bill; null while it has never been uploaded.
  syncedAt: number | null;
};

export type GroupMember = {
  id: string;
  name: string;
  color: string;
};

// Saved set of people to reuse when creating a bill (F-09). Bills copy the members,
// so editing or deleting a group never changes existing bills.
export type Group = {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: number;
};
