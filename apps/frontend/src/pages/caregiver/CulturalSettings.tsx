import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { db } from '../../db';
import type { CulturalProfile } from '../../services/cultural/types';
import { Button } from '../../components/ui/Button';
import { Map, Languages, Heart, Save, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { syncManager } from '../../sync';

const REGIONS = ['Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];
const THEMES = ['Festivals', 'Food', 'Family', 'Nature'];
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'as', name: 'Assamese' },
  { code: 'bn', name: 'Bengali' }
];

export function CulturalSettings() {
  const { currentCaregiverElder } = useAuthStore();
  const elderId = currentCaregiverElder?.id;
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<Partial<CulturalProfile>>({
    region: 'Assam',
    preferredLanguage: 'en',
    preferredThemes: []
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      if (!elderId) return;
      const existing = await db.culturalProfiles.where('elderId').equals(elderId).first();
      if (existing) {
        setProfile(existing);
      }
    }
    load();
  }, [elderId]);

  const handleSave = async () => {
    if (!elderId) return;
    
    const updated = {
      ...profile,
      id: profile.id || elderId,
      elderId,
      region: profile.region || 'Assam',
      preferredLanguage: profile.preferredLanguage || 'en',
      preferredThemes: profile.preferredThemes || [],
      updatedAt: new Date().toISOString()
    } as CulturalProfile;
    
    await db.culturalProfiles.put(updated);
    
    // Sync to backend (sync_events table)
    await syncManager.enqueueEvent('CULTURAL_PROFILE_UPDATED', updated, 'culturalProfile');
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleTheme = (theme: string) => {
    const themes = profile.preferredThemes || [];
    if (themes.includes(theme)) {
      setProfile({ ...profile, preferredThemes: themes.filter(t => t !== theme) });
    } else {
      setProfile({ ...profile, preferredThemes: [...themes, theme] });
    }
  };

  if (!elderId) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{t('cultural_personalization', 'Cultural Personalization')}</h3>
        <p className="text-sm text-gray-500">
          {t('cultural_settings_desc', 'Customize the daily assistance and prompts to match familiar regional and cultural contexts. This helps create a more engaging daily routine.')}
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <Map className="w-4 h-4 mr-2" />
            {t('region', 'Region')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setProfile({ ...profile, region: r })}
                className={`p-3 rounded-lg border text-sm transition-all ${profile.region === r ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-200 hover:border-blue-300'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <Languages className="w-4 h-4 mr-2" />
            {t('preferred_language', 'Preferred Language')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setProfile({ ...profile, preferredLanguage: l.code })}
                className={`p-3 rounded-lg border text-sm transition-all ${profile.preferredLanguage === l.code ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-200 hover:border-blue-300'}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <Heart className="w-4 h-4 mr-2" />
            {t('preferred_themes', 'Preferred Themes')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {THEMES.map(tOption => (
              <button
                key={tOption}
                onClick={() => toggleTheme(tOption)}
                className={`p-3 rounded-lg border text-sm transition-all ${profile.preferredThemes?.includes(tOption) ? 'border-primary bg-blue-50 text-primary font-medium' : 'border-gray-200 hover:border-blue-300'}`}
              >
                {t(tOption.toLowerCase(), tOption)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <Button onClick={handleSave} className="flex items-center">
            <Save className="w-4 h-4 mr-2" />
            {t('save_preferences', 'Save Preferences')}
          </Button>
          {saved && (
            <span className="text-green-600 flex items-center text-sm font-medium">
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('saved', 'Saved')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
