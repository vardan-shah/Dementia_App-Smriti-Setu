import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { recommendNextActivity, ActivityRecommendation } from '../../services/personalization';
import { GAME_REGISTRY } from '../../config/games';
import { useGameAudio } from '../../hooks/useGameAudio';
import { Button } from '../../components/ui/Button';
import { Play } from 'lucide-react';
import { db } from '../../db';

export function Home() {
  const { elderId } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { speak, isAvailable } = useGameAudio();
  
  const [profile, setProfile] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<ActivityRecommendation | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!elderId) return;
      
      // Local first
      const localProfile = await db.profiles.get(elderId);
      if (localProfile) {
        setProfile({ full_name: localProfile.fullName, primary_language: localProfile.primaryLanguage });
        if (localProfile.primaryLanguage && localProfile.primaryLanguage !== i18n.language) {
          i18n.changeLanguage(localProfile.primaryLanguage);
        }
      }

      // Background sync
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
          
          // Cache locally
          await db.profiles.put({
            id: data.id,
            fullName: data.full_name,
            primaryLanguage: data.primary_language,
            updatedAt: new Date().toISOString()
          });

          if (data.primary_language && data.primary_language !== i18n.language) {
            i18n.changeLanguage(data.primary_language);
          }
        }
      } catch (err) {
        console.warn('Failed to background sync elder profile (likely offline)');
      }
    }
    loadProfile();
  }, [elderId, i18n]);

  useEffect(() => {
    async function getRecommendation() {
      if (!elderId) return;
      const rec = await recommendNextActivity(elderId);
      setRecommendation(rec);
    }
    getRecommendation();
  }, [elderId]);

  const handleStart = () => {
    if (recommendation) {
      navigate(`/elder/games/${recommendation.gameId}`);
    }
  };

  const speakRecommendation = () => {
    if (!isAvailable || !recommendation) return;
    speak(`${t('today_activity', "Today's Activity")}. ${recommendation.reason}`);
  };

  const getGameName = (id: string) => {
    // We could use t() for localized names based on registry mapping if desired
    // For now we use the localized title explicitly, fallback to registry
    if (id === 'object-recognition') return t('memory_match_title', 'Memory Match');
    if (id === 'recall') return t('memory_recall_title', 'Memory Recall');
    if (id === 'language-exercises') return t('language_game_title', 'Match the Word');
    return GAME_REGISTRY[id]?.name || id;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-4">
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

      {recommendation ? (
        <div className="bg-white rounded-3xl p-8 shadow-sm border-4 border-primary max-w-2xl w-full text-center mt-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">{t('today_activity', "Today's Activity")}</h3>
          <h4 className="text-4xl text-primary font-bold mb-6">
            {getGameName(recommendation.gameId)}
          </h4>
          <p className="text-2xl text-gray-600 mb-10">{recommendation.reason}</p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Button onClick={handleStart} className="text-2xl py-6 px-12 min-h-[80px] w-full md:w-auto">
              {t('start', 'Start')}
            </Button>
            {isAvailable && (
              <Button onClick={speakRecommendation} variant="outline" className="text-xl py-6 px-8 min-h-[80px] w-full md:w-auto">
                <Play className="w-8 h-8 mr-2" />
                {t('listen', 'Listen')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 max-w-2xl w-full text-center mt-12">
          <p className="text-2xl text-gray-500 font-medium">{t('loading', 'Loading...')}</p>
        </div>
      )}
    </div>
  );
}
