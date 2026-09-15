import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { computeBaselines, getCognitiveProfile } from "../../services/personalization";
import { recommendNextActivity } from "../../services/personalization/recommendation";
import { db } from '../../db';
import type { CognitiveProfile, PerformanceRecord } from '../../services/personalization/types';
import type { ActivityRecommendation } from '../../services/personalization/recommendation';
import type { AdaptiveArmState } from '../../services/personalization/adaptiveTypes';
import type { CulturalProfile, DailyPlan, Reminder } from '../../services/cultural/types';
import { GAME_REGISTRY } from '../../config/games';
import { Brain, Activity, BookOpen, Clock, Target, Bot, Settings, Users, ArrowRight, CheckCircle, Bell } from 'lucide-react';
import { CognitiveChangeRadar } from './CognitiveChangeRadar';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { generateCaregiverInsights } from '../../services/insights';
import { generateAiSummary } from '../../services/api';
import { getReminders } from '../../services/cultural/reminders';
import { getLocalDateKey } from '../../utils/date';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ICONS: Record<string, any> = {
  'Memory': Brain,
  'Attention': Target,
  'Language': BookOpen,
  'Reaction': Clock,
  'Engagement': Activity
};

export function ElderOverview({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { currentCaregiverElder } = useAuthStore();
  const elderId = currentCaregiverElder?.id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [recommendation, setRecommendation] = useState<ActivityRecommendation | null>(null);
  const [recentSessions, setRecentSessions] = useState<PerformanceRecord[]>([]);
  const [culturalProfile, setCulturalProfile] = useState<CulturalProfile | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);
  const [relativeCount, setRelativeCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [useAI, setUseAI] = useState(localStorage.getItem('smriti_use_ai') === 'true');
  const [aiSummary, setAiSummary] = useState<{ text: string; provider: string } | null>(null);
  const [localInsight, setLocalInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('smriti_use_ai', useAI.toString());
  }, [useAI]);

  useEffect(() => {
    async function loadData() {
      if (!elderId) return;
      setLoading(true);
      try {
        await computeBaselines(elderId);
        
        // Ensure today's reminders are fetched correctly
        const today = getLocalDateKey();

        const dpDate = getLocalDateKey();
        const [prof, rec, recentSess, cp, dp, activeReminders, memCount, relCount] = await Promise.all([
          getCognitiveProfile(elderId),
          recommendNextActivity(elderId),
          db.performanceRecords.where('elderId').equals(elderId).reverse().limit(10).toArray(),
          db.culturalProfiles.where('elderId').equals(elderId).first(),
          db.dailyPlans.where('[elderId+date]').equals([elderId, dpDate]).first(),
          getReminders(elderId),
          db.memories.where('elderId').equals(elderId).count(),
          db.relatives.where('elderId').equals(elderId).count()
        ]);
        
        setProfile(prof);
        setRecommendation(rec);
        setRecentSessions(recentSess || []);
        setCulturalProfile(cp || null);
        setDailyPlan(dp || null);
        setReminders(activeReminders);
        
        setMemoryCount(memCount);
        setRelativeCount(relCount);

        // Generate deterministic local insight
        setLocalInsight(generateCaregiverInsights(recentSess, prof));

        // Generate AI Summary if enabled
        if (useAI && recentSess.length > 0) {
          setIsAiLoading(true);
          try {
            const activities = recentSess.map(r => ({
              gameName: GAME_REGISTRY[r.gameId]?.name || r.gameId,
              accuracy: r.accuracy || 0,
              completed: r.status === 'COMPLETED',
              difficulty: r.difficulty || 'MEDIUM'
            }));

            const data = await generateAiSummary({ elderId, recentActivities: activities, aiEnabled: useAI });
            setAiSummary({ text: data.summary, provider: data.provider });
          } catch (e) {
            console.error('AI Error', e);
            setAiSummary({ text: t('ai_fallback_error', 'AI generation failed. Fallback to local.'), provider: 'error' });
          } finally {
            setIsAiLoading(false);
          }
        } else {
          setAiSummary(null);
        }

      } catch (err) {
        console.error('Error loading personalization insights', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [elderId, useAI, t]);

  if (!elderId) {
    return <div className="text-gray-500">{t('select_elder_prompt', 'Please select an elder profile.')}</div>;
  }

  if (loading) {
    return <div className="text-gray-500">{t('loading_data', 'Loading personalization data...')}</div>;
  }

  const getGameName = (id: string) => GAME_REGISTRY[id]?.name || id.replace('-', ' ').toUpperCase();

  return (
    <div className="space-y-8">
      {/* 1. Elder Overview & Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('elder_overview', 'Elder Profile')}</h3>
          <div className="space-y-3">
            <p className="flex justify-between"><span className="text-gray-500">{t('name', 'Name')}</span> <span className="font-medium">{currentCaregiverElder.full_name}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">{t('region', 'Region')}</span> <span className="font-medium">{culturalProfile?.region || 'Not set'}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">{t('language', 'Language')}</span> <span className="font-medium">{culturalProfile?.preferredLanguage || 'Not set'}</span></p>
            <p className="flex justify-between"><span className="text-gray-500">{t('last_activity', 'Last Activity')}</span> <span className="font-medium">
              {recentSessions.length > 0 ? new Date(recentSessions[0].createdAt).toLocaleString() : 'Never'}
            </span></p>
          </div>
          <div className="flex gap-3 mt-4">
            {setActiveTab && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/caregiver/elders/${currentCaregiverElder.id}/pair`)}>
                {t('pair_device', 'Pair Device')}
              </Button>
            )}
            {setActiveTab && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveTab('settings')}>
                {t('edit_cultural_settings', 'Edit Settings')}
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-900">{t('todays_activity', 'Today\'s Activity')}</h3>
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            
            {recommendation ? (
              <div>
                <h4 className="font-bold text-2xl text-blue-800">{getGameName(recommendation.gameId)}</h4>
                <p className="text-blue-600 font-medium capitalize">{recommendation.difficulty.toLowerCase()} {t('difficulty', 'Difficulty')}</p>
                <p className="text-blue-800 mt-4 bg-white/60 p-4 rounded-lg text-sm">
                  {recommendation.reason}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">{t('no_recommendation', 'No recommendation available.')}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Caregiver Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            {t('caregiver_insights', 'Caregiver Insights')}
          </h3>
          <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="rounded" />
            {t('use_ai_summaries', 'Use AI Summaries')}
          </label>
        </div>
        <div className="p-6">
          <p className="text-gray-700 font-medium mb-4">{localInsight}</p>
          
          {useAI && (
            <div className="bg-indigo-50 rounded-lg border border-indigo-100 p-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t('ai_generated_summary', 'AI-generated summary')}</span>
              </div>
              {isAiLoading ? (
                <p className="text-indigo-600 text-sm">{t('generating_summary', 'Generating contextual summary...')}</p>
              ) : aiSummary ? (
                <p className="text-indigo-800 text-sm">{aiSummary.text}</p>
              ) : (
                <p className="text-indigo-600 text-sm">{t('insufficient_data', 'Insufficient data to generate summary.')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Recent Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('recent_performance', 'Recent Performance')}</h3>
        {recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">{t('date', 'Date')}</th>
                  <th className="pb-2 font-medium">{t('activity', 'Activity')}</th>
                  <th className="pb-2 font-medium">{t('status', 'Status')}</th>
                  <th className="pb-2 font-medium">{t('accuracy', 'Accuracy')}</th>
                  <th className="pb-2 font-medium">{t('difficulty', 'Difficulty')}</th>
                  <th className="pb-2 font-medium">{t('reaction_time', 'Reaction Time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSessions.map(session => (
                  <tr key={session.id}>
                    <td className="py-3 text-gray-700">{new Date(session.createdAt).toLocaleString()}</td>
                    <td className="py-3 font-medium text-gray-900">{getGameName(session.gameId)}</td>
                    <td className="py-3">
                      {session.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{t('completed_status', 'Completed')}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{t('abandoned_status', 'Abandoned')}</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-700">
                      {session.accuracy !== undefined ? `${Math.round(session.accuracy * 100)}%` : '-'}
                    </td>
                    <td className="py-3 text-gray-700 text-xs uppercase">{session.difficulty || 'MEDIUM'}</td>
                    <td className="py-3 text-gray-700">
                      {session.avgReactionTimeMs 
                        ? `${(session.avgReactionTimeMs / 1000).toFixed(2)}s` 
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">{t('no_recent_sessions', 'No recent sessions.')}</p>
        )}
      </div>

      {/* 4. Cognitive Activity Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{t('cognitive_activity_profile', 'Cognitive Activity Profile')}</h3>
        <p className="text-sm text-gray-500 mb-6">
          {t('cognitive_profile_disclaimer', 'This profile summarizes activity performance and is not a medical assessment.')}
        </p>

        {profile && profile.scores.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.scores.map(score => {
              const Icon = CATEGORY_ICONS[score.category] || Activity;
              
              return (
                <div key={score.category} className="border border-gray-100 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-gray-700">{t(`category_${score.category.toLowerCase()}`, score.category)}</span>
                  </div>
                  
                  {score.confidence === 'NOT_YET_MEASURED' || score.category === 'Attention' ? (
                    <div className="text-gray-400 text-sm mt-auto">{t('not_yet_measured', 'Not yet measured')}</div>
                  ) : score.confidence === 'INSUFFICIENT_DATA' ? (
                    <div className="text-gray-400 text-sm mt-auto">{t('insufficient_data', 'Insufficient data')}</div>
                  ) : score.confidence === 'BUILDING_BASELINE' ? (
                    <div className="text-blue-500 text-sm mt-auto">{t('building_baseline', 'Building baseline...')}</div>
                  ) : score.reactionMetrics ? (
                    <div className="flex flex-col gap-1 mt-auto">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('reaction_time', 'Reaction Time')}</span>
                        <span className="font-medium">{(score.reactionMetrics.currentMs / 1000).toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('personal_baseline', 'Personal baseline')}</span>
                        <span className="font-medium">{(score.reactionMetrics.baselineMs / 1000).toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('difference', 'Difference')}</span>
                        <span className={`font-medium ${score.reactionMetrics.differenceMs < 0 ? 'text-green-600' : score.reactionMetrics.differenceMs > 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                          {score.reactionMetrics.differenceMs > 0 ? '+' : ''}{(score.reactionMetrics.differenceMs / 1000).toFixed(2)} s
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{t('trend', 'Trend')}: {t(`trend_${score.reactionMetrics.trend.toLowerCase()}`, score.reactionMetrics.trend)}</div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2 mt-auto">
                      <span className="text-3xl font-bold text-gray-900">{score.score}</span>
                      <span className="text-gray-500 text-sm mb-1">/ 100</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">{t('no_profile_data', 'No profile data available yet.')}</p>
        )}
      </div>

      {/* 5. Change Radar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{t('change_radar', 'Change Radar')}</h3>
        <p className="text-sm text-gray-500 mb-6 bg-yellow-50 text-yellow-800 p-3 rounded-md border border-yellow-200">
          {t('change_radar_disclaimer', 'This feature summarizes changes in activity performance relative to the individual\'s personal baseline. It is not a medical assessment or diagnosis.')}
        </p>
        <CognitiveChangeRadar />
      </div>

      {/* 6. Deep Link Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reminders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-800">{t('todays_reminders', 'Today\'s Reminders')}</h3>
          </div>
          {reminders.length > 0 ? (
            <ul className="space-y-3 mb-6 flex-1">
              {reminders.map(r => (
                <li key={r.id} className="flex items-center gap-3">
                  <CheckCircle className={`w-5 h-5 ${r.completedToday ? 'text-green-500' : 'text-gray-300'}`} />
                  <div>
                    <p className={`font-medium ${r.completedToday ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{r.title}</p>
                    <p className="text-xs text-gray-500">{r.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 flex-1">{t('no_reminders_today', 'No reminders scheduled for today.')}</p>
          )}
          {setActiveTab && (
            <Button variant="outline" className="w-full mt-auto" onClick={() => setActiveTab('reminders')}>
              {t('manage_reminders', 'Manage Reminders')} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Memory Vault */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-800">{t('memory_vault', 'Memory Vault')}</h3>
          </div>
          <div className="flex gap-4 mb-6 flex-1">
            <div className="bg-blue-50 text-blue-800 rounded-lg p-4 flex-1 text-center">
              <span className="block text-2xl font-bold">{relativeCount}</span>
              <span className="text-sm">{t('relatives', 'Relatives')}</span>
            </div>
            <div className="bg-green-50 text-green-800 rounded-lg p-4 flex-1 text-center">
              <span className="block text-2xl font-bold">{memoryCount}</span>
              <span className="text-sm">{t('stories', 'Stories')}</span>
            </div>
          </div>
          {setActiveTab && (
            <Button variant="outline" className="w-full mt-auto" onClick={() => setActiveTab('memories')}>
              {t('open_vault', 'Open Vault')} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
