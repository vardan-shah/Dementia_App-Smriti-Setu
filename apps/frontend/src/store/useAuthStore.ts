import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  role: 'CAREGIVER' | 'ELDER' | null;
  elderId: string | null; // For Elder mode
  caregiverId: string | null; // For Caregiver mode
  currentCaregiverElder?: any; // For Caregiver dashboard state
  setRole: (role: 'CAREGIVER' | 'ELDER' | null) => void;
  setElderId: (id: string | null) => void;
  setCaregiverId: (id: string | null) => void;
  setCurrentCaregiverElder: (elder: any) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      elderId: null,
      caregiverId: null,
      currentCaregiverElder: null,
      setRole: (role) => set({ role }),
      setElderId: (id) => set({ elderId: id }),
      setCaregiverId: (id) => set({ caregiverId: id }),
      setCurrentCaregiverElder: (elder) => set({ currentCaregiverElder: elder }),
      clearAuth: () => set({ role: null, elderId: null, caregiverId: null, currentCaregiverElder: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
