export type DiscountType = 'amount' | 'percent';

export type RoundingStep = 1 | 100 | 500 | 1000;

export type Participant = {
  id: string;
  name: string;
  color: string;
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
