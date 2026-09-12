import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';

export function Home() {
  const { elderId } = useAuthStore();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!elderId) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      try {
        const response = await fetch(`${API_URL}/elders/${elderId}`, {
          headers: {
            'Authorization': `Bearer ${sessionData.session.access_token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
    loadProfile();
  }, [elderId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      {profile && (
        <h2 className="text-4xl md:text-6xl font-bold text-center">
          {t('welcome', 'Welcome back')}, {profile.full_name.split(' ')[0]}
        </h2>
      )}
      
      {!profile && (
        <h2 className="text-4xl md:text-6xl font-bold text-center">
          {t('welcome', 'Welcome back')}
        </h2>
      )}

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-2xl w-full text-center mt-12">
        <p className="text-2xl text-gray-500 font-medium">No activity assigned for today.</p>
      </div>
    </div>
  );
}
