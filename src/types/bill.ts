export type DiscountType = 'amount' | 'percent';

export type RoundingStep = 1 | 100 | 500 | 1000;

export type Participant = {
  id: string;
  name: string;
  color: string;
  // When the payer marked this person as paid; null while still owing.
  paidAt: number | null;
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
