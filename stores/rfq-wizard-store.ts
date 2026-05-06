import { create } from 'zustand';

export type ServiceType = 'booth' | 'gifts' | 'event' | 'printing';

export interface RfqWizardData {
  serviceType: ServiceType | '';
  title: string;
  description: string;
  exhibitionName: string;
  exhibitionCity: string;
  exhibitionDate: string;
  deliveryLocation: string;
  budgetMin: string;
  budgetMax: string;
  proposalsDeadline: string;
  details: Record<string, unknown>;
}

interface RfqWizardState {
  data: RfqWizardData;
  setField: <K extends keyof RfqWizardData>(k: K, v: RfqWizardData[K]) => void;
  setDetail: (k: string, v: unknown) => void;
  reset: () => void;
}

const initial: RfqWizardData = {
  serviceType: '',
  title: '',
  description: '',
  exhibitionName: '',
  exhibitionCity: '',
  exhibitionDate: '',
  deliveryLocation: '',
  budgetMin: '',
  budgetMax: '',
  proposalsDeadline: '',
  details: {},
};

// Not persisted intentionally — drafts of RFQs feel stale across sessions.
export const useRfqWizardStore = create<RfqWizardState>((set) => ({
  data: initial,
  setField: (k, v) => set((s) => ({ data: { ...s.data, [k]: v } })),
  setDetail: (k, v) =>
    set((s) => ({ data: { ...s.data, details: { ...s.data.details, [k]: v } } })),
  reset: () => set({ data: initial }),
}));
