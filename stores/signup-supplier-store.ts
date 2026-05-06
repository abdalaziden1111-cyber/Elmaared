import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ServiceType = 'booth' | 'gifts' | 'event' | 'printing';

export interface SignupSupplierData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  companyName: string;
  legalName?: string;
  crNumber: string;
  vatNumber?: string;
  specializations: ServiceType[];
  cities: string[];
  bio?: string;
  website?: string;
  bankName?: string;
  iban?: string;
  accountHolderName?: string;
}

interface SignupSupplierState {
  data: SignupSupplierData;
  setField: <K extends keyof SignupSupplierData>(
    key: K,
    value: SignupSupplierData[K]
  ) => void;
  toggleSpecialization: (s: ServiceType) => void;
  toggleCity: (city: string) => void;
  reset: () => void;
}

const initial: SignupSupplierData = {
  email: '',
  password: '',
  fullName: '',
  phone: '',
  companyName: '',
  legalName: '',
  crNumber: '',
  vatNumber: '',
  specializations: [],
  cities: [],
  bio: '',
  website: '',
  bankName: '',
  iban: '',
  accountHolderName: '',
};

export const useSignupSupplierStore = create<SignupSupplierState>()(
  persist(
    (set) => ({
      data: initial,
      setField: (key, value) =>
        set((s) => ({ data: { ...s.data, [key]: value } })),
      toggleSpecialization: (s) =>
        set((state) => {
          const has = state.data.specializations.includes(s);
          return {
            data: {
              ...state.data,
              specializations: has
                ? state.data.specializations.filter((x) => x !== s)
                : [...state.data.specializations, s],
            },
          };
        }),
      toggleCity: (city) =>
        set((state) => {
          const has = state.data.cities.includes(city);
          return {
            data: {
              ...state.data,
              cities: has
                ? state.data.cities.filter((x) => x !== city)
                : [...state.data.cities, city],
            },
          };
        }),
      reset: () => set({ data: initial }),
    }),
    { name: 'signup-supplier-draft' }
  )
);
