import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SignupClientData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  companyName: string;
  legalName?: string;
  crNumber: string;
  vatNumber?: string;
  size: 'enterprise' | 'mid' | 'startup' | '';
  industry?: string;
  city: string;
}

interface SignupClientState {
  data: SignupClientData;
  setField: <K extends keyof SignupClientData>(
    key: K,
    value: SignupClientData[K]
  ) => void;
  reset: () => void;
}

const initial: SignupClientData = {
  email: '',
  password: '',
  fullName: '',
  phone: '',
  companyName: '',
  legalName: '',
  crNumber: '',
  vatNumber: '',
  size: '',
  industry: '',
  city: '',
};

export const useSignupClientStore = create<SignupClientState>()(
  persist(
    (set) => ({
      data: initial,
      setField: (key, value) =>
        set((s) => ({ data: { ...s.data, [key]: value } })),
      reset: () => set({ data: initial }),
    }),
    { name: 'signup-client-draft' }
  )
);
