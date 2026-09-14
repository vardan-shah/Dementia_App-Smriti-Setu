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

      const response = await fetch(`${API_URL}/elders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          primary_language: language
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create elder');
      }

      navigate('/caregiver');
    } catch (err: any) {
      setError(err.message);
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
