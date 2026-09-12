import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { computeBaselines, getCognitiveProfile, CognitiveProfile, recommendNextActivity, ActivityRecommendation } from '../../services/personalization';
import { GAME_REGISTRY } from '../../config/games';
import { Brain, Activity, BookOpen, Clock, Target } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!elderId) return;
      setLoading(true);
      try {
        await computeBaselines(elderId);
        const [prof, rec] = await Promise.all([
          getCognitiveProfile(elderId),
          recommendNextActivity(elderId)
        ]);
        setProfile(prof);
        setRecommendation(rec);
      } catch (err) {
        console.error('Error loading personalization insights', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [elderId]);

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
        <h3 className="text-xl font-bold text-gray-800 mb-4">Suggested Activity</h3>
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
    </div>
  );
}
