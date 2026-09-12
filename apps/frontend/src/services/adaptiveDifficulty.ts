import { db } from '../db';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

const DIFFICULTY_CONFIG = {
  'object-recognition': {
    EASY: { choices: 2 },
    MEDIUM: { choices: 3 },
    HARD: { choices: 4 }
  }
};

export async function getRecommendedDifficulty(elderId: string, gameId: string): Promise<DifficultyLevel> {
  // Simple heuristic based on recent performance
  try {
    const recentSessions = await db.sessions
      .where('gameId').equals(gameId)
      .reverse()
      .limit(5)
      .toArray();
      
    // Default if no history
    if (recentSessions.length === 0) return 'MEDIUM';
    
    // In a real ML system, this would evaluate errorRate, avgReactionTimeMs, etc.
    const recentMetrics = recentSessions.map((s: any) => s.metrics).filter(Boolean);
    if (recentMetrics.length === 0) return 'MEDIUM';

    let totalCorrect = 0;
    let totalErrors = 0;
    recentMetrics.forEach((m: any) => {
      totalCorrect += m.correct || 0;
      totalErrors += m.errors || 0;
    });

    const errorRate = totalErrors / Math.max(1, totalCorrect + totalErrors);
    
    if (errorRate < 0.1) return 'HARD';
    if (errorRate > 0.4) return 'EASY';
    return 'MEDIUM';
  } catch (err) {
    console.error('Error fetching difficulty:', err);
    return 'MEDIUM';
  }
}

export function getDifficultyConfig(gameId: 'object-recognition', level: DifficultyLevel) {
  return DIFFICULTY_CONFIG[gameId][level];
}
