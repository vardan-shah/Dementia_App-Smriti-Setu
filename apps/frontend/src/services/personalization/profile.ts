import { db } from '../../db';
import { CognitiveCategory, CognitiveProfile, CognitiveProfileScore } from './types';
import { MIN_BASELINE_SESSIONS } from './baseline';

export async function getCognitiveProfile(elderId: string): Promise<CognitiveProfile> {
  const baselines = await db.cognitiveBaselines.where('elderId').equals(elderId).toArray();
  const records = await db.performanceRecords.where('elderId').equals(elderId).toArray();
  
  const categoryCounts: Record<CognitiveCategory, number> = {
    'Memory': 0,
    'Attention': 0,
    'Language': 0,
    'Reaction': 0,
    'Engagement': records.length
  };
  
  records.forEach(r => {
    if (r.status === 'COMPLETED') {
      const g = r.gameId;
      if (g === 'object-recognition' || g === 'recall') categoryCounts['Memory']++;
      if (g === 'language-exercises') categoryCounts['Language']++;
      if (r.avgReactionTimeMs > 0) categoryCounts['Reaction']++;
    }
  });

  const categories: CognitiveCategory[] = ['Memory', 'Attention', 'Language', 'Reaction', 'Engagement'];
  
  const scores: CognitiveProfileScore[] = categories.map(cat => {
    if (cat === 'Attention') {
      return { category: cat, confidence: 'NOT_YET_MEASURED' };
    }

    const baseline = baselines.find(b => b.category === cat);
    const count = categoryCounts[cat] || 0;
    
    let confidence: CognitiveProfileScore['confidence'] = 'INSUFFICIENT_DATA';
    if (count >= MIN_BASELINE_SESSIONS) confidence = 'STABLE_BASELINE';
    else if (count > 0) confidence = 'BUILDING_BASELINE';

    if (!baseline) {
      return { category: cat, confidence };
    }

    if (cat === 'Reaction') {
      // Find the most recent reaction time to compute the difference
      const reactionRecords = records.filter(r => r.status === 'COMPLETED' && r.avgReactionTimeMs > 0).sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
      
      const currentMs = reactionRecords.length > 0 ? reactionRecords[0].avgReactionTimeMs : baseline.mean;
      const differenceMs = currentMs - baseline.mean;
      
      let trend: 'Improving' | 'Stable' | 'Declining' = 'Stable';
      if (differenceMs < -200) trend = 'Improving'; // Faster
      else if (differenceMs > 200) trend = 'Declining'; // Slower

      return {
        category: cat,
        confidence,
        reactionMetrics: {
          currentMs,
          baselineMs: baseline.mean,
          differenceMs,
          trend
        }
      };
    } else {
      // Accuracy and Engagement are 0-1 mapped to 0-100
      return {
        category: cat,
        confidence,
        score: Math.round(baseline.mean * 100)
      };
    }
  });

  return {
    elderId,
    scores,
    lastUpdatedAt: baselines.length > 0 ? baselines[0].lastUpdatedAt : new Date().toISOString()
  };
}
