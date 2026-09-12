import { db } from '../../db';
import { CognitiveCategory, CognitiveProfile, CognitiveProfileScore } from './types';
import { MIN_BASELINE_SESSIONS } from './baseline';

export async function getCognitiveProfile(elderId: string): Promise<CognitiveProfile> {
  // Try to load existing baselines
  const baselines = await db.cognitiveBaselines.where('elderId').equals(elderId).toArray();
  
  // Also count total sessions per category to determine building status
  const sessions = await db.sessions.where('elderId').equals(elderId).toArray();
  
  const categoryCounts: Record<CognitiveCategory, number> = {
    'Memory': 0,
    'Attention': 0,
    'Language': 0,
    'Reaction': 0,
    'Engagement': sessions.length
  };
  
  sessions.forEach(s => {
    if (s.status === 'COMPLETED') {
      const g = s.gameId;
      if (g === 'object-recognition' || g === 'recall') categoryCounts['Memory']++;
      if (g === 'language-exercises') categoryCounts['Language']++;
      
      const m: any = s.metrics || {};
      if (typeof m.avgReactionTimeMs === 'number' && m.avgReactionTimeMs > 0) {
        categoryCounts['Reaction']++;
      }
    }
  });

  const categories: CognitiveCategory[] = ['Memory', 'Attention', 'Language', 'Reaction', 'Engagement'];
  
  const scores: CognitiveProfileScore[] = categories.map(cat => {
    const baseline = baselines.find(b => b.category === cat);
    const count = categoryCounts[cat] || 0;
    
    let confidence: CognitiveProfileScore['confidence'] = 'INSUFFICIENT_DATA';
    if (count >= MIN_BASELINE_SESSIONS) confidence = 'STABLE_BASELINE';
    else if (count > 0) confidence = 'BUILDING_BASELINE';

    let score = 0;
    if (baseline) {
      if (cat === 'Reaction') {
        // Map reaction time (ms) to a generic 0-100 score where lower time is higher score
        // e.g. 1000ms -> 80, 2000ms -> 60, etc. (Just a UI heuristic, non-clinical)
        score = Math.max(0, Math.min(100, Math.round(100 - (baseline.mean / 50))));
      } else {
        // Accuracy and Engagement are 0-1
        score = Math.round(baseline.mean * 100);
      }
    }

    return {
      category: cat,
      score,
      confidence
    };
  });

  return {
    elderId,
    scores,
    lastUpdatedAt: baselines.length > 0 ? baselines[0].lastUpdatedAt : new Date().toISOString()
  };
}
