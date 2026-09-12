import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { computeBaselines, getCognitiveProfile } from "../../services/personalization";
import { recommendNextActivity } from "../../services/personalization/recommendation";
import { db } from '../../db';
import type { CognitiveProfile } from '../../services/personalization';
import type { ActivityRecommendation } from '../../services/personalization/recommendation';
import type { AdaptiveArmState } from '../../services/personalization/adaptiveTypes';
import { GAME_REGISTRY } from '../../config/games';
import { Brain, Activity, BookOpen, Clock, Target, Bot, Settings } from 'lucide-react';
import { CognitiveChangeRadar } from './CognitiveChangeRadar';

const CATEGORY_ICONS: Record<string, any> = {
  'Memory': Brain,
  'Attention': Target,
  'Language': BookOpen,
  'Reaction': Clock,
  'Engagement': Activity
};

export function PersonalizationInsights() {
  const { currentCaregiverElder } = useAuthStore();
  const elderId = currentCaregiverElder?.id;
  
  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [recommendation, setRecommendation] = useState<ActivityRecommendation | null>(null);
  const [adaptiveStates, setAdaptiveStates] = useState<AdaptiveArmState[]>([]);
  const [loading, setLoading] = useState(true);
  const [useAI, setUseAI] = useState(localStorage.getItem('smriti_use_ai') === 'true');
  const [aiSummary, setAiSummary] = useState<{ text: string; provider: string } | null>(null);
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
        const [prof, rec, states, recentSessions] = await Promise.all([
          getCognitiveProfile(elderId),
          recommendNextActivity(elderId),
          db.adaptiveArmStates.where('elderId').equals(elderId).toArray(),
          db.performanceRecords.where('elderId').equals(elderId).reverse().limit(5).toArray()
        ]);
        setProfile(prof);
        setRecommendation(rec);
        
        // Find preferred difficulty per game (highest mean reward)
        const bestStates: Record<string, AdaptiveArmState> = {};
        states.forEach(s => {
          if (!bestStates[s.gameId] || bestStates[s.gameId].meanReward < s.meanReward) {
            bestStates[s.gameId] = s;
          }
        });
        setAdaptiveStates(Object.values(bestStates));

        // Generate AI Summary if enabled
        if (useAI && recentSessions.length > 0) {
          setIsAiLoading(true);
          try {
            const activities = recentSessions.map(r => ({
              gameName: GAME_REGISTRY[r.gameId]?.name || r.gameId,
              accuracy: r.accuracy || 0,
              completed: r.status === 'COMPLETED',
              difficulty: r.difficulty || 'MEDIUM'
            }));

            // Assume local dev backend is at localhost:3000
            // Get session for auth if needed (mocked here or use actual Supabase auth if we have session)
            const token = (await import('../../supabase')).supabase.auth.getSession().then(res => res.data.session?.access_token);
            
            const res = await fetch('http://localhost:3000/api/ai/summarize', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ elderId, recentActivities: activities, aiEnabled: useAI })
            });
            if (res.ok) {
              const data = await res.json();
              setAiSummary({ text: data.summary, provider: data.provider });
            } else {
              setAiSummary({ text: 'AI generation failed. Fallback to local.', provider: 'error' });
            }
          } catch (e) {
            console.error('AI Error', e);
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
  }, [elderId, useAI]);

  if (!elderId) {
    return <div className="text-gray-500">Please select an elder profile.</div>;
  }

  if (loading) {
    return <div className="text-gray-500">Loading personalization data...</div>;
  }

  const getGameName = (id: string) => GAME_REGISTRY[id]?.name || id.replace('-', ' ').toUpperCase();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-800">Recommended Activity</h3>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-600 flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="rounded" />
              Use AI Summaries
            </label>
          </div>
        </div>
        
        {recommendation ? (
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">{getGameName(recommendation.gameId)}</h4>
                <p className="text-gray-600 text-sm">Suggested for today</p>
              </div>
            </div>
            <p className="text-gray-700 mt-4 bg-gray-50 p-4 rounded-lg">
              {recommendation.reason}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">No recommendation available.</p>
        )}
      </div>

      {useAI && (
        <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-100 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-indigo-900">AI Summary</h3>
          </div>
          {isAiLoading ? (
            <p className="text-indigo-600 text-sm">Generating contextual summary...</p>
          ) : aiSummary ? (
            <p className="text-indigo-800">{aiSummary.text}</p>
          ) : (
            <p className="text-indigo-600 text-sm">Insufficient data to generate summary.</p>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Adaptive Progress (Learning State)</h3>
        {adaptiveStates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {adaptiveStates.map(state => (
              <div key={state.id} className="border border-gray-100 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700">{getGameName(state.gameId)}</h4>
                <div className="mt-2 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">Preferred Difficulty:</span> <strong>{state.difficulty}</strong></p>
                  <p className="flex justify-between"><span className="text-gray-500">Experience (Selections):</span> <strong>{state.selectionCount}</strong></p>
                  <p className="flex justify-between"><span className="text-gray-500">Est. Reward (0-1):</span> <strong>{state.meanReward.toFixed(2)}</strong></p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No adaptive learning history yet. The engine is building your baseline.</p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Cognitive Activity Profile</h3>
        <p className="text-sm text-gray-500 mb-6">
          This profile summarizes activity performance and is not a medical assessment.
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
                    <span className="font-semibold text-gray-700">{score.category}</span>
                  </div>
                  
                  {score.confidence === 'NOT_YET_MEASURED' ? (
                    <div className="text-gray-400 text-sm mt-auto">Not yet measured</div>
                  ) : score.confidence === 'INSUFFICIENT_DATA' ? (
                    <div className="text-gray-400 text-sm mt-auto">Insufficient data</div>
                  ) : score.confidence === 'BUILDING_BASELINE' ? (
                    <div className="text-blue-500 text-sm mt-auto">Building baseline...</div>
                  ) : score.reactionMetrics ? (
                    <div className="flex flex-col gap-1 mt-auto">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Reaction Time</span>
                        <span className="font-medium">{(score.reactionMetrics.currentMs / 1000).toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Personal baseline</span>
                        <span className="font-medium">{(score.reactionMetrics.baselineMs / 1000).toFixed(2)} s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Difference</span>
                        <span className={`font-medium ${score.reactionMetrics.differenceMs < 0 ? 'text-green-600' : score.reactionMetrics.differenceMs > 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                          {score.reactionMetrics.differenceMs > 0 ? '+' : ''}{(score.reactionMetrics.differenceMs / 1000).toFixed(2)} s
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Trend: {score.reactionMetrics.trend}</div>
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
          <p className="text-gray-500">No profile data available yet.</p>
        )}
      </div>

      <CognitiveChangeRadar />
    </div>
  );
}
