import { db } from '../db';
import { selectDifficulty } from './personalization/adaptiveEngine';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

const DIFFICULTY_CONFIG = {
  'object-recognition': {
    EASY: { choices: 2 },
    MEDIUM: { choices: 3 },
    HARD: { choices: 4 }
  },
  'recall': {
    EASY: { studyItems: 2, candidateSetSize: 4, studyDurationMs: 8000 },
    MEDIUM: { studyItems: 3, candidateSetSize: 6, studyDurationMs: 6000 },
    HARD: { studyItems: 4, candidateSetSize: 8, studyDurationMs: 5000 }
  },
  'language-exercises': {
    EASY: { choices: 2 },
    MEDIUM: { choices: 3 },
    HARD: { choices: 4 }
  }
};

export async function getRecommendedDifficulty(elderId: string, gameId: string): Promise<DifficultyLevel> {
  try {
    const recentRecords = await db.performanceRecords
      .where('elderId')
      .equals(elderId)
      .filter(r => r.gameId === gameId)
      .reverse()
      .limit(5)
      .toArray();
      
    // Try Phase 6 contextual bandit engine first
    try {
      const decision = await selectDifficulty(elderId, gameId, recentRecords);
      return decision.selectedDifficulty;
    } catch (engineErr) {
      console.warn('Phase 6 Adaptive Engine failed, using P0 fallback', engineErr);
    }
    
    // Fallback: Legacy P0 Heuristic
    if (recentRecords.length === 0) return 'MEDIUM';
    
    const currentDiff: DifficultyLevel = (recentRecords[0].difficulty as DifficultyLevel) || 'MEDIUM';
    
    let totalCorrect = 0;
    let totalErrors = 0;
    recentRecords.forEach((m: any) => {
      totalCorrect += m.correct || 0;
      totalErrors += m.incorrect || 0;
    });

    const errorRate = totalErrors / Math.max(1, totalCorrect + totalErrors);
    
    // Bounded transitions
    if (errorRate <= 0.1 && recentRecords.length >= 2) {
      if (currentDiff === 'EASY') return 'MEDIUM';
      return 'HARD';
    } 
    
    if (errorRate >= 0.4) {
      if (currentDiff === 'HARD') return 'MEDIUM';
      return 'EASY';
    }
    
    return currentDiff;
  } catch (err) {
    console.error('Error fetching difficulty:', err);
    return 'MEDIUM';
  }
}

export function getDifficultyConfig(gameId: 'object-recognition', level: DifficultyLevel): { choices: number };
export function getDifficultyConfig(gameId: 'recall', level: DifficultyLevel): { studyItems: number, candidateSetSize: number, studyDurationMs: number };
export function getDifficultyConfig(gameId: 'language-exercises', level: DifficultyLevel): { choices: number };
export function getDifficultyConfig(gameId: 'object-recognition' | 'recall' | 'language-exercises', level: DifficultyLevel): any {
  return DIFFICULTY_CONFIG[gameId][level];
}
