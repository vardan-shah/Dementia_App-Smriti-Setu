import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: string;
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reducedMotion: boolean;
  audioEnabled: boolean;
  setLanguage: (lang: string) => void;
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setAudioEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      fontSize: 'large', // Default to large for elder safety
      highContrast: false,
      reducedMotion: false,
      audioEnabled: true,
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
