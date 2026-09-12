import type { PerformanceRecord, CognitiveProfile } from '../personalization/types';
import { GAME_REGISTRY } from '../../config/games';
import { t } from 'i18next';

export function generateCaregiverInsights(
  recentSessions: PerformanceRecord[],
  profile: CognitiveProfile | null
): string {
  if (recentSessions.length === 0) {
    return t('local_insight_none', 'No recent activities to analyze.');
  }

  const completed = recentSessions.filter(r => r.status === 'COMPLETED');
  
  if (completed.length === 0) {
    return t('local_insight_abandoned_all', 'All recent activities were abandoned. The adaptive engine is searching for a more suitable difficulty.');
  }

  // 1. Check for strong/weak specific game performance
  const gameStats: Record<string, { total: number, acc: number }> = {};
  completed.forEach(s => {
    if (!gameStats[s.gameId]) gameStats[s.gameId] = { total: 0, acc: 0 };
    gameStats[s.gameId].total += 1;
    gameStats[s.gameId].acc += (s.accuracy || 0);
  });

  let strongestGame = '';
  let highestAcc = -1;
  let weakestGame = '';
  let lowestAcc = 2;

  Object.entries(gameStats).forEach(([gameId, stats]) => {
    const avg = stats.acc / stats.total;
    if (avg > highestAcc) {
      highestAcc = avg;
      strongestGame = gameId;
    }
    if (avg < lowestAcc) {
      lowestAcc = avg;
      weakestGame = gameId;
    }
  });

  const strongestGameName = GAME_REGISTRY[strongestGame]?.name || strongestGame;
  const weakestGameName = GAME_REGISTRY[weakestGame]?.name || weakestGame;

  if (highestAcc > 0.85) {
    return t('local_insight_strong_game', `Recent {{gameName}} performance is stronger than the personal baseline.`, { gameName: strongestGameName });
  }

  if (lowestAcc < 0.4 && gameStats[weakestGame].total >= 2) {
    return t('local_insight_weak_game', `The system is adapting {{gameName}} difficulty downward to better suit the elder's current baseline.`, { gameName: weakestGameName });
  }

  // 2. Check for missing categories
  if (profile && profile.scores.length > 0) {
    const missing = profile.scores.find(s => s.confidence === 'NOT_YET_MEASURED' && s.category !== 'Attention');
    if (missing) {
      return t('local_insight_missing_category', `{{category}} activities have not been practiced recently.`, { category: missing.category });
    }
    
    // Check reaction time
    const reactionScore = profile.scores.find(s => s.reactionMetrics != null);
    if (reactionScore && reactionScore.reactionMetrics) {
      if (reactionScore.reactionMetrics.trend === 'Declining' && reactionScore.reactionMetrics.differenceMs > 1000) {
        return t('local_insight_reaction_slow', 'Reaction times have been slower than usual across recent sessions.');
      }
    }
  }

  return t('local_insight_default', 'Recent activity shows consistent engagement and stable performance.');
}
