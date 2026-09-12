import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { evaluateChangeSignals } from "../../services/radar";
import type { ChangeSignal } from '../../services/radar';
import { Brain, Activity, BookOpen, Clock, Target, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CATEGORY_ICONS: Record<string, any> = {
  'Memory': Brain,
  'Attention': Target,
  'Language': BookOpen,
  'Reaction': Clock,
  'Engagement': Activity
};

export function CognitiveChangeRadar() {
  const { currentCaregiverElder } = useAuthStore();
  const elderId = currentCaregiverElder?.id;
  const { t } = useTranslation();
  
  const [signals, setSignals] = useState<ChangeSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!elderId) return;
      setLoading(true);
      try {
        const sigs = await evaluateChangeSignals(elderId);
        setSignals(sigs);
      } catch (err) {
        console.error('Error evaluating change signals', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [elderId]);

  if (!elderId) return null;
  if (loading) return <div className="text-gray-500">{t('evaluating_data', 'Evaluating longitudinal data...')}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{t('cognitive_change_radar', 'Cognitive Change Radar')}</h3>
        <p className="text-sm text-gray-500 flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <span>
            {t('change_radar_disclaimer', "This feature summarizes changes in activity performance relative to the individual's personal baseline. It is not a medical assessment or diagnosis.")}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {signals.map(signal => {
          const Icon = CATEGORY_ICONS[signal.category] || Activity;
          const isAttention = signal.category === 'Attention';
          
          let statusColor = 'text-gray-500';
          let statusBg = 'bg-gray-50';
          let StatusIcon = Info;
          
          if (signal.severity === 'PERSISTENT') {
            statusColor = 'text-red-700';
            statusBg = 'bg-red-50';
            StatusIcon = AlertTriangle;
          } else if (signal.severity === 'WATCH') {
            statusColor = 'text-orange-700';
            statusBg = 'bg-orange-50';
            StatusIcon = AlertTriangle;
          } else if (signal.status === 'RESOLVED') {
            statusColor = 'text-green-700';
            statusBg = 'bg-green-50';
            StatusIcon = CheckCircle;
          } else if (signal.direction === 'IMPROVING') {
            statusColor = 'text-blue-700';
            statusBg = 'bg-blue-50';
          }

          if (isAttention || signal.status === 'INSUFFICIENT_DATA') {
            statusColor = 'text-gray-500';
            statusBg = 'bg-gray-50';
            StatusIcon = Info;
          }

          const formatValue = (val: number, metric: string) => {
            if (metric === 'avgReactionTimeMs') return `${(val / 1000).toFixed(2)} s`;
            return `${Math.round(val * 100)}%`;
          };

          return (
            <div key={signal.category} className={`border border-gray-100 rounded-lg p-5 flex flex-col md:flex-row gap-6 ${statusBg}`}>
              <div className="flex items-start gap-4 md:w-1/4">
                <div className={`p-2 rounded-md bg-white shadow-sm ${statusColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{t(signal.category.toLowerCase(), signal.category)}</h4>
                  <div className={`text-sm font-medium flex items-center gap-1 ${statusColor}`}>
                    <StatusIcon className="w-4 h-4" />
                    {isAttention ? t('not_yet_measured', 'Not yet measured') : 
                     signal.status === 'INSUFFICIENT_DATA' ? t('building_baseline', 'Building personal history') : 
                     signal.severity === 'PERSISTENT' ? t('persistent_change', 'Persistent Change') :
                     signal.severity === 'WATCH' ? t('watch', 'Watch') :
                     signal.status === 'RESOLVED' ? t('resolved_stable', 'Resolved / Stable') : t('stable', 'Stable')}
                  </div>
                </div>
              </div>

              <div className="flex-1">
                {(!isAttention && signal.status !== 'INSUFFICIENT_DATA') ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{t('baseline', 'Baseline')}</div>
                      <div className="font-semibold text-gray-900">{formatValue(signal.baselineValue, signal.metric)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{t('recent', 'Recent')}</div>
                      <div className="font-semibold text-gray-900">{formatValue(signal.currentValue, signal.metric)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{t('difference', 'Difference')}</div>
                      <div className="font-semibold text-gray-900">
                        {signal.delta > 0 ? '+' : ''}{formatValue(signal.delta, signal.metric)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{t('trend', 'Trend')}</div>
                      <div className="font-semibold text-gray-900 capitalize">{t(signal.direction.toLowerCase(), signal.direction.toLowerCase())}</div>
                    </div>
                  </div>
                ) : null}
                
                <p className="text-sm text-gray-700 bg-white/60 p-3 rounded border border-white/40">
                  {/* Using standard translations or falling back to English generated explanations */}
                  {t(signal.explanation.toLowerCase().replace(/ /g, '_'), signal.explanation)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
