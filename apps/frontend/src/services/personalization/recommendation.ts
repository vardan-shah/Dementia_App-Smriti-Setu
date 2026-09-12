import { db } from '../../db';
import { AVAILABLE_GAMES, GAME_REGISTRY } from '../../config/games';

export interface ActivityRecommendation {
  gameId: string;
  reason: string;
  score: number;
}

export async function recommendNextActivity(elderId: string): Promise<ActivityRecommendation> {
  // Use performanceRecords instead of raw sessions
  const records = await db.performanceRecords
    .where('elderId')
    .equals(elderId)
    .reverse()
    .limit(20)
    .toArray();

  if (records.length === 0) {
    return {
      gameId: 'object-recognition',
      reason: 'A great starting point to build your personal baseline.',
      score: 1.0
    };
  }

  // Calculate recency penalty (higher index = played further in the past)
  const lastPlayedIndex = (gameId: string) => {
    const idx = records.findIndex(r => r.gameId === gameId);
    return idx === -1 ? 100 : idx; // 100 max penalty for recency normalization
  };

  const gameStats = AVAILABLE_GAMES.map(game => {
    const gameRecords = records.filter(r => r.gameId === game.id);
    const recency = lastPlayedIndex(game.id);
    
    let recentAccuracy = 0.5; // default neutral
    let attempts = 0;
    
    if (gameRecords.length > 0) {
      const recent = gameRecords.slice(0, 3);
      const accSum = recent.reduce((sum, r) => sum + r.accuracy, 0);
      recentAccuracy = accSum / recent.length;
      attempts = gameRecords.length;
    }

    return {
      gameId: game.id,
      name: game.name,
      recency,
      recentAccuracy,
      attempts
    };
  });

  // Scoring model:
  // diversityScore (0 to 1): Inverse of attempts (more attempts = less diversity score)
  // performanceFit (0 to 1): A curve favoring 60-80% accuracy (flow state).
  // recencyScore (0 to 1): The longer since last played, the higher the score.
  // availabilityScore (0 or 1): Always 1 if in registry.

  const maxAttempts = Math.max(...gameStats.map(g => g.attempts), 1);

  const scoredGames = gameStats.map(g => {
    const diversityScore = 1 - (g.attempts / maxAttempts);
    
    // Performance fit: parabola peaking at 0.7 accuracy
    // 0.7 accuracy -> score 1.0. 0.0 accuracy -> 0.0. 1.0 accuracy -> 0.5 (needs harder game)
    let performanceFit = 1 - Math.pow(g.recentAccuracy - 0.7, 2) * 2; 
    performanceFit = Math.max(0, Math.min(1, performanceFit));
    
    const recencyScore = Math.min(g.recency / 10, 1.0); // maxes out after 10 sessions of not playing
    const availabilityScore = 1.0;

    const totalScore = (diversityScore * 0.2) + (performanceFit * 0.4) + (recencyScore * 0.3) + (availabilityScore * 0.1);

    return { ...g, totalScore, diversityScore, performanceFit, recencyScore };
  });

  scoredGames.sort((a, b) => b.totalScore - a.totalScore);

  const top = scoredGames[0];
  
  let reason = `It's been a while since you played ${top.name}.`;
  if (top.recency === 100) {
    reason = `Let's try a new activity today!`;
  } else if (top.recentAccuracy >= 0.7) {
    reason = `Your recent performance in ${top.name} was strong.`;
  } else if (top.recentAccuracy < 0.3) {
    reason = `Let's practice ${top.name} again to build your skills.`;
  }

  return {
    gameId: top.gameId,
    reason,
    score: top.totalScore
  };
}
