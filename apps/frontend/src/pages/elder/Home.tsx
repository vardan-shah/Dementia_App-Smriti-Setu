import { API_URL } from "../../config/env";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getDailyPlan, getReminders, toggleReminderCompletion, resolveLocalizedText } from '../../services/cultural';
import type { DailyPlan, Reminder } from '../../services/cultural/types';
import { ALL_CULTURAL_CONTENT } from '../../config/culturalPacks';
import { useGameAudio } from '../../hooks/useGameAudio';
import { Button } from '../../components/ui/Button';
import { Play, CheckCircle, Circle, BookOpen, Clock } from 'lucide-react';
import { db } from '../../db';

export function Home() {
  const { elderId } = useAuthStore();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { speak, isAvailable } = useGameAudio();
  
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [memoryTitle, setMemoryTitle] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!elderId) return;
      
      const localProfile = await db.profiles.get(elderId);
      if (localProfile) {
        setProfile({ full_name: localProfile.fullName, primary_language: localProfile.primaryLanguage });
        if (localProfile.primaryLanguage && localProfile.primaryLanguage !== i18n.language) {
          i18n.changeLanguage(localProfile.primaryLanguage);
        }
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      
      try {
        const response = await fetch(`${API_URL}/elders/${elderId}`, {
          headers: { 'Authorization': `Bearer ${sessionData.session.access_token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          await db.profiles.put({
            id: data.id, fullName: data.full_name, primaryLanguage: data.primary_language, updatedAt: new Date().toISOString()
          });
          if (data.primary_language && data.primary_language !== i18n.language) {
            i18n.changeLanguage(data.primary_language);
          }
        }
      } catch (err) {
        console.warn('Offline: background profile sync skipped');
      }
    }
    loadProfile();
  }, [elderId, i18n]);

  useEffect(() => {
    async function loadDailyAssistance() {
      if (!elderId) return;
      const todayPlan = await getDailyPlan(elderId);
      setPlan(todayPlan);
      
      if (todayPlan.memoryId) {
        const m = await db.memories.get(todayPlan.memoryId);
        if (m) setMemoryTitle(m.title);
      }
      
      const todayReminders = await getReminders(elderId);
      setReminders(todayReminders);
    }
    loadDailyAssistance();
  }, [elderId]);

  const handleStartActivity = () => {
    if (plan) {
      navigate(`/elder/games/${plan.activityId}`);
    }
  };

  const handleToggleReminder = async (r: Reminder) => {
    await toggleReminderCompletion(r.id, !r.completedToday);
    setReminders(await getReminders(elderId!));
  };

  const culturalItem = plan?.culturalPromptId ? ALL_CULTURAL_CONTENT.find(c => c.id === plan.culturalPromptId) : null;
  const activityTitle = plan?.activityId === 'object-recognition' ? t('memory_match_title', 'Memory Match') 
    : plan?.activityId === 'recall' ? t('memory_recall_title', 'Memory Recall')
    : plan?.activityId === 'language-exercises' ? t('language_game_title', 'Match the Word')
    : plan?.activityId;

  const currentLang = i18n.language || 'en';
  const displayTitle = memoryTitle ? t('caregiver_memory', 'Caregiver Memory') : culturalItem ? resolveLocalizedText(culturalItem.title, currentLang) : '';
  const displayPrompt = memoryTitle ? memoryTitle : culturalItem ? resolveLocalizedText(culturalItem.prompt, currentLang) : '';

  const speakPlan = () => {
    if (!isAvailable || !plan) return;
    const greeting = `${t('good_morning', 'Good morning')}.`;
    const activityMsg = `${t('todays_activity_is', "Today's activity is")} ${activityTitle}.`;
    const promptMsg = displayPrompt;
    const remindersMsg = reminders.length > 0 ? `${t('you_have', 'You have')} ${reminders.length} ${t('reminders', 'reminders')}.` : '';
    
    speak(`${greeting} ${activityMsg} ${promptMsg} ${remindersMsg}`);
  };

  const dateStr = new Date().toLocaleDateString(currentLang, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col items-center min-h-[80vh] py-8 px-4 max-w-3xl mx-auto w-full">
      <div className="w-full text-center mb-10">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-2">
          {t('good_morning', 'Good morning')}{profile ? `, ${profile.full_name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-2xl text-gray-500 font-medium capitalize">{dateStr}</p>
      </div>

      {plan ? (
        <div className="w-full space-y-8">
          
          {/* Main Action Block */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border-4 border-primary text-center">
            <h3 className="text-3xl font-bold text-gray-800 mb-4">{t('today', "Today")}</h3>
            
            {displayTitle && (
              <div className="bg-blue-50 text-blue-900 p-6 rounded-2xl mb-8 text-2xl text-left border border-blue-100">
                <p className="font-semibold">{displayTitle}</p>
                <p className="mt-2 text-blue-800">{displayPrompt}</p>
              </div>
            )}
            
            <h4 className="text-3xl text-gray-600 mb-2">{t('todays_activity', "Today's Activity")}:</h4>
            <h5 className="text-4xl text-primary font-bold mb-8">{activityTitle}</h5>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <Button onClick={handleStartActivity} className="text-2xl py-6 px-12 min-h-[80px] w-full md:w-auto">
                {t('start_activity', 'Start Activity')}
              </Button>
              {isAvailable && (
                <Button onClick={speakPlan} variant="outline" className="text-2xl py-6 px-12 min-h-[80px] w-full md:w-auto">
                  <Play className="w-8 h-8 mr-3" />
                  {t('hear_todays_plan', "Hear Today's Plan")}
                </Button>
              )}
            </div>
          </div>

          {/* Reminders Block */}
          {reminders.length > 0 && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border-2 border-orange-200">
              <h3 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
                <Clock className="w-8 h-8 mr-3 text-orange-500" />
                {t('reminders', 'Reminders')}
              </h3>
              <div className="space-y-4">
                {reminders.map(r => (
                  <button 
                    key={r.id} 
                    onClick={() => handleToggleReminder(r)}
                    className={`w-full flex items-center p-6 rounded-2xl border-2 transition-all ${r.completedToday ? 'bg-green-50 border-green-200 text-green-800 opacity-70' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'}`}
                  >
                    {r.completedToday ? <CheckCircle className="w-10 h-10 mr-6 text-green-500 shrink-0" /> : <Circle className="w-10 h-10 mr-6 text-gray-300 shrink-0" />}
                    <div className="text-left">
                      <p className="text-2xl font-bold">{r.time}</p>
                      <p className="text-2xl">{r.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Actions */}
          <div className="flex flex-col md:flex-row gap-6 w-full">
            <Button variant="outline" className="text-2xl py-8 min-h-[100px] flex-1 bg-white" onClick={() => navigate('/elder/vault')}>
              <BookOpen className="w-8 h-8 mr-3" />
              {t('my_memories', 'My Memories')}
            </Button>
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
