import { API_URL } from "../../config/env";
import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function CreateElder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('en');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Ensure caregiver profile exists before attempting elder creation.
      // This is idempotent and guards against missing profiles from broken registrations.
      await supabase.rpc('ensure_caregiver_profile', { p_full_name: 'Caregiver' });

      const { data, error } = await supabase.rpc('create_elder_and_link', {
        p_full_name: fullName,
        p_primary_language: language
      });
      if (error) throw error;

      window.location.href = '/caregiver';
    } catch (err: any) {
      console.error('[CreateElder] Error:', err);
      if (err.message?.includes('foreign key') || err.message?.includes('violates')) {
        setError('Unable to create elder profile: your account setup is incomplete. Please sign out and sign back in, then try again.');
      } else if (err.message === 'Failed to fetch' || err.message === 'Load failed') {
        setError('Network error: Unable to reach the server. Please check your connection.');
      } else {
        setError(err.message || 'Unable to create elder profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('add_new_elder', 'Add New Elder')}</h1>
      
      <Card className="p-6">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('full_name', 'Full Name')}</label>
            <input 
              type="text" 
              required
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('primary_language', 'Primary Language')}</label>
            <select 
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="as">Assamese</option>
              <option value="bn">Bengali</option>
            </select>
          </div>
          
          <div className="flex gap-4 mt-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
              {t('cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? t('saving', 'Saving...') : t('add_elder', 'Add Elder')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
