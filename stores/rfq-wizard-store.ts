import { create } from 'zustand';

export type ServiceType = 'booth' | 'gifts' | 'event' | 'printing';

export interface RfqAttachment {
  path: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

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
  logoPath: string | null;
  logoFilename: string | null;
  attachments: RfqAttachment[];
}

interface RfqWizardState {
  data: RfqWizardData;
  setField: <K extends keyof RfqWizardData>(k: K, v: RfqWizardData[K]) => void;
  setDetail: (k: string, v: unknown) => void;
  setLogo: (logo: { path: string; filename: string } | null) => void;
  addAttachment: (a: RfqAttachment) => void;
  removeAttachment: (path: string) => void;
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
  logoPath: null,
  logoFilename: null,
  attachments: [],
};

// Not persisted intentionally — drafts of RFQs feel stale across sessions.
export const useRfqWizardStore = create<RfqWizardState>((set) => ({
  data: initial,
  setField: (k, v) => set((s) => ({ data: { ...s.data, [k]: v } })),
  setDetail: (k, v) =>
    set((s) => ({ data: { ...s.data, details: { ...s.data.details, [k]: v } } })),
  setLogo: (logo) =>
    set((s) => ({
      data: {
        ...s.data,
        logoPath: logo?.path ?? null,
        logoFilename: logo?.filename ?? null,
      },
    })),
  addAttachment: (a) =>
    set((s) => ({ data: { ...s.data, attachments: [...s.data.attachments, a] } })),
  removeAttachment: (path) =>
    set((s) => ({
      data: {
        ...s.data,
        attachments: s.data.attachments.filter((a) => a.path !== path),
      },
    })),
  reset: () => set({ data: initial }),
}));
