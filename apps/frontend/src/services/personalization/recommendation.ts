import { db } from '../../db';
import { AVAILABLE_GAMES, GAME_REGISTRY } from '../../config/games';

export interface ActivityRecommendation {
  gameId: string;
  reason: string;
  score: number;
}

// Weights defined by Phase 6 architecture
const WEIGHTS = {
  diversity: 0.25,
  performanceFit: 0.25,
  engagementFit: 0.20,
  baselineOpportunity: 0.15,
  culturalFit: 0.10,
  novelty: 0.05
};

export async function recommendNextActivity(elderId: string): Promise<ActivityRecommendation> {
  const records = await db.performanceRecords
    .where('elderId')
    .equals(elderId)
    .reverse()
    .limit(20)
    .toArray();

  if (records.length === 0) {
    return {
      gameId: 'object-recognition',
      reason: 'A great starting point to build your personal learning history.',
      score: 1.0
    };
  }

  const lastPlayedIndex = (gameId: string) => {
    const idx = records.findIndex(r => r.gameId === gameId);
    return idx === -1 ? 100 : idx; 
  };

  const gameStats = AVAILABLE_GAMES.map(game => {
    const gameRecords = records.filter(r => r.gameId === game.id);
    const recency = lastPlayedIndex(game.id);
    
    let recentAccuracy = 0.5;
    let completionRate = 1.0;
    let attempts = gameRecords.length;
    
    if (attempts > 0) {
      const recent = gameRecords.slice(0, 5);
      const accSum = recent.reduce((sum, r) => sum + r.accuracy, 0);
      recentAccuracy = accSum / recent.length;
      
      const completed = recent.filter(r => r.status === 'COMPLETED').length;
      completionRate = completed / recent.length;
    }

    return {
      gameId: game.id,
      name: game.name,
      recency,
      recentAccuracy,
      completionRate,
      attempts
    };
  });

  const maxAttempts = Math.max(...gameStats.map(g => g.attempts), 1);

  const scoredGames = gameStats.map(g => {
    // 0.25 * diversity (how rarely played relatively)
    const diversityScore = 1 - (g.attempts / maxAttempts);
    
    // 0.25 * performanceFit (favors 60-80% flow state)
    let performanceFit = 1 - Math.pow(g.recentAccuracy - 0.7, 2) * 2; 
    performanceFit = Math.max(0, Math.min(1, performanceFit));
    
    // 0.20 * engagementFit (high completion rate = high engagement)
    const engagementFit = g.completionRate;
    
    // 0.15 * baselineOpportunity (the longer since played, the better the opportunity to measure)
    const baselineOpportunity = Math.min(g.recency / 10, 1.0);
    
    // 0.10 * culturalFit (always 1 for culturally localized games in registry)
    const culturalFit = 1.0;
    
    // 0.05 * novelty (completely unplayed gets full points)
    const novelty = g.attempts === 0 ? 1.0 : 0.0;

    const totalScore = 
      (diversityScore * WEIGHTS.diversity) + 
      (performanceFit * WEIGHTS.performanceFit) + 
      (engagementFit * WEIGHTS.engagementFit) + 
      (baselineOpportunity * WEIGHTS.baselineOpportunity) + 
      (culturalFit * WEIGHTS.culturalFit) +
      (novelty * WEIGHTS.novelty);

    return { ...g, totalScore, diversityScore, performanceFit, engagementFit, baselineOpportunity };
  });

  scoredGames.sort((a, b) => b.totalScore - a.totalScore);

  const top = scoredGames[0];
  
  // Phase 6 Explainability Generation
  let reason = '';
  if (top.attempts === 0) {
    reason = `${top.name} was selected as a novel activity to establish your learning baseline.`;
  } else if (top.baselineOpportunity > 0.8) {
    reason = `${top.name} was selected because it hasn't been practiced recently, providing a good opportunity to update your learning state.`;
  } else if (top.performanceFit > 0.7) {
    reason = `${top.name} was selected because your recent performance shows strong engagement and optimal challenge.`;
  } else if (top.engagementFit < 0.5) {
    reason = `${top.name} was selected to re-engage with foundational memory exercises.`;
  } else {
    reason = `${top.name} was selected to balance diversity in your daily memory activity plan.`;
  }

  return {
    gameId: top.gameId,
    reason,
    score: top.totalScore
  };
}
